<template>
	<el-upload :action="'#'" :http-request="onFileUpload" :accept="fileTypes == null ? '' : fileTypes.join(',')"
		:show-file-list="false" :disabled="disabled" :before-upload="beforeUpload" :multiple="multiple">
		<slot></slot>
	</el-upload>
</template>

<script>
import { upload, uploadImage, uploadAvatar, uploadVideo, uploadFile } from '@/api/upload.js';

export default {
	name: "fileUpload",
	data() {
		return {
			loading: null,
			uploadProgress: 0
		}
	},
	props: {
		// 上传类型: image, avatar, video, file, chat
		uploadType: {
			type: String,
			default: 'chat'
		},
		// 允许的文件类型
		fileTypes: {
			type: Array,
			default: null
		},
		// 最大文件大小（字节）
		maxSize: {
			type: Number,
			default: null
		},
		// 是否显示加载动画
		showLoading: {
			type: Boolean,
			default: false
		},
		// 是否禁用
		disabled: {
			type: Boolean,
			default: false
		},
		// 是否支持多选
		multiple: {
			type: Boolean,
			default: true
		}
	},
	methods: {
		async onFileUpload(uploadInfo) {
			const file = uploadInfo.file;

			// 展示加载条
			if (this.showLoading) {
				this.loading = this.$loading({
					lock: true,
					text: '正在上传 0%',
					spinner: 'el-icon-loading',
					background: 'rgba(0, 0, 0, 0.7)'
				});
			}

			try {
				// 根据上传类型选择对应的上传方法
				let uploadFn;
				switch (this.uploadType) {
					case 'image':
						uploadFn = uploadImage;
						break;
					case 'avatar':
						uploadFn = uploadAvatar;
						break;
					case 'video':
						uploadFn = uploadVideo;
						break;
					case 'file':
						uploadFn = uploadFile;
						break;
					default:
						uploadFn = upload;
				}

				// 获取当前用户ID
				const userId = this.userStore.userInfo?.id;
				if (!userId) {
					throw new Error('用户未登录');
				}

				// 执行上传
				const url = await uploadFn(file, {
					userId: String(userId),
					group: this.uploadType,
					onProgress: (progress) => {
						this.uploadProgress = progress;
						if (this.loading) {
							this.loading.text = `正在上传 ${progress}%`;
						}
						this.$emit('progress', progress, file);
					},
					onHashProgress: (progress) => {
						if (this.loading) {
							this.loading.text = `正在计算文件校验 ${progress}%`;
						}
					}
				});

				// 上传成功
				const result = {
					url: url,
					name: file.name,
					size: file.size,
					type: file.type
				};
				this.$emit('success', result, file);

			} catch (error) {
				console.error('[FileUpload] 上传失败:', error);
				this.$message.error(error.message || '上传失败');
				this.$emit('fail', error, file);
			} finally {
				if (this.loading) {
					this.loading.close();
					this.loading = null;
				}
				this.uploadProgress = 0;
			}
		},
		beforeUpload(file) {
			// 校验文件类型
			if (this.fileTypes && this.fileTypes.length > 0) {
				const fileType = file.type.toLowerCase();
				const fileName = file.name.toLowerCase();
				const isValidType = this.fileTypes.some(t => {
					const type = t.toLowerCase();
					// 支持 MIME 类型匹配
					if (type.includes('/')) {
						return fileType === type || fileType.startsWith(type.replace('*', ''));
					}
					// 支持扩展名匹配
					return fileName.endsWith(type.replace('.', ''));
				});

				if (!isValidType) {
					this.$message.error(`文件格式错误，请上传以下格式的文件：${this.fileTypes.join('、')}`);
					return false;
				}
			}

			// 校验文件大小
			if (this.maxSize && file.size > this.maxSize) {
				this.$message.error(`文件大小不能超过 ${this.fileSizeStr}!`);
				return false;
			}

			this.$emit('before', file);
			return true;
		}
	},
	computed: {
		fileSizeStr() {
			if (!this.maxSize) return '';
			if (this.maxSize >= 1024 * 1024 * 1024) {
				return Math.round(this.maxSize / 1024 / 1024 / 1024) + 'GB';
			}
			if (this.maxSize >= 1024 * 1024) {
				return Math.round(this.maxSize / 1024 / 1024) + 'MB';
			}
			if (this.maxSize >= 1024) {
				return Math.round(this.maxSize / 1024) + 'KB';
			}
			return this.maxSize + 'B';
		}
	}
}
</script>

<style></style>
