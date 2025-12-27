import protobuf from 'protobufjs';

// ============ Protobuf Schema 定义 (按照 C端WS文档V2.md) ============
const protoSchema = `
syntax = "proto3";

message MsgData {
  string sendID = 1;
  string recvID = 2;
  string groupID = 3;
  string clientMsgID = 4;
  string serverMsgID = 5;
  int32 senderPlatformID = 6;
  string senderNickname = 7;
  string senderFaceURL = 8;
  int32 sessionType = 9;
  int32 msgFrom = 10;
  int32 contentType = 11;
  bytes content = 12;
  // 字段 13 保留未使用
  int64 seq = 14;
  int64 sendTime = 15;
  int64 createTime = 16;
  int32 status = 17;
  bool isRead = 18;
  map<string, bool> options = 19;
  OfflinePushInfo offlinePushInfo = 20;
  repeated string atUserIDList = 21;
  string attachedInfo = 22;
  string ex = 23;
}

message OfflinePushInfo {
  string title = 1;
  string desc = 2;
  string ex = 3;
  string iOSPushSound = 4;
  bool iOSBadgeCount = 5;
  string signalInfo = 6;
}

message SendMsgResp {
  string serverMsgID = 1;
  string clientMsgID = 2;
  int64 sendTime = 3;
  int64 seq = 4;
}

message GetMaxSeqReq {
  string userID = 1;
}

message GetMaxSeqResp {
  map<string, int64> maxSeqs = 1;
  map<string, int64> minSeqs = 2;
}

message PushMessages {
  map<string, PullMsgs> msgs = 1;
  map<string, PullMsgs> notificationMsgs = 2;
}

message PullMsgs {
  repeated MsgData Msgs = 1;
  bool isEnd = 2;
}

message SeqRange {
  string conversationID = 1;
  int64 begin = 2;
  int64 end = 3;
  int64 num = 4;
}

message PullMessageBySeqsReq {
  string userID = 1;
  repeated SeqRange seqRanges = 2;
  int32 order = 3;
}

message PullMessageBySeqsResp {
  map<string, PullMsgs> msgs = 1;
  map<string, PullMsgs> notificationMsgs = 2;
}

message NotificationElem {
  string detail = 1;
}

message RevokeMsgTips {
  string revokerUserID = 1;
  string clientMsgID = 2;
  int64 revokeTime = 3;
  int32 sesstionType = 5;
  int64 seq = 6;
  string conversationID = 7;
  bool isAdminRevoke = 8;
}

message GetConvMaxReadSeqResp {
  map<string, int64> maxReadSeqs = 1;
}
`;

// ============ 协议标识符 ============
const ReqIdentifier = {
  WSGetNewestSeq: 1001,
  WSPullMsgBySeqList: 1002,
  WSSendMsg: 1003,
  WSSendSignalMsg: 1004,
  WSPullMsg: 1005,
  WSGetConvMaxReadSeq: 1006,
  WSPushMsg: 2001,
  WSKickOnlineMsg: 2002,
  WsLogoutMsg: 2003
};

// ============ 内容类型映射 ============
const ContentType = {
  Text: 101,
  Picture: 102,
  Sound: 103,
  Video: 104,
  File: 105,
  AtText: 106,
  Merger: 107,
  Card: 108,
  Location: 109,
  Custom: 110,
  Revoke: 111,
  Quote: 114
};

// ============ 会话类型 ============
const SessionType = {
  Single: 1,
  Group: 2,
  SuperGroup: 3,  // 群聊统一使用超级群
  Notification: 4
};

// ============ WebSocket 客户端 ============
let websock = null;
let isConnect = false;
let protoTypes = {};
let msgIncr = 0;
let callbacks = new Map();
let heartbeatTimer = null;
let token = null;
let userID = null;
let wsUrl = null;

// 回调函数
let connectCallBack = null;
let messageCallBack = null;
let closeCallBack = null;

// 初始化 Protobuf
async function initProtobuf() {
  try {
    const root = protobuf.parse(protoSchema).root;
    protoTypes = {
      MsgData: root.lookupType("MsgData"),
      SendMsgResp: root.lookupType("SendMsgResp"),
      GetMaxSeqReq: root.lookupType("GetMaxSeqReq"),
      GetMaxSeqResp: root.lookupType("GetMaxSeqResp"),
      PushMessages: root.lookupType("PushMessages"),
      PullMsgs: root.lookupType("PullMsgs"),
      PullMessageBySeqsReq: root.lookupType("PullMessageBySeqsReq"),
      PullMessageBySeqsResp: root.lookupType("PullMessageBySeqsResp"),
      SeqRange: root.lookupType("SeqRange"),
      GetConvMaxReadSeqResp: root.lookupType("GetConvMaxReadSeqResp")
    };
    console.log('[WS] Protobuf 初始化成功');
    return true;
  } catch (e) {
    console.error('[WS] Protobuf 初始化失败:', e);
    return false;
  }
}

// 生成 UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Base64 解码为 Uint8Array
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// 构建 WebSocket URL
function buildWsUrl(wsurl, tkn, uid) {
  const url = new URL(wsurl);
  url.searchParams.set('sendID', uid);
  url.searchParams.set('platformID', '5');
  url.searchParams.set('token', tkn);
  url.searchParams.set('sdkType', 'js');
  return url.toString();
}

// 连接 WebSocket
let connect = async (wsurl, tkn, uid) => {
  if (isConnect) {
    return;
  }
  if (!tkn || !uid) {
    console.error("[WS] 连接失败：缺少 token 或 userID");
    return;
  }

  // 保存连接参数
  token = tkn;
  userID = uid;
  wsUrl = wsurl;

  // 初始化 Protobuf
  await initProtobuf();

  const fullUrl = buildWsUrl(wsurl, tkn, uid);
  console.log("[WS] 连接:", fullUrl.replace(/token=[^&]+/, 'token=***'));

  websock = new WebSocket(fullUrl);
  websock.binaryType = 'arraybuffer';

  websock.onopen = () => {
    console.log("[WS] 连接成功");
    isConnect = true;
    startHeartbeat();
    connectCallBack && connectCallBack();
  };

  websock.onmessage = (e) => {
    handleMessage(e.data);
  };

  websock.onclose = (e) => {
    console.log('[WS] 连接关闭', e.code, e.reason);
    isConnect = false;
    stopHeartbeat();
    closeCallBack && closeCallBack(e);
  };

  websock.onerror = (e) => {
    console.error('[WS] 连接错误:', e);
    isConnect = false;
    stopHeartbeat();
  };
};

// 处理收到的消息
function handleMessage(data) {
  let message;
  try {
    if (data instanceof ArrayBuffer) {
      message = JSON.parse(new TextDecoder().decode(data));
    } else {
      message = JSON.parse(data);
    }
  } catch (e) {
    console.error('[WS] 消息解析失败:', e);
    return;
  }

  // 处理心跳响应
  if (message.type === 'pong') {
    console.log('[WS] 收到心跳响应');
    return;
  }

  console.log('[WS] 收到消息:', message.reqIdentifier, message.errCode);

  // 处理响应回调
  const msgIncrKey = String(message.msgIncr || '');
  if (msgIncrKey && callbacks.has(msgIncrKey)) {
    const callback = callbacks.get(msgIncrKey);
    callbacks.delete(msgIncrKey);

    if (message.data && message.errCode === 0) {
      message.decodedData = decodeResponseData(message.reqIdentifier, message.data);
    }
    callback(message);
  }

  // 处理服务端推送消息 (2001)
  if (message.reqIdentifier === ReqIdentifier.WSPushMsg) {
    handlePushMessage(message);
  }

  // 处理踢下线通知 (2002)
  if (message.reqIdentifier === ReqIdentifier.WSKickOnlineMsg) {
    console.warn('[WS] 收到踢下线通知');
    // 转换为旧格式，兼容 Home.vue 处理
    messageCallBack && messageCallBack(2, { reason: 'kicked' });
  }

  // 处理登出通知 (2003)
  if (message.reqIdentifier === ReqIdentifier.WsLogoutMsg) {
    console.log('[WS] 收到登出通知');
    close(1000);
  }
}

// 解码响应 data 字段
function decodeResponseData(reqIdentifier, base64Data) {
  try {
    const bytes = base64ToUint8Array(base64Data);
    console.log(reqIdentifier, "reqIdentifier");

    switch (reqIdentifier) {
      case ReqIdentifier.WSGetNewestSeq:
        return protoTypes.GetMaxSeqResp.decode(bytes);
      case ReqIdentifier.WSSendMsg:
        return protoTypes.SendMsgResp.decode(bytes);
      case ReqIdentifier.WSPushMsg:
        return protoTypes.PushMessages.decode(bytes);
      case ReqIdentifier.WSPullMsgBySeqList:
        return protoTypes.PullMessageBySeqsResp.decode(bytes);
      case ReqIdentifier.WSGetConvMaxReadSeq:
        return protoTypes.GetConvMaxReadSeqResp.decode(bytes);
      default:
        return bytes;
    }
  } catch (e) {
    console.error('[WS] 解码响应数据失败:', e);
    return null;
  }
}

// 处理推送消息
function handlePushMessage(message) {
  if (!message.data) return;

  try {
    const bytes = base64ToUint8Array(message.data);
    console.log('[WS] 推送消息原始数据:', message.data);
    console.log('[WS] 推送消息字节长度:', bytes.length);
    const pushMessages = protoTypes.PushMessages.decode(bytes);
    console.log('[WS] 推送消息解析成功:', pushMessages);

    // 处理普通消息
    if (pushMessages.msgs) {
      for (const [conversationID, pullMsgs] of Object.entries(pushMessages.msgs)) {
        for (const msg of pullMsgs.Msgs || []) {
          const parsedMsg = parseMsgData(msg, conversationID);

          if (parsedMsg) {
            // 根据会话类型分发消息
            if (parsedMsg.sessionType === SessionType.Single) {
              messageCallBack && messageCallBack(3, parsedMsg); // 3 = 私聊消息
            } else if (parsedMsg.sessionType === SessionType.Group || parsedMsg.sessionType === SessionType.SuperGroup) {
              messageCallBack && messageCallBack(4, parsedMsg); // 4 = 群聊消息
            }
          }
        }
      }
    }

    // 处理通知消息
    if (pushMessages.notificationMsgs) {
      for (const [conversationID, pullMsgs] of Object.entries(pushMessages.notificationMsgs)) {
        for (const msg of pullMsgs.Msgs || []) {
          const parsedMsg = parseMsgData(msg, conversationID);
          if (parsedMsg) {
            messageCallBack && messageCallBack(5, parsedMsg); // 5 = 系统消息
          }
        }
      }
    }
  } catch (e) {
    console.error('[WS] 解析推送消息失败:', e);
  }
}

// 将 Long 类型转换为数字
function longToNumber(value) {
  if (!value) return 0;
  // protobuf.js Long 类型
  if (typeof value === 'object' && value.toNumber) {
    return value.toNumber();
  }
  // 普通数字或字符串
  return Number(value) || 0;
}

// 转换服务器消息内容格式为本地格式
function convertMessageContent(contentType, content) {
  if (typeof content !== 'object' || content === null) {
    return content;
  }

  // 图片消息: { sourcePicture, bigPicture, snapshotPicture } -> { originUrl, thumbUrl }
  if (contentType === ContentType.Picture) {
    if (content.sourcePicture || content.snapshotPicture) {
      return JSON.stringify({
        originUrl: content.sourcePicture?.url || content.bigPicture?.url || content.snapshotPicture?.url,
        thumbUrl: content.snapshotPicture?.url || content.sourcePicture?.url || content.bigPicture?.url,
        width: content.width,
        height: content.height
      });
    }
  }

  // 文件消息: { sourceUrl, fileName, fileSize } -> { url, name, size }
  if (contentType === ContentType.File) {
    if (content.sourceUrl || content.fileName || content.fileSize) {
      let url = content.url;
      if (content.sourceUrl) {
        url = typeof content.sourceUrl === 'string' ? content.sourceUrl : content.sourceUrl?.url;
      }
      return JSON.stringify({
        url: url || content.url,
        name: content.fileName || content.name,
        size: content.fileSize || content.size
      });
    }
  }

  // 语音消息: { sourceUrl, dataSize, duration } -> { url, size, duration }
  if (contentType === ContentType.Sound) {
    if (content.sourceUrl || content.dataSize) {
      return JSON.stringify({
        url: content.sourceUrl || content.url,
        size: content.dataSize || content.size,
        duration: content.duration
      });
    }
  }

  // 视频消息: { videoUrl, videoSize, snapshotUrl, duration } -> 保持或转换
  if (contentType === ContentType.Video) {
    if (content.videoUrl) {
      return JSON.stringify({
        url: content.videoUrl || content.url,
        size: content.videoSize || content.size,
        duration: content.duration,
        thumbUrl: content.snapshotUrl,
        width: content.snapshotWidth,
        height: content.snapshotHeight
      });
    }
  }

  return content;
}

// 解析 MsgData 为业务消息格式
function parseMsgData(msg, conversationID) {
  try {
    console.log('[WS] 服务器响应数据:', msg);

    let contentStr = '';
    if (msg.content) {
      contentStr = new TextDecoder().decode(msg.content);
    }

    let content = contentStr || '';
    try {
      if (contentStr) {
        content = JSON.parse(contentStr);
      }
    } catch (e) {
      // 不是 JSON，保持原始字符串
    }

    // 根据消息类型转换内容格式
    let finalContent = '';
    if (typeof content === 'object' && content !== null) {
      // 转换服务器格式为本地格式
      const converted = convertMessageContent(msg.contentType, content);
      if (typeof converted === 'string') {
        finalContent = converted;
      } else {
        // 文本消息提取 text 字段
        finalContent = content.text || content.content || JSON.stringify(content);
      }
    } else {
      finalContent = content || '';
    }

    // 转换 Long 类型字段
    const seq = longToNumber(msg.seq);
    const sendTime = longToNumber(msg.sendTime) || longToNumber(msg.createTime) || Date.now();

    // 转换为旧的消息格式，兼容现有代码
    const parsedMsg = {
      id: msg.serverMsgID || msg.clientMsgID || '',
      clientMsgID: msg.clientMsgID || '',
      serverMsgID: msg.serverMsgID || '',
      sendId: msg.sendID || '',
      recvId: msg.recvID || '',
      groupId: msg.groupID || '',
      sendNickName: msg.senderNickname || '',
      sendHeadImage: msg.senderFaceURL || '',
      type: convertContentType(msg.contentType),
      content: finalContent,
      rawContent: content,
      contentType: msg.contentType,
      sessionType: msg.sessionType,
      sendTime: sendTime,
      seq: seq,
      status: msg.status || 0,
      selfSend: msg.sendID === userID
    };

    console.log('[WS] 解析后:', parsedMsg);
    return parsedMsg;
  } catch (e) {
    console.error('[WS] 解析消息数据失败:', e);
    return null;
  }
}

// 转换内容类型 (V8 -> 旧格式)
function convertContentType(v8Type) {
  const typeMap = {
    101: 0,  // Text
    102: 1,  // Picture
    103: 3,  // Sound
    104: 4,  // Video
    105: 2,  // File
    106: 0,  // AtText -> Text
    111: 10, // Revoke
    114: 0   // Quote -> Text
  };
  return typeMap[v8Type] !== undefined ? typeMap[v8Type] : 0;
}

// 发送请求
function sendRequest(reqIdentifier, protoData) {
  return new Promise((resolve, reject) => {
    if (!websock || websock.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket 未连接'));
      return;
    }

    msgIncr++;
    const msgIncrStr = String(msgIncr);

    const req = {
      reqIdentifier: reqIdentifier,
      token: token,
      sendID: userID,
      operationID: generateUUID(),
      msgIncr: msgIncrStr,
      data: Array.from(protoData)
    };

    // 设置超时
    const timeout = setTimeout(() => {
      callbacks.delete(msgIncrStr);
      reject(new Error('请求超时'));
    }, 30000);

    // 注册回调
    callbacks.set(msgIncrStr, (resp) => {
      clearTimeout(timeout);
      console.log('[WS] 响应详情:', JSON.stringify(resp, null, 2));
      if (resp.errCode === 0) {
        resolve(resp);
      } else {
        reject(new Error(resp.errMsg || `请求失败 (errCode=${resp.errCode})`));
      }
    });

    // 以 Binary 类型发送
    const jsonStr = JSON.stringify(req);
    const encoder = new TextEncoder();
    websock.send(encoder.encode(jsonStr));
  });
}

// 发送文本消息
async function sendTextMessage(recvID, text, sessionType = 1) {
  const content = JSON.stringify({ text: text });

  const msgData = {
    sendID: userID,
    recvID: sessionType === SessionType.Single ? recvID : '',
    groupID: (sessionType === SessionType.Group || sessionType === SessionType.SuperGroup) ? recvID : '',
    clientMsgID: `${userID}_${Date.now()}`,
    senderPlatformID: 5,
    sessionType: sessionType,
    contentType: ContentType.Text,
    content: new TextEncoder().encode(content),
    createTime: Date.now()
  };

  const errMsg = protoTypes.MsgData.verify(msgData);
  if (errMsg) throw new Error(errMsg);

  const protoData = protoTypes.MsgData.encode(
    protoTypes.MsgData.create(msgData)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendMsg, protoData);

  return {
    serverMsgID: resp.decodedData?.serverMsgID,
    clientMsgID: resp.decodedData?.clientMsgID || msgData.clientMsgID,
    sendTime: Number(resp.decodedData?.sendTime) || Date.now(),
    seq: Number(resp.decodedData?.seq) || 0
  };
}

// 发送图片消息
async function sendImageMessage(recvID, imageInfo, sessionType = 1) {
  const content = JSON.stringify({
    sourcePicture: imageInfo.sourcePicture || imageInfo,
    bigPicture: imageInfo.bigPicture || imageInfo,
    snapshotPicture: imageInfo.snapshotPicture || imageInfo
  });

  const msgData = {
    sendID: userID,
    recvID: sessionType === SessionType.Single ? recvID : '',
    groupID: (sessionType === SessionType.Group || sessionType === SessionType.SuperGroup) ? recvID : '',
    clientMsgID: `${userID}_${Date.now()}`,
    senderPlatformID: 5,
    sessionType: sessionType,
    contentType: ContentType.Picture,
    content: new TextEncoder().encode(content),
    createTime: Date.now()
  };

  const protoData = protoTypes.MsgData.encode(
    protoTypes.MsgData.create(msgData)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendMsg, protoData);

  return {
    serverMsgID: resp.decodedData?.serverMsgID,
    clientMsgID: resp.decodedData?.clientMsgID || msgData.clientMsgID,
    sendTime: Number(resp.decodedData?.sendTime) || Date.now(),
    seq: Number(resp.decodedData?.seq) || 0
  };
}

// 发送文件消息
async function sendFileMessage(recvID, fileInfo, sessionType = 1) {
  // 确保 url 是字符串，不是对象
  let fileUrl = fileInfo.url || fileInfo.sourceUrl;
  if (typeof fileUrl === 'object' && fileUrl !== null) {
    fileUrl = fileUrl.url || '';
  }

  const content = JSON.stringify({
    filePath: fileInfo.filePath || '',
    uuid: fileInfo.uuid || generateUUID(),
    sourceUrl: fileUrl,
    fileName: fileInfo.fileName || fileInfo.name,
    fileSize: fileInfo.fileSize || fileInfo.size
  });

  const msgData = {
    sendID: userID,
    recvID: sessionType === SessionType.Single ? recvID : '',
    groupID: (sessionType === SessionType.Group || sessionType === SessionType.SuperGroup) ? recvID : '',
    clientMsgID: `${userID}_${Date.now()}`,
    senderPlatformID: 5,
    sessionType: sessionType,
    contentType: ContentType.File,
    content: new TextEncoder().encode(content),
    createTime: Date.now()
  };

  const protoData = protoTypes.MsgData.encode(
    protoTypes.MsgData.create(msgData)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendMsg, protoData);

  return {
    serverMsgID: resp.decodedData?.serverMsgID,
    clientMsgID: resp.decodedData?.clientMsgID || msgData.clientMsgID,
    sendTime: Number(resp.decodedData?.sendTime) || Date.now(),
    seq: Number(resp.decodedData?.seq) || 0
  };
}

// 发送语音消息
async function sendAudioMessage(recvID, audioInfo, sessionType = 1) {
  const content = JSON.stringify({
    uuid: audioInfo.uuid || generateUUID(),
    soundPath: audioInfo.soundPath || '',
    sourceUrl: audioInfo.url || audioInfo.sourceUrl,
    dataSize: audioInfo.size || audioInfo.dataSize,
    duration: audioInfo.duration
  });

  const msgData = {
    sendID: userID,
    recvID: sessionType === SessionType.Single ? recvID : '',
    groupID: (sessionType === SessionType.Group || sessionType === SessionType.SuperGroup) ? recvID : '',
    clientMsgID: `${userID}_${Date.now()}`,
    senderPlatformID: 5,
    sessionType: sessionType,
    contentType: ContentType.Sound,
    content: new TextEncoder().encode(content),
    createTime: Date.now()
  };

  const protoData = protoTypes.MsgData.encode(
    protoTypes.MsgData.create(msgData)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendMsg, protoData);

  return {
    serverMsgID: resp.decodedData?.serverMsgID,
    clientMsgID: resp.decodedData?.clientMsgID || msgData.clientMsgID,
    sendTime: Number(resp.decodedData?.sendTime) || Date.now(),
    seq: Number(resp.decodedData?.seq) || 0
  };
}

// 发送视频消息
async function sendVideoMessage(recvID, videoInfo, sessionType = 1) {
  const content = JSON.stringify({
    videoPath: videoInfo.videoPath || '',
    videoUUID: videoInfo.uuid || generateUUID(),
    videoUrl: videoInfo.url || videoInfo.videoUrl,
    videoType: videoInfo.type || 'mp4',
    videoSize: videoInfo.size || videoInfo.videoSize,
    duration: videoInfo.duration,
    snapshotPath: videoInfo.snapshotPath || '',
    snapshotUUID: videoInfo.snapshotUUID || generateUUID(),
    snapshotSize: videoInfo.snapshotSize || 0,
    snapshotUrl: videoInfo.snapshotUrl || videoInfo.thumbUrl || '',
    snapshotWidth: videoInfo.snapshotWidth || videoInfo.width || 0,
    snapshotHeight: videoInfo.snapshotHeight || videoInfo.height || 0
  });

  const msgData = {
    sendID: userID,
    recvID: sessionType === SessionType.Single ? recvID : '',
    groupID: (sessionType === SessionType.Group || sessionType === SessionType.SuperGroup) ? recvID : '',
    clientMsgID: `${userID}_${Date.now()}`,
    senderPlatformID: 5,
    sessionType: sessionType,
    contentType: ContentType.Video,
    content: new TextEncoder().encode(content),
    createTime: Date.now()
  };

  const protoData = protoTypes.MsgData.encode(
    protoTypes.MsgData.create(msgData)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendMsg, protoData);

  return {
    serverMsgID: resp.decodedData?.serverMsgID,
    clientMsgID: resp.decodedData?.clientMsgID || msgData.clientMsgID,
    sendTime: Number(resp.decodedData?.sendTime) || Date.now(),
    seq: Number(resp.decodedData?.seq) || 0
  };
}

// 获取最新消息序列号
async function getMaxSeq() {
  const req = { userID: userID };
  const protoData = protoTypes.GetMaxSeqReq.encode(
    protoTypes.GetMaxSeqReq.create(req)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSGetNewestSeq, protoData);
  return resp.decodedData;
}

// 心跳机制
function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (websock && websock.readyState === WebSocket.OPEN) {
      websock.send(JSON.stringify({ type: 'ping' }));
      console.log('[WS] 发送心跳');
    }
  }, 25000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// 重连
let reconnect = (wsurl, tkn, uid) => {
  console.log("[WS] 尝试重新连接");
  if (isConnect) {
    return;
  }
  setTimeout(() => {
    connect(wsurl || wsUrl, tkn || token, uid || userID);
  }, 15000);
};

// 关闭连接
let close = (code) => {
  stopHeartbeat();
  if (websock) {
    websock.close(code || 1000);
    websock = null;
  }
  isConnect = false;
};

// 发送消息 (兼容旧接口)
let sendMessage = (agentData) => {
  if (!websock || websock.readyState !== WebSocket.OPEN) {
    console.error('[WS] WebSocket未连接');
    return Promise.reject(new Error('WebSocket未连接'));
  }
  // 兼容旧的调用方式
  websock.send(JSON.stringify(agentData));
  return Promise.resolve();
};

// 回调设置
let onConnect = (callback) => {
  connectCallBack = callback;
};

let onMessage = (callback) => {
  messageCallBack = callback;
};

let onClose = (callback) => {
  closeCallBack = callback;
};

// 检查连接状态
function isConnected() {
  return websock && websock.readyState === WebSocket.OPEN;
}

// 导出
export {
  connect,
  reconnect,
  close,
  sendMessage,
  onConnect,
  onMessage,
  onClose,
  isConnected,
  // V8 新接口
  sendTextMessage,
  sendImageMessage,
  sendFileMessage,
  sendAudioMessage,
  sendVideoMessage,
  getMaxSeq,
  // 常量
  ContentType,
  SessionType,
  ReqIdentifier
};
