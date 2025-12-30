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

// ============ RTC 信令相关 ============
message InvitationInfo {
  string inviterUserID = 1;
  repeated string inviteeUserIDList = 2;
  string customData = 3;
  string groupID = 4;
  string roomID = 5;
  int32 timeout = 6;
  string mediaType = 7;
  int32 platformID = 8;
  int32 sessionType = 9;
  int64 initiateTime = 10;
}

message ParticipantMetaData {
  GroupInfo groupInfo = 1;
  GroupMemberFullInfo groupMemberInfo = 2;
  UserInfo userInfo = 3;
}

message UserInfo {
  string userID = 1;
  string nickname = 2;
  string faceURL = 3;
  int32 appMangerLevel = 4;
  int64 createTime = 5;
}

message GroupInfo {
  string groupID = 1;
  string groupName = 2;
  string faceURL = 3;
}

message GroupMemberFullInfo {
  string groupID = 1;
  string userID = 2;
  int32 roleLevel = 3;
  string nickname = 4;
  string faceURL = 5;
}

message SignalInviteReq {
  InvitationInfo invitation = 1;
  OfflinePushInfo offlinePushInfo = 2;
  ParticipantMetaData participant = 3;
  string userID = 4;
}

message SignalAcceptReq {
  InvitationInfo invitation = 1;
  OfflinePushInfo offlinePushInfo = 2;
  ParticipantMetaData participant = 3;
  int32 opUserPlatformID = 4;
  string userID = 5;
}

message SignalRejectReq {
  InvitationInfo invitation = 1;
  OfflinePushInfo offlinePushInfo = 2;
  ParticipantMetaData participant = 3;
  int32 opUserPlatformID = 4;
  string userID = 5;
}

message SignalCancelReq {
  InvitationInfo invitation = 1;
  OfflinePushInfo offlinePushInfo = 2;
  ParticipantMetaData participant = 3;
  string userID = 4;
}

message SignalHungUpReq {
  InvitationInfo invitation = 1;
  OfflinePushInfo offlinePushInfo = 2;
  string userID = 3;
}

message SignalReq {
  oneof payload {
    SignalInviteReq invite = 1;
    SignalInviteReq inviteInGroup = 2;
    SignalCancelReq cancel = 3;
    SignalAcceptReq accept = 4;
    SignalHungUpReq hungUp = 5;
    SignalRejectReq reject = 6;
  }
}

message SignalInviteResp {
  string token = 1;
  string roomID = 2;
  string liveURL = 3;
}

message SignalAcceptResp {
  string token = 1;
  string roomID = 2;
  string liveURL = 3;
}

message SignalResp {
  oneof payload {
    SignalInviteResp invite = 1;
    SignalInviteResp inviteInGroup = 2;
    SignalCancelReq cancel = 3;
    SignalAcceptResp accept = 4;
    SignalHungUpReq hungUp = 5;
    SignalRejectReq reject = 6;
  }
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
      GetConvMaxReadSeqResp: root.lookupType("GetConvMaxReadSeqResp"),
      // RTC 信令类型
      InvitationInfo: root.lookupType("InvitationInfo"),
      ParticipantMetaData: root.lookupType("ParticipantMetaData"),
      UserInfo: root.lookupType("UserInfo"),
      SignalReq: root.lookupType("SignalReq"),
      SignalResp: root.lookupType("SignalResp"),
      SignalInviteReq: root.lookupType("SignalInviteReq"),
      SignalAcceptReq: root.lookupType("SignalAcceptReq"),
      SignalRejectReq: root.lookupType("SignalRejectReq"),
      SignalCancelReq: root.lookupType("SignalCancelReq"),
      SignalHungUpReq: root.lookupType("SignalHungUpReq"),
      SignalInviteResp: root.lookupType("SignalInviteResp"),
      SignalAcceptResp: root.lookupType("SignalAcceptResp")
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
      case ReqIdentifier.WSSendSignalMsg:
        return decodeSignalResp(bytes);
      default:
        return bytes;
    }
  } catch (e) {
    console.error('[WS] 解码响应数据失败:', e);
    return null;
  }
}

// 解码 RTC 信令响应
function decodeSignalResp(bytes) {
  try {
    const signalResp = protoTypes.SignalResp.decode(bytes);
    const result = { type: null, data: null };

    if (signalResp.invite) {
      result.type = 'invite';
      result.data = {
        token: signalResp.invite.token,
        roomID: signalResp.invite.roomID,
        liveURL: signalResp.invite.liveURL
      };
    } else if (signalResp.inviteInGroup) {
      result.type = 'inviteInGroup';
      result.data = {
        token: signalResp.inviteInGroup.token,
        roomID: signalResp.inviteInGroup.roomID,
        liveURL: signalResp.inviteInGroup.liveURL
      };
    } else if (signalResp.accept) {
      result.type = 'accept';
      result.data = {
        token: signalResp.accept.token,
        roomID: signalResp.accept.roomID,
        liveURL: signalResp.accept.liveURL
      };
    } else if (signalResp.reject) {
      result.type = 'reject';
      result.data = {};
    } else if (signalResp.cancel) {
      result.type = 'cancel';
      result.data = {};
    } else if (signalResp.hungUp) {
      result.type = 'hungUp';
      result.data = {};
    }

    return result;
  } catch (e) {
    console.error('[WS] 解码RTC信令响应失败:', e);
    return null;
  }
}

// 解码来电邀请通知 (从推送消息中解析)
function decodeInviteNotification(content) {
  try {
    // content 是 NotificationElem { detail: "..." }
    let contentObj = content;
    if (typeof content === 'string') {
      contentObj = JSON.parse(content);
    }

    // 解析 detail 得到 SignalInviteReq
    const detail = typeof contentObj.detail === 'string'
      ? JSON.parse(contentObj.detail)
      : contentObj.detail;

    return {
      invitation: detail.invitation || {},
      participant: detail.participant || {},
      userID: detail.userID || ''
    };
  } catch (e) {
    console.error('[WS] 解码来电通知失败:', e);
    return null;
  }
}

// RTC 信令内容类型
const RtcContentType = {
  SignalNotification: 1601  // RTC 信令通知
};

// ============ 手动 Protobuf 解码器 (从 demo HTML 移植) ============
/* global BigInt */

/**
 * 简易 Protobuf 解码器类
 * 用于解码 RTC 信令消息，避免 protobufjs 库的 schema 匹配问题
 */
class ProtobufDecoder {
  constructor(bytes) {
    this.bytes = bytes;
    this.offset = 0;
  }

  hasMore() {
    return this.offset < this.bytes.length;
  }

  readVarint() {
    let result = 0;
    let shift = 0;
    while (this.offset < this.bytes.length) {
      const byte = this.bytes[this.offset++];
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    return result >>> 0;
  }

  readVarint64() {
    let result = BigInt(0);
    let shift = BigInt(0);
    while (this.offset < this.bytes.length) {
      const byte = BigInt(this.bytes[this.offset++]);
      result |= (byte & 0x7fn) << shift;
      if ((byte & 0x80n) === 0n) break;
      shift += 7n;
    }
    return result;
  }

  readBytes(length) {
    const bytes = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  readString(length) {
    const bytes = this.readBytes(length);
    return new TextDecoder().decode(bytes);
  }
}

/**
 * 解码 InvitationInfo (RTC 邀请信息)
 * Proto 定义:
 *   string inviterUserID = 1;
 *   repeated string inviteeUserIDList = 2;
 *   string customData = 3;
 *   string groupID = 4;
 *   string roomID = 5;
 *   int32 timeout = 6;
 *   string mediaType = 7;
 *   int32 platformID = 8;
 *   int32 sessionType = 9;
 *   int64 initiateTime = 10;
 */
function decodeInvitationInfoManual(bytes) {
  const decoder = new ProtobufDecoder(bytes);
  const result = {
    inviterUserID: '',
    inviteeUserIDList: [],
    customData: '',
    groupID: '',
    roomID: '',
    timeout: 60,
    mediaType: '', // 默认空，让我们看看是否被正确解码
    platformID: 0,
    sessionType: 1,
    initiateTime: 0
  };

  const debugFields = [];

  while (decoder.hasMore()) {
    const tag = decoder.readVarint();
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x7;

    debugFields.push(`field=${fieldNumber},wire=${wireType}`);

    switch (fieldNumber) {
      case 1:
        result.inviterUserID = decoder.readString(decoder.readVarint());
        debugFields.push(`inviter=${result.inviterUserID}`);
        break;
      case 2: {
        const invitee = decoder.readString(decoder.readVarint());
        result.inviteeUserIDList.push(invitee);
        debugFields.push(`invitee=${invitee}`);
        break;
      }
      case 3:
        result.customData = decoder.readString(decoder.readVarint());
        break;
      case 4:
        result.groupID = decoder.readString(decoder.readVarint());
        break;
      case 5:
        result.roomID = decoder.readString(decoder.readVarint());
        debugFields.push(`roomID=${result.roomID}`);
        break;
      case 6:
        result.timeout = decoder.readVarint();
        break;
      case 7:
        result.mediaType = decoder.readString(decoder.readVarint());
        debugFields.push(`mediaType=${result.mediaType}`);
        break;
      case 8:
        result.platformID = decoder.readVarint();
        break;
      case 9:
        result.sessionType = decoder.readVarint();
        break;
      case 10:
        result.initiateTime = Number(decoder.readVarint64());
        break;
      default:
        // 跳过未知字段
        debugFields.push(`skip_field_${fieldNumber}`);
        if (wireType === 0) decoder.readVarint();
        else if (wireType === 2) decoder.readBytes(decoder.readVarint());
        else if (wireType === 5) decoder.readBytes(4); // fixed32
        else if (wireType === 1) decoder.readBytes(8); // fixed64
    }
  }

  console.log('[RTC] InvitationInfo 解码字段:', debugFields.join(', '));
  console.log('[RTC] InvitationInfo 解码结果:', result);

  // 如果 mediaType 为空，使用默认值
  if (!result.mediaType) {
    console.warn('[RTC] mediaType 未被解码，使用默认值 video');
    result.mediaType = 'video';
  }

  return result;
}

/**
 * 解码 RTC 信令请求 (自动识别类型)
 *
 * SignalInviteReq/SignalCancelReq:
 *   InvitationInfo invitation = 1;
 *   OfflinePushInfo offlinePushInfo = 2;
 *   ParticipantMetaData participant = 3;
 *   string userID = 4;
 *
 * SignalAcceptReq/SignalRejectReq:
 *   InvitationInfo invitation = 1;
 *   OfflinePushInfo offlinePushInfo = 2;
 *   ParticipantMetaData participant = 3;
 *   int32 opUserPlatformID = 4;  ← 关键差异：这是 int32
 *   string userID = 5;
 *
 * SignalHungUpReq:
 *   InvitationInfo invitation = 1;
 *   OfflinePushInfo offlinePushInfo = 2;
 *   string userID = 3;  ← 关键差异：userID 在 field 3
 */
function decodeSignalInviteReqManual(bytes) {
  const decoder = new ProtobufDecoder(bytes);
  const result = {
    invitation: null,
    participant: null,
    userID: '',
    detectedType: 'invite' // 默认类型，会根据字段结构自动调整
  };

  let hasField4Varint = false; // field 4 是 varint 表示 Accept/Reject
  let hasField5 = false;       // 有 field 5 表示 Accept/Reject
  let hasField3String = false; // field 3 是 string 且不是 participant 表示 HungUp

  while (decoder.hasMore()) {
    const tag = decoder.readVarint();
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x7;

    switch (fieldNumber) {
      case 1: // invitation (InvitationInfo)
        result.invitation = decodeInvitationInfoManual(decoder.readBytes(decoder.readVarint()));
        break;
      case 2: // offlinePushInfo (跳过)
        if (wireType === 2) decoder.readBytes(decoder.readVarint());
        else if (wireType === 0) decoder.readVarint();
        break;
      case 3: { // participant 或 userID (HungUp)
        if (wireType === 2) {
          const bytes3 = decoder.readBytes(decoder.readVarint());
          // 尝试判断是 participant 还是 userID
          // participant 是嵌套消息，userID 是纯字符串
          const str3 = new TextDecoder().decode(bytes3);
          // 如果看起来像 userID（没有特殊字符，较短），则是 HungUp
          if (str3.length < 50 && /^[a-zA-Z0-9_-]+$/.test(str3)) {
            result.userID = str3;
            hasField3String = true;
          }
          // 否则是 participant，跳过
        } else if (wireType === 0) {
          decoder.readVarint();
        }
        break;
      }
      case 4: // userID (Invite/Cancel) 或 opUserPlatformID (Accept/Reject)
        if (wireType === 2) {
          // string 类型 = userID = Invite 或 Cancel
          result.userID = decoder.readString(decoder.readVarint());
        } else if (wireType === 0) {
          // varint 类型 = opUserPlatformID = Accept 或 Reject
          decoder.readVarint(); // 跳过 opUserPlatformID
          hasField4Varint = true;
        }
        break;
      case 5: // userID (仅 Accept/Reject 有这个字段)
        if (wireType === 2) {
          result.userID = decoder.readString(decoder.readVarint());
          hasField5 = true;
        } else if (wireType === 0) {
          decoder.readVarint();
        }
        break;
      default:
        if (wireType === 0) decoder.readVarint();
        else if (wireType === 2) decoder.readBytes(decoder.readVarint());
        else if (wireType === 5) decoder.readBytes(4);
        else if (wireType === 1) decoder.readBytes(8);
    }
  }

  // 根据字段结构判断信令类型
  if (hasField3String) {
    result.detectedType = 'hungUp';
  } else if (hasField4Varint || hasField5) {
    // 有 opUserPlatformID 或 field 5，是 Accept 或 Reject
    // 无法区分 accept 和 reject，默认当作 accept
    result.detectedType = 'accept';
  } else {
    // 标准的 Invite 或 Cancel 结构
    // 无法区分，默认当作 invite
    result.detectedType = 'invite';
  }

  console.log('[RTC] 信令解码结果:', result, '检测类型:', result.detectedType);
  return result;
}

/**
 * 解码其他 RTC 信令类型 (accept, reject, cancel, hungUp)
 * 这些消息的结构类似 SignalInviteReq，主要包含 invitation 和 userID
 */
function decodeSignalReqManual(bytes) {
  const decoder = new ProtobufDecoder(bytes);
  const result = {
    signalType: null,
    invitation: null,
    userID: ''
  };

  while (decoder.hasMore()) {
    const tag = decoder.readVarint();
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x7;

    if (wireType === 2) {
      const data = decoder.readBytes(decoder.readVarint());
      switch (fieldNumber) {
        case 1: { // invite
          result.signalType = 'invite';
          const inviteReq = decodeSignalInviteReqManual(data);
          result.invitation = inviteReq.invitation;
          result.userID = inviteReq.userID;
          break;
        }
        case 2: { // inviteInGroup
          result.signalType = 'inviteInGroup';
          const groupInviteReq = decodeSignalInviteReqManual(data);
          result.invitation = groupInviteReq.invitation;
          result.userID = groupInviteReq.userID;
          break;
        }
        case 3: // cancel
          result.signalType = 'cancel';
          result.invitation = decodeInvitationFromSignal(data);
          break;
        case 4: // accept
          result.signalType = 'accept';
          result.invitation = decodeInvitationFromSignal(data);
          break;
        case 5: // hungUp
          result.signalType = 'hungUp';
          result.invitation = decodeInvitationFromSignal(data);
          break;
        case 6: // reject
          result.signalType = 'reject';
          result.invitation = decodeInvitationFromSignal(data);
          break;
      }
    } else if (wireType === 0) {
      decoder.readVarint();
    }
  }

  return result;
}

/**
 * 从信令消息中提取 invitation
 */
function decodeInvitationFromSignal(bytes) {
  const decoder = new ProtobufDecoder(bytes);
  let invitation = null;

  while (decoder.hasMore()) {
    const tag = decoder.readVarint();
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x7;

    if (fieldNumber === 1 && wireType === 2) {
      invitation = decodeInvitationInfoManual(decoder.readBytes(decoder.readVarint()));
    } else if (wireType === 0) {
      decoder.readVarint();
    } else if (wireType === 2) {
      decoder.readBytes(decoder.readVarint());
    }
  }

  return invitation;
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
          // 检查是否是 RTC 信令消息 (contentType=1600-1699)
          if (msg.contentType >= 1600 && msg.contentType < 1700) {
            console.log('[WS] 在 msgs 中检测到 RTC 信令:', msg.contentType);
            handleRtcSignalNotification(msg);
            continue;
          }

          // 检查是否是 WebRTC 信令消息 (自定义消息)
          if (msg.contentType === ContentType.Custom) {
            const handled = handleWebRTCSignalMessage(msg);
            if (handled) continue; // 如果是 WebRTC 信令，不再作为普通消息处理
          }

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
          console.log('[WS] 通知消息 contentType:', msg.contentType, 'sendID:', msg.sendID);

          // 检查是否是 RTC 信令通知 (contentType=1600-1699 范围)
          if (msg.contentType >= 1600 && msg.contentType < 1700) {
            console.log('[WS] 检测到 RTC 信令消息:', msg.contentType);
            handleRtcSignalNotification(msg);
            continue;
          }

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

// RTC 信令 contentType 映射
const RtcSignalContentType = {
  1601: 'invite',      // SignalInviteReq
  1602: 'accept',      // SignalAcceptReq
  1603: 'reject',      // SignalRejectReq
  1604: 'cancel',      // SignalCancelReq
  1605: 'hungUp',      // SignalHungUpReq
  1606: 'inviteInGroup' // 群组邀请
};

// 处理 RTC 信令通知 (来电/接听/拒绝等)
function handleRtcSignalNotification(msg) {
  try {
    console.log('[RTC] contentType:', msg.contentType);
    console.log('[RTC] msg.content 类型:', typeof msg.content, msg.content?.constructor?.name);
    console.log('[RTC] msg.content 长度:', msg.content?.length || msg.content?.byteLength);

    // 根据 contentType 确定信令类型
    const signalTypeFromContentType = RtcSignalContentType[msg.contentType];
    console.log('[RTC] 根据 contentType 推断信令类型:', signalTypeFromContentType || '未知');

    // 确保 content 是 Uint8Array
    let contentBytes = msg.content;
    if (contentBytes && !(contentBytes instanceof Uint8Array)) {
      if (typeof contentBytes === 'string') {
        // 如果是字符串，转换为 Uint8Array
        contentBytes = new TextEncoder().encode(contentBytes);
      } else if (contentBytes.buffer) {
        // 如果是 ArrayBuffer 或类似对象
        contentBytes = new Uint8Array(contentBytes);
      }
    }

    if (!contentBytes || contentBytes.length === 0) {
      console.log('[RTC] 信令内容为空');
      return;
    }

    // 打印前 50 字节用于调试
    const hexPreview = Array.from(contentBytes.slice(0, 50))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    console.log('[RTC] 信令内容前50字节(hex):', hexPreview);

    let inviteData = null;

    // 直接解析为 SignalInviteReq/SignalAcceptReq/SignalRejectReq 等
    // 这些消息结构类似，都有 invitation 在 field 1
    // 解码器会根据字段结构自动检测信令类型 (invite/accept/hungUp)
    try {
      console.log('[RTC] 解析 RTC 信令...');
      const signalReq = decodeSignalInviteReqManual(contentBytes);

      console.log('[RTC] 检测到类型:', signalReq.detectedType);
      console.log('[RTC] invitation.inviterUserID:', signalReq.invitation?.inviterUserID);
      console.log('[RTC] invitation.roomID:', signalReq.invitation?.roomID);

      if (signalReq.invitation && signalReq.invitation.inviterUserID) {
        // 使用解码器检测的类型
        const signalType = signalReq.detectedType || 'invite';

        inviteData = {
          invitation: signalReq.invitation,
          participant: signalReq.participant,
          userID: signalReq.userID,
          signalType: signalType
        };
        console.log('[RTC] 解码成功, 信令类型:', signalType);
      } else {
        console.log('[RTC] invitation 无效，inviterUserID 为空');
      }
    } catch (e) {
      console.log('[RTC] RTC 信令解析失败:', e.message);
    }

    // 方式3: 尝试 JSON 解析 (兼容旧格式 NotificationElem)
    if (!inviteData) {
      try {
        const contentStr = new TextDecoder().decode(contentBytes);
        console.log('[RTC] 尝试 JSON 解析...');
        inviteData = decodeInviteNotification(contentStr);
        if (inviteData) {
          inviteData.signalType = signalTypeFromContentType || 'invite';
        }
      } catch (e) {
        console.log('[RTC] JSON 解析也失败:', e.message);
      }
    }

    if (!inviteData) {
      console.log('[RTC] 无法解析信令内容，所有解析方式均失败');
      return;
    }

    console.log('[RTC] 收到信令通知:', inviteData);

    // 回调给 RTC 组件处理
    if (rtcCallBack) {
      const callbackData = {
        type: 'signal',
        signalType: inviteData.signalType || 'invite',
        senderId: msg.sendID,
        invitation: inviteData.invitation,
        participant: inviteData.participant,
        userID: inviteData.userID
      };
      console.log('[RTC] 调用 rtcCallBack, signalType:', callbackData.signalType);
      rtcCallBack(callbackData);
    } else {
      console.warn('[RTC] rtcCallBack 未注册，无法转发信令');
    }
  } catch (e) {
    console.error('[RTC] 解析信令通知失败:', e);
  }
}

// 处理 WebRTC 信令消息 (Offer/Answer/Candidate)
function handleWebRTCSignalMessage(msg) {
  try {
    let contentStr = '';
    if (msg.content) {
      contentStr = new TextDecoder().decode(msg.content);
    }

    const content = JSON.parse(contentStr);

    // 检查是否是 WebRTC 信令
    if (content.type !== 'webrtc_signal') {
      return false;
    }

    console.log('[WebRTC] 收到信令:', content.signalType);

    // 回调给 RTC 组件处理
    if (rtcCallBack) {
      rtcCallBack({
        type: 'webrtc',
        senderId: msg.sendID,
        signalType: content.signalType,
        roomID: content.roomID,
        data: content.data
      });
    }

    return true; // 表示已处理
  } catch (e) {
    return false; // 不是 WebRTC 信令，继续作为普通消息处理
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
    // 普通消息
    101: 0,  // Text
    102: 1,  // Picture
    103: 3,  // Sound
    104: 4,  // Video
    105: 2,  // File
    106: 0,  // AtText -> Text
    111: 10, // Revoke
    114: 0,  // Quote -> Text
    // 好友通知
    1201: 80, // FriendApplicationApproved -> FRIEND_NEW
    1202: 83, // FriendApplicationRejected -> FRIEND_REJECTED
    1203: 80, // FriendAdded -> FRIEND_NEW
    1204: 81, // FriendDeleted -> FRIEND_DEL
    // 群通知
    1501: 90, // GroupCreated -> GROUP_NEW
    1504: 91, // GroupDismissed -> GROUP_DEL
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

// ============ RTC 信令方法 ============

// RTC 回调
let rtcCallBack = null;

// 设置 RTC 回调
function onRtcMessage(callback) {
  rtcCallBack = callback;
}

// 创建邀请信息
function createInvitation(calleeID, mediaType, sessionType = 1, groupID = '') {
  return {
    inviterUserID: userID,
    inviteeUserIDList: [calleeID],
    customData: '',
    groupID: groupID,
    roomID: `room_${userID}_${calleeID}_${Date.now()}`,
    timeout: 60,
    mediaType: mediaType, // 'video' 或 'audio'
    platformID: 5, // Web
    sessionType: sessionType,
    initiateTime: Date.now()
  };
}

// 创建参与者元数据
function createParticipant(nickname = '', faceURL = '') {
  return {
    userInfo: {
      userID: userID,
      nickname: nickname || userID,
      faceURL: faceURL || ''
    }
  };
}

// 发送 RTC 邀请 (发起通话)
async function rtcInvite(calleeID, mediaType, nickname = '', faceURL = '') {
  const invitation = createInvitation(calleeID, mediaType);
  const participant = createParticipant(nickname, faceURL);

  const signalInviteReq = {
    invitation: invitation,
    participant: participant,
    userID: userID
  };

  // 编码 SignalReq (oneof invite = 1)
  const signalReq = { invite: signalInviteReq };
  const protoData = protoTypes.SignalReq.encode(
    protoTypes.SignalReq.create(signalReq)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendSignalMsg, protoData);

  // 返回包含 invitation 和服务端响应的信息
  return {
    invitation: invitation,
    response: resp.decodedData
  };
}

// 接受 RTC 邀请 (接听)
async function rtcAccept(invitation, nickname = '', faceURL = '') {
  const participant = createParticipant(nickname, faceURL);

  const signalAcceptReq = {
    invitation: invitation,
    participant: participant,
    opUserPlatformID: 5,
    userID: userID
  };

  const signalReq = { accept: signalAcceptReq };
  const protoData = protoTypes.SignalReq.encode(
    protoTypes.SignalReq.create(signalReq)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendSignalMsg, protoData);
  return resp.decodedData;
}

// 拒绝 RTC 邀请
async function rtcReject(invitation, nickname = '', faceURL = '') {
  const participant = createParticipant(nickname, faceURL);

  const signalRejectReq = {
    invitation: invitation,
    participant: participant,
    opUserPlatformID: 5,
    userID: userID
  };

  const signalReq = { reject: signalRejectReq };
  const protoData = protoTypes.SignalReq.encode(
    protoTypes.SignalReq.create(signalReq)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendSignalMsg, protoData);
  return resp.decodedData;
}

// 取消 RTC 邀请 (在对方接听前取消)
async function rtcCancel(invitation, nickname = '', faceURL = '') {
  const participant = createParticipant(nickname, faceURL);

  const signalCancelReq = {
    invitation: invitation,
    participant: participant,
    userID: userID
  };

  const signalReq = { cancel: signalCancelReq };
  const protoData = protoTypes.SignalReq.encode(
    protoTypes.SignalReq.create(signalReq)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendSignalMsg, protoData);
  return resp.decodedData;
}

// 挂断 RTC 通话
async function rtcHungUp(invitation) {
  const signalHungUpReq = {
    invitation: invitation,
    userID: userID
  };

  const signalReq = { hungUp: signalHungUpReq };
  const protoData = protoTypes.SignalReq.encode(
    protoTypes.SignalReq.create(signalReq)
  ).finish();

  const resp = await sendRequest(ReqIdentifier.WSSendSignalMsg, protoData);
  return resp.decodedData;
}

// 发送 WebRTC 信令 (Offer/Answer/Candidate)
async function sendWebRTCSignal(targetID, signalType, data, roomID) {
  const content = JSON.stringify({
    type: 'webrtc_signal',
    signalType: signalType, // 'offer', 'answer', 'candidate'
    roomID: roomID,
    data: data
  });

  const msgData = {
    sendID: userID,
    recvID: targetID,
    clientMsgID: `${userID}_rtc_${Date.now()}`,
    senderPlatformID: 5,
    sessionType: SessionType.Single,
    contentType: ContentType.Custom,
    content: new TextEncoder().encode(content),
    createTime: Date.now()
  };

  const protoData = protoTypes.MsgData.encode(
    protoTypes.MsgData.create(msgData)
  ).finish();

  await sendRequest(ReqIdentifier.WSSendMsg, protoData);
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
  // RTC 信令接口 (V2)
  onRtcMessage,
  rtcInvite,
  rtcAccept,
  rtcReject,
  rtcCancel,
  rtcHungUp,
  sendWebRTCSignal,
  // 常量
  ContentType,
  SessionType,
  ReqIdentifier
};
