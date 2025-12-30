/**
 * 消息类型判断工具 (按照 C端WS文档V3.md)
 */

// ============ 本地消息类型 (旧格式兼容) ============
// 是否普通消息 (0-9)
let isNormal = function (type) {
	return type >= 0 && type < 10;
}

// 是否状态消息 (10-19)
let isStatus = function (type) {
	return type >= 10 && type < 20;
}

// 是否提示消息 (20-29)
let isTip = function (type) {
	return type >= 20 && type < 30;
}

// 操作交互类消息 (40-49)
let isAction = function (type) {
	return type >= 40 && type < 50;
}

// 单人通话信令 (100-199)
let isRtcPrivate = function (type) {
	return type >= 100 && type < 200;
}

// 多人通话信令 (200-299)
let isRtcGroup = function (type) {
	return type >= 200 && type < 300;
}

// ============ V3 协议消息类型判断 ============

// 是否文本类消息 (contentType: 101, 106, 114)
let isTextContent = function (contentType) {
	return contentType === 101 || contentType === 106 || contentType === 114;
}

// 是否媒体消息 (contentType: 102-105)
let isMediaContent = function (contentType) {
	return contentType >= 102 && contentType <= 105;
}

// 是否通知消息 (contentType: 2101, 2102, 2200)
let isNotificationContent = function (contentType) {
	return contentType === 2101 || contentType === 2102 || contentType === 2200;
}

// 是否撤回通知
let isRevokeNotification = function (contentType) {
	return contentType === 2101;
}

// 是否已读回执
let isReadReceipt = function (contentType) {
	return contentType === 2200;
}

// ============ 消息状态判断 (V3新增) ============

// 消息是否应该显示
let shouldShowMessage = function (status) {
	// 只有发送中(1)和发送成功(2)的消息应该显示
	return status === 1 || status === 2;
}

// 消息是否发送失败
let isSendFailed = function (status) {
	return status === 3;
}

// 消息是否已删除
let isDeleted = function (status) {
	return status === 4;
}

export {
	isNormal,
	isStatus,
	isTip,
	isAction,
	isRtcPrivate,
	isRtcGroup,
	// V3 新增
	isTextContent,
	isMediaContent,
	isNotificationContent,
	isRevokeNotification,
	isReadReceipt,
	shouldShowMessage,
	isSendFailed,
	isDeleted
}