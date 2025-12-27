import http from './httpRequest.js';
import SparkMD5 from 'spark-md5';

/**
 * 文件上传工具类
 * 支持表单上传（小文件）和分片上传（大文件）
 */

// 小文件阈值：100MB 以下使用表单上传
const SMALL_FILE_THRESHOLD = 100 * 1024 * 1024;

/**
 * 生成操作ID
 */
function generateOperationID() {
	return 'upload-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * 计算文件 MD5 哈希值
 * @param {File} file - 文件对象
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} MD5 哈希值
 */
function calculateMD5(file, onProgress) {
	return new Promise((resolve, reject) => {
		const chunkSize = 2 * 1024 * 1024; // 2MB 分块计算
		const chunks = Math.ceil(file.size / chunkSize);
		let currentChunk = 0;
		const spark = new SparkMD5.ArrayBuffer();
		const reader = new FileReader();

		reader.onload = (e) => {
			spark.append(e.target.result);
			currentChunk++;

			if (onProgress) {
				onProgress(Math.round((currentChunk / chunks) * 100));
			}

			if (currentChunk < chunks) {
				loadNext();
			} else {
				resolve(spark.end());
			}
		};

		reader.onerror = () => {
			reject(new Error('文件读取失败'));
		};

		function loadNext() {
			const start = currentChunk * chunkSize;
			const end = Math.min(start + chunkSize, file.size);
			reader.readAsArrayBuffer(file.slice(start, end));
		}

		loadNext();
	});
}

/**
 * 表单上传（适用于小文件）
 * @param {File} file - 文件对象
 * @param {Object} options - 配置选项
 * @param {string} options.userId - 用户ID
 * @param {string} options.group - 分组标识（如: chat, avatar）
 * @param {Function} options.onProgress - 进度回调
 * @returns {Promise<string>} 文件访问 URL
 */
async function uploadByForm(file, options = {}) {
	const { userId, group = 'chat', onProgress } = options;

	// 1. 初始化表单上传
	const initResp = await http({
		url: '/object/initiate_form_data',
		method: 'POST',
		data: {
			name: `${userId}/${group}/${file.name}`,
			size: file.size,
			contentType: file.type || 'application/octet-stream',
			group: group
		}
	});

	const { id, url, file: fileField, formData, successCodes } = initResp;

	// 2. 构建表单数据并上传到 S3
	const uploadFormData = new FormData();
	// 按顺序添加表单字段
	for (const [key, value] of Object.entries(formData)) {
		uploadFormData.append(key, value);
	}
	// 最后添加文件
	uploadFormData.append(fileField, file, file.name);

	// 使用 XMLHttpRequest 以支持上传进度
	const uploadResp = await new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable && onProgress) {
				onProgress(Math.round((e.loaded / e.total) * 100));
			}
		};

		xhr.onload = () => {
			if (successCodes.includes(xhr.status)) {
				resolve({ status: xhr.status });
			} else {
				reject(new Error(`上传失败: ${xhr.status}`));
			}
		};

		xhr.onerror = () => {
			reject(new Error('网络错误'));
		};

		xhr.open('POST', url);
		xhr.send(uploadFormData);
	});

	// 3. 完成上传
	const completeResp = await http({
		url: '/object/complete_form_data',
		method: 'POST',
		data: { id }
	});

	return completeResp.url;
}

/**
 * 分片上传（适用于大文件）
 * @param {File} file - 文件对象
 * @param {Object} options - 配置选项
 * @param {string} options.userId - 用户ID
 * @param {string} options.group - 分组标识
 * @param {Function} options.onProgress - 进度回调
 * @param {Function} options.onHashProgress - MD5 计算进度回调
 * @returns {Promise<string>} 文件访问 URL
 */
async function uploadByMultipart(file, options = {}) {
	const { userId, group = 'chat', onProgress, onHashProgress } = options;

	// 1. 计算文件 MD5
	const hash = await calculateMD5(file, onHashProgress);

	// 2. 获取推荐分片大小
	const partSizeResp = await http({
		url: '/object/part_size',
		method: 'POST',
		data: { size: file.size }
	});
	const partSize = partSizeResp.size;

	// 3. 计算分片数量
	const totalParts = Math.ceil(file.size / partSize);

	// 4. 初始化分片上传
	const initResp = await http({
		url: '/object/initiate_multipart_upload',
		method: 'POST',
		data: {
			hash: hash,
			size: file.size,
			maxParts: totalParts,
			name: `${userId}/${group}/${file.name}`,
			contentType: file.type || 'application/octet-stream',
			cause: group
		}
	});

	// 秒传成功
	if (initResp.url) {
		if (onProgress) onProgress(100);
		return initResp.url;
	}

	const { uploadID, sign } = initResp.upload;

	// 5. 上传各分片
	const etags = [];
	for (let i = 0; i < totalParts; i++) {
		const start = i * partSize;
		const end = Math.min(start + partSize, file.size);
		const chunk = file.slice(start, end);

		// 获取分片签名信息
		let partInfo = sign.parts[i];

		// 如果签名信息不存在，需要单独获取
		if (!partInfo) {
			const signResp = await http({
				url: '/object/auth_sign',
				method: 'POST',
				data: {
					uploadID: uploadID,
					partNumbers: [i + 1]
				}
			});
			partInfo = signResp.parts[0];
		}

		// 上传分片
		const uploadResp = await fetch(partInfo.url, {
			method: 'PUT',
			headers: partInfo.header || {},
			body: chunk
		});

		if (!uploadResp.ok) {
			throw new Error(`分片 ${i + 1} 上传失败: ${uploadResp.status}`);
		}

		const etag = uploadResp.headers.get('ETag');
		etags.push(etag ? etag.replace(/"/g, '') : '');

		// 更新进度
		if (onProgress) {
			onProgress(Math.round(((i + 1) / totalParts) * 100));
		}
	}

	// 6. 完成上传
	const completeResp = await http({
		url: '/object/complete_multipart_upload',
		method: 'POST',
		data: {
			uploadID: uploadID,
			parts: etags,
			name: `${userId}/${group}/${file.name}`,
			contentType: file.type || 'application/octet-stream',
			cause: group
		}
	});

	return completeResp.url;
}

/**
 * 统一上传入口
 * 根据文件大小自动选择上传方式
 * @param {File} file - 文件对象
 * @param {Object} options - 配置选项
 * @param {string} options.userId - 用户ID（必填）
 * @param {string} options.group - 分组标识（如: chat, avatar, file）
 * @param {Function} options.onProgress - 上传进度回调 (0-100)
 * @param {Function} options.onHashProgress - MD5 计算进度回调（仅大文件）
 * @returns {Promise<string>} 文件访问 URL
 */
async function upload(file, options = {}) {
	if (!file) {
		throw new Error('文件不能为空');
	}

	// 根据文件大小选择上传方式
	if (file.size <= SMALL_FILE_THRESHOLD) {
		return uploadByForm(file, options);
	} else {
		return uploadByMultipart(file, options);
	}
}

/**
 * 上传图片
 * @param {File} file - 图片文件
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} 图片访问 URL
 */
async function uploadImage(file, options = {}) {
	return upload(file, { group: 'image', ...options });
}

/**
 * 上传头像
 * @param {File} file - 头像文件
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} 头像访问 URL
 */
async function uploadAvatar(file, options = {}) {
	return upload(file, { group: 'avatar', ...options });
}

/**
 * 上传视频
 * @param {File} file - 视频文件
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} 视频访问 URL
 */
async function uploadVideo(file, options = {}) {
	return upload(file, { group: 'video', ...options });
}

/**
 * 上传文件（通用）
 * @param {File} file - 文件对象
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} 文件访问 URL
 */
async function uploadFile(file, options = {}) {
	return upload(file, { group: 'file', ...options });
}

/**
 * 获取文件访问 URL
 * @param {string} name - 文件名（含路径）
 * @param {Object} query - 查询参数（图片处理等）
 * @returns {Promise<Object>} { url, expireTime }
 */
async function getAccessUrl(name, query = {}) {
	const resp = await http({
		url: '/object/access_url',
		method: 'POST',
		data: { name, query }
	});
	return resp;
}

export {
	upload,
	uploadImage,
	uploadAvatar,
	uploadVideo,
	uploadFile,
	uploadByForm,
	uploadByMultipart,
	calculateMD5,
	getAccessUrl
};

export default upload;
