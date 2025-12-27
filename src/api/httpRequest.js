import axios from 'axios'

import { Message } from 'element-ui'

// 生成唯一操作ID
function generateOperationID() {
	return 'web-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

const http = axios.create({
	baseURL: process.env.VUE_APP_BASE_API,
	timeout: 1000 * 30,
	withCredentials: true
})

/**
 * 请求拦截
 */
http.interceptors.request.use(config => {
	// 添加 X-Tenant-ID header
	config.headers['X-Tenant-ID'] = '1000';

	// 添加 operationID header
	config.headers.operationID = generateOperationID();

	// 添加 token header
	let token = sessionStorage.getItem("token");
	if (token) {
		config.headers.token = token;
	}

	// 添加 userID header（部分接口需要）
	let userID = sessionStorage.getItem("userID");
	if (userID) {
		config.headers.userID = userID;
	}

	return config
}, error => {
	return Promise.reject(error)
})

/**
 * 响应拦截
 * 新API响应格式: { errCode: 0, errMsg: "", errDlt: "", data: {...} }
 */
http.interceptors.response.use(async response => {
	const res = response.data;

	// 新API格式：errCode = 0 表示成功
	if (res.errCode === 0) {
		return res.data || res;
	}

	// 兼容旧API格式：code = 200 表示成功
	if (res.code === 200) {
		return res.data;
	}

	// token失效处理 - 只检查 code 401
	if (res.code === 401) {
		console.error("token失效，需要重新登录", "请求URL:", response.config.url);
		sessionStorage.removeItem("token");
		sessionStorage.removeItem("userID");
		location.href = "/";
		return Promise.reject(res);
	}

	// 权限不足处理 - errCode 1002 是 NoPermissionError，不应清除 token
	if (res.errCode === 1002) {
		Message({
			message: res.errMsg || '权限不足',
			type: 'error',
			duration: 1500,
			customClass: 'element-error-message-zindex'
		});
		return Promise.reject(res);
	}

	// 错误提示
	let errMsg = res.errMsg || res.message || '请求失败';
	// 处理 MongoDB 重复键错误，显示友好提示
	if (res.errCode === 500 && errMsg.includes('duplicate key')) {
		errMsg = '记录已存在，请勿重复操作';
	}
	Message({
		message: errMsg,
		type: 'error',
		duration: 1500,
		customClass: 'element-error-message-zindex'
	})
	return Promise.reject(res)
}, error => {
	const status = error.response?.status;
	switch (status) {
		case 400:
			Message({
				message: error.response.data?.errMsg || error.response.data || '请求参数错误',
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
			break
		case 401:
			console.error("HTTP 401 未授权", "请求URL:", error.config?.url);
			sessionStorage.removeItem("token");
			sessionStorage.removeItem("userID");
			location.href = "/";
			break
		case 405:
			Message({
				message: 'http请求方式有误',
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
			break
		case 404:
		case 500:
			Message({
				message: '服务器出了点小差，请稍后再试',
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
			break
		case 501:
			Message({
				message: '服务器不支持当前请求所需要的某个功能',
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
			break
		default:
			Message({
				message: '网络错误，请检查网络连接',
				type: 'error',
				duration: 1500,
				customClass: 'element-error-message-zindex'
			})
	}

	return Promise.reject(error)
})


export default http
