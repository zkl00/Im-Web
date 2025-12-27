# KKIM WebSocket Web 端对接文档

## 1. 概述

KKIM 消息网关 (msggateway) 提供 WebSocket 接口，用于实时消息收发。Web 端需要通过 WebSocket 连接来实现即时通讯功能。

## 2. 连接地址

```
ws://{host}:10001/?sendID={userID}&platformID=5&token={token}&sdkType=js
```

### 参数说明

| 参数 | 类型 | 必填 | 说明                                                         |
|------|------|------|------------------------------------------------------------|
| sendID | string | 是 | 当前用户ID                                                     |
| platformID | int | 是 | 平台标识                               |
| token | string | 是 | JWT 认证令牌                                                   |
| sdkType | string | **是** | **必须设为 "js"**，否则默认 "go" 使用 Gob 编码,前端调用暂时统一为js. 服务端调用可以选择go |
| compression | string | 否 | 压缩方式，支持 "gzip"                                             |

| platformID | 平台名称   | 说明         |
| ---------- | ---------- | ------------ |
| 1          | iOS        | iPhone 设备  |
| 2          | Android    | 安卓手机     |
| 3          | Windows    | Windows 电脑 |
| 4          | macOS/OSX  | Mac 电脑     |
| 5          | Web        | 网页端       |
| 6          | MiniWeb    | 微信小程序   |
| 7          | Linux      | Linux 桌面   |
| 8          | AndroidPad | 安卓平板     |
| 9          | iPad       | iPad 设备    |
| 10         | Admin      | 管理端       |

## 3. 消息协议

### 3.1 请求格式 (Req)

```json
{
  "reqIdentifier": 1003,        // 请求标识符
  "token": "xxx",               // JWT Token，登录接口返回的token
  "sendID": "user123",          // 发送者ID
  "operationID": "uuid",        // 操作唯一ID（建议使用 UUID）
  "msgIncr": "1",               // 消息序号（字符串类型，递增）客户端本地不重复就行，不同客户可以重复。主要适用于收到响应后回调逻辑
  "data": [10, 8, 97, ...]      // Protobuf 编码的字节数组
}
```

> **注意**: `data` 字段在发送时是 **字节数组**（JSON 中表示为数字数组），不是 Base64 字符串。

### 3.2 响应格式 (Resp)

```json
{
  "reqIdentifier": 1003,        // 对应请求的标识符
  "msgIncr": "1",               // 对应请求的消息序号
  "operationID": "uuid",        // 操作唯一ID
  "errCode": 0,                 // 错误码，0 表示成功
  "errMsg": "",                 // 错误信息
  "data": "CiA0ZmFi..."         // Protobuf 编码的响应数据（Base64 字符串）
}
```

> **注意**: 响应中的 `data` 字段是 **Base64 编码的字符串**，需要先 Base64 解码，再进行 Protobuf 解码。

### 3.3 协议标识符 (ReqIdentifier)

| 标识符 | 值 | 方向 | 说明 |
|--------|-----|------|------|
| WSGetNewestSeq | 1001 | Client→Server | 获取最新消息序列号 |
| WSPullMsgBySeqList | 1002 | Client→Server | 按序列号批量拉取消息 |
| WSSendMsg | 1003 | Client→Server | 发送消息 |
| WSSendSignalMsg | 1004 | Client→Server | 发送信令消息(音视频) |
| WSPullMsg | 1005 | Client→Server | 拉取消息 |
| WSGetConvMaxReadSeq | 1006 | Client→Server | 获取会话最大已读序列号 |
| WSPushMsg | 2001 | Server→Client | 服务端推送消息 |
| WSKickOnlineMsg | 2002 | Server→Client | 踢下线通知 |
| WsLogoutMsg | 2003 | Server→Client | 登出通知 |

## 4. 心跳机制

### 4.1 心跳配置

- 心跳超时: 30秒 (pongWait)
- 建议心跳间隔: 25秒

### 4.2 心跳方式

**方式一：WebSocket Ping/Pong 帧（推荐）**

使用 WebSocket 标准的 Ping 帧，服务端会自动回复 Pong。

**方式二：Text 消息心跳**

```javascript
// 发送 (Text 类型)
{"type": "ping"}

// 接收 (Text 类型)
{"type": "pong"}
```

## 5. 消息内容类型 (ContentType)

| 值 | 类型 | 说明 |
|----|------|------|
| 101 | Text | 文本消息 |
| 102 | Picture | 图片消息 |
| 103 | Sound | 语音消息 |
| 104 | Video | 视频消息 |
| 105 | File | 文件消息 |
| 106 | AtText | @消息 |
| 107 | Merger | 合并消息 |
| 108 | Card | 名片消息 |
| 109 | Location | 位置消息 |
| 110 | Custom | 自定义消息 |
| 111 | Revoke | 撤回消息 |
| 114 | Quote | 引用消息 |

### 5.2 通知消息类型 (NotificationContentType)

| 值 | 类型 | 说明 |
|----|------|------|
| 2101 | MsgRevokeNotification | 撤回消息通知 |
| 2102 | DeleteMsgsNotification | 删除消息通知 |
| 2200 | HasReadReceipt | 已读回执 |

## 6. 会话类型 (SessionType)

| 值 | 说明 |
|----|------|
| 1 | 单聊 |
| 2 | 群聊 |
| 3 | 超级群 |
| 4 | 通知会话 |

## 7. 前端发送消息详细对接

### 7.1 发送消息完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│  1. 构建消息内容 (Content)                                        │
│     例如: {"text": "你好"}                                        │
├─────────────────────────────────────────────────────────────────┤
│  2. 构建 MsgData (Protobuf 结构)                                  │
│     包含: sendID, recvID, contentType, content, sessionType 等   │
├─────────────────────────────────────────────────────────────────┤
│  3. Protobuf 编码 MsgData → 二进制数据                            │
├─────────────────────────────────────────────────────────────────┤
│  4. 构建 Req 请求体                                               │
│     reqIdentifier=1003, data=protobuf二进制                      │
├─────────────────────────────────────────────────────────────────┤
│  5. JSON 序列化 Req                                               │
├─────────────────────────────────────────────────────────────────┤
│  6. 以 Binary 类型发送 WebSocket 消息                              │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 MsgData 结构 (Protobuf)

发送消息时，`data` 字段需要是 `MsgData` 的 Protobuf 编码：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sendID | string | 是 | 发送者用户ID |
| recvID | string | 单聊必填 | 接收者用户ID（单聊时填写） |
| groupID | string | 群聊必填 | 群组ID（群聊时填写） |
| clientMsgID | string | 是 | 客户端消息唯一ID，建议格式: `{sendID}_{timestamp}` |
| senderPlatformID | int32 | 是 | 发送者平台: 1=iOS, 2=Android, 5=Web |
| sessionType | int32 | 是 | 会话类型: 1=单聊, 2=群聊(写扩散，暂不支持)，3=群聊（读扩散），4=系统通知 |
| contentType | int32 | 是 | 消息内容类型: 101=文本, 102=图片等 |
| content | bytes | 是 | 消息内容，JSON 格式的字节数组 |
| createTime | int64 | 是 | 创建时间戳（毫秒） |
| options | map<string,bool> | 否 | 消息选项 |
| offlinePushInfo | OfflinePushInfo | 否 | 离线推送配置 |
| atUserIDList | []string | 否 | @的用户ID列表（群聊） |
| ex | string | 否 | 扩展字段 |

### 7.3 各类消息的 Content 格式

#### 文本消息 (contentType=101)
```json
{"text": "消息文本内容"}
```

#### 图片消息 (contentType=102)
```json
{
  "sourcePath": "原图路径",
  "sourcePicture": {
    "uuid": "唯一ID",
    "type": "png",
    "size": 12345,
    "width": 800,
    "height": 600,
    "url": "https://xxx/source.png"
  },
  "bigPicture": {
    "uuid": "唯一ID",
    "type": "png",
    "size": 8000,
    "width": 800,
    "height": 600,
    "url": "https://xxx/big.png"
  },
  "snapshotPicture": {
    "uuid": "唯一ID",
    "type": "png",
    "size": 2000,
    "width": 200,
    "height": 150,
    "url": "https://xxx/thumb.png"
  }
}
```

#### 语音消息 (contentType=103)
```json
{
  "uuid": "唯一ID",
  "soundPath": "语音文件路径",
  "sourceUrl": "https://xxx/voice.mp3",
  "dataSize": 12345,
  "duration": 5
}
```

#### 视频消息 (contentType=104)
```json
{
  "videoPath": "视频路径",
  "videoUUID": "唯一ID",
  "videoUrl": "https://xxx/video.mp4",
  "videoType": "mp4",
  "videoSize": 1234567,
  "duration": 30,
  "snapshotPath": "封面路径",
  "snapshotUUID": "封面唯一ID",
  "snapshotSize": 5000,
  "snapshotUrl": "https://xxx/cover.jpg",
  "snapshotWidth": 400,
  "snapshotHeight": 300
}
```

#### 文件消息 (contentType=105)
```json
{
  "filePath": "文件路径",
  "uuid": "唯一ID",
  "sourceUrl": "https://xxx/file.pdf",
  "fileName": "document.pdf",
  "fileSize": 102400
}
```

#### @消息 (contentType=106)
```json
{
  "text": "@张三 你好",
  "atUserList": ["user123"],
  "isAtSelf": false
}
```

#### 位置消息 (contentType=109)
```json
{
  "description": "北京市朝阳区xxx",
  "longitude": 116.397128,
  "latitude": 39.916527
}
```

#### 自定义消息 (contentType=110)
```json
{
  "data": "{\"key\":\"value\"}",
  "description": "自定义描述",
  "extension": "扩展信息"
}
```

#### 引用消息 (contentType=114)
```json
{
  "text": "回复内容",
  "quoteMessage": {
    "clientMsgID": "原消息ID",
    "sendID": "原发送者",
    "contentType": 101,
    "content": "{\"text\":\"原消息内容\"}"
  }
}
```

### 7.4 JavaScript 完整示例

```javascript
// ============ 1. 引入 protobuf.js ============
// npm install protobufjs
// 或使用 CDN: <script src="https://cdn.jsdelivr.net/npm/protobufjs/dist/protobuf.min.js"></script>

// ============ 2. 定义完整的 Protobuf Schema ============
const protoSchema = `
syntax = "proto3";

// 消息数据结构
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

// 发送消息响应
message SendMsgResp {
  string serverMsgID = 1;
  string clientMsgID = 2;
  int64 sendTime = 3;
  int64 seq = 4;           // 消息序列号
}

// 获取最新序列号请求
message GetMaxSeqReq {
  string userID = 1;
}

// 获取最新序列号响应
message GetMaxSeqResp {
  map<string, int64> maxSeqs = 1;
  map<string, int64> minSeqs = 2;
}

// 推送消息结构
message PushMessages {
  map<string, PullMsgs> msgs = 1;
  map<string, PullMsgs> notificationMsgs = 2;
}

message PullMsgs {
  repeated MsgData Msgs = 1;  // 注意: 大写 M
  bool isEnd = 2;
}

// 通知消息内容封装
message NotificationElem {
  string detail = 1;          // 通知详情 JSON 字符串
}

// 撤回消息通知
message RevokeMsgTips {
  string revokerUserID = 1;   // 撤回者用户ID
  string clientMsgID = 2;     // 被撤回消息的客户端ID
  int64 revokeTime = 3;       // 撤回时间戳（毫秒）
  // 字段 4 保留未使用
  int32 sesstionType = 5;     // 会话类型 (注意拼写: sesstionType)
  int64 seq = 6;              // 被撤回消息的序列号
  string conversationID = 7;  // 会话ID
  bool isAdminRevoke = 8;     // 是否管理员撤回
}
`;

// ============ 3. WebSocket 客户端类 ============
class KKIMWebSocket {
  constructor(config) {
    this.host = config.host;
    this.userID = config.userID;
    this.token = config.token;
    this.platformID = config.platformID || 5; // 5=Web
    this.ws = null;
    this.msgIncr = 0;
    this.callbacks = new Map();
    this.protoTypes = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectInterval = config.reconnectInterval || 3000;

    // 事件回调
    this.onConnected = config.onConnected || (() => {});
    this.onDisconnected = config.onDisconnected || (() => {});
    this.onMessage = config.onMessage || (() => {});
    this.onKickedOut = config.onKickedOut || (() => {});

    this.initProtobuf();
  }

  // 初始化 Protobuf
  async initProtobuf() {
    const root = protobuf.parse(protoSchema).root;
    this.protoTypes = {
      MsgData: root.lookupType("MsgData"),
      SendMsgResp: root.lookupType("SendMsgResp"),
      GetMaxSeqReq: root.lookupType("GetMaxSeqReq"),
      GetMaxSeqResp: root.lookupType("GetMaxSeqResp"),
      PushMessages: root.lookupType("PushMessages"),
      PullMsgs: root.lookupType("PullMsgs")
    };
  }

  // 生成唯一ID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Base64 解码
  base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // 连接 WebSocket
  connect() {
    const url = `ws://${this.host}/?sendID=${this.userID}&platformID=${this.platformID}&token=${this.token}&sdkType=js`;

    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log('[KKIM] WebSocket 连接成功');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onConnected();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (error) => {
      console.error('[KKIM] WebSocket 错误:', error);
    };

    this.ws.onclose = (event) => {
      console.log('[KKIM] WebSocket 连接关闭', event.code, event.reason);
      this.stopHeartbeat();
      this.onDisconnected();

      // 自动重连（非主动关闭时）
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[KKIM] ${this.reconnectInterval/1000}秒后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };
  }

  // 处理收到的消息
  handleMessage(data) {
    let message;
    if (data instanceof ArrayBuffer) {
      message = JSON.parse(new TextDecoder().decode(data));
    } else {
      message = JSON.parse(data);
    }

    console.log('[KKIM] 收到消息:', message);

    // 处理响应回调
    if (message.msgIncr && this.callbacks.has(message.msgIncr)) {
      const callback = this.callbacks.get(message.msgIncr);
      this.callbacks.delete(message.msgIncr);

      // 解码响应 data（Base64 -> Protobuf）
      if (message.data && message.errCode === 0) {
        message.decodedData = this.decodeResponseData(message.reqIdentifier, message.data);
      }
      callback(message);
    }

    // 处理服务端推送消息
    if (message.reqIdentifier === 2001) {
      this.handlePushMessage(message);
    }

    // 处理踢下线通知
    if (message.reqIdentifier === 2002) {
      console.warn('[KKIM] 收到踢下线通知，账号在其他设备登录');
      this.onKickedOut();
      this.disconnect();
    }

    // 处理登出通知
    if (message.reqIdentifier === 2003) {
      console.log('[KKIM] 收到登出通知');
      this.disconnect();
    }
  }

  // 解码响应 data 字段
  decodeResponseData(reqIdentifier, base64Data) {
    try {
      const bytes = this.base64ToUint8Array(base64Data);

      switch (reqIdentifier) {
        case 1001: // GetMaxSeq
          return this.protoTypes.GetMaxSeqResp.decode(bytes);
        case 1003: // SendMsg
          return this.protoTypes.SendMsgResp.decode(bytes);
        case 2001: // PushMsg
          return this.protoTypes.PushMessages.decode(bytes);
        default:
          return bytes;
      }
    } catch (e) {
      console.error('[KKIM] 解码响应数据失败:', e);
      return null;
    }
  }

  // 处理推送消息
  handlePushMessage(message) {
    if (!message.data) return;

    try {
      const bytes = this.base64ToUint8Array(message.data);
      const pushMessages = this.protoTypes.PushMessages.decode(bytes);

      // 处理普通消息
      if (pushMessages.msgs) {
        for (const [conversationID, pullMsgs] of Object.entries(pushMessages.msgs)) {
          for (const msg of pullMsgs.msgs || []) {
            const contentStr = new TextDecoder().decode(msg.content);
            console.log(`[KKIM] 收到新消息 [${conversationID}]:`, {
              sendID: msg.sendID,
              contentType: msg.contentType,
              content: contentStr,
              seq: msg.seq
            });

            // 触发消息回调
            this.onMessage({
              conversationID,
              msg: {
                ...msg,
                content: contentStr
              }
            });
          }
        }
      }

      // 处理通知消息
      if (pushMessages.notificationMsgs) {
        for (const [conversationID, pullMsgs] of Object.entries(pushMessages.notificationMsgs)) {
          for (const msg of pullMsgs.msgs || []) {
            console.log(`[KKIM] 收到通知 [${conversationID}]:`, msg.contentType);
          }
        }
      }
    } catch (e) {
      console.error('[KKIM] 解析推送消息失败:', e);
    }
  }

  // 发送请求
  sendRequest(reqIdentifier, protoData) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket 未连接'));
        return;
      }

      this.msgIncr++;
      const msgIncr = String(this.msgIncr);

      const req = {
        reqIdentifier: reqIdentifier,
        token: this.token,
        sendID: this.userID,
        operationID: this.generateUUID(),
        msgIncr: msgIncr,
        data: Array.from(protoData)  // 转为数组以便 JSON 序列化
      };

      // 设置超时
      const timeout = setTimeout(() => {
        this.callbacks.delete(msgIncr);
        reject(new Error('请求超时'));
      }, 30000);

      // 注册回调
      this.callbacks.set(msgIncr, (resp) => {
        clearTimeout(timeout);
        if (resp.errCode === 0) {
          resolve(resp);
        } else {
          reject(new Error(resp.errMsg || `请求失败 (errCode=${resp.errCode})`));
        }
      });

      // 以 Binary 类型发送
      const jsonStr = JSON.stringify(req);
      const encoder = new TextEncoder();
      this.ws.send(encoder.encode(jsonStr));
    });
  }

  // ============ 发送文本消息 ============
  async sendTextMessage(recvID, text, sessionType = 1) {
    const content = JSON.stringify({ text: text });

    const msgData = {
      sendID: this.userID,
      recvID: sessionType === 1 ? recvID : '',
      groupID: sessionType === 2 ? recvID : '',
      clientMsgID: `${this.userID}_${Date.now()}`,
      senderPlatformID: this.platformID,
      sessionType: sessionType,
      contentType: 101,
      content: new TextEncoder().encode(content),
      createTime: Date.now()
    };

    const errMsg = this.protoTypes.MsgData.verify(msgData);
    if (errMsg) throw new Error(errMsg);

    const protoData = this.protoTypes.MsgData.encode(
      this.protoTypes.MsgData.create(msgData)
    ).finish();

    const resp = await this.sendRequest(1003, protoData);

    // 返回解码后的响应
    return {
      serverMsgID: resp.decodedData?.serverMsgID,
      clientMsgID: resp.decodedData?.clientMsgID,
      sendTime: resp.decodedData?.sendTime
    };
  }

  // ============ 发送图片消息 ============
  async sendImageMessage(recvID, imageInfo, sessionType = 1) {
    const content = JSON.stringify({
      sourcePicture: imageInfo.sourcePicture,
      bigPicture: imageInfo.bigPicture,
      snapshotPicture: imageInfo.snapshotPicture
    });

    const msgData = {
      sendID: this.userID,
      recvID: sessionType === 1 ? recvID : '',
      groupID: sessionType === 2 ? recvID : '',
      clientMsgID: `${this.userID}_${Date.now()}`,
      senderPlatformID: this.platformID,
      sessionType: sessionType,
      contentType: 102,
      content: new TextEncoder().encode(content),
      createTime: Date.now()
    };

    const protoData = this.protoTypes.MsgData.encode(
      this.protoTypes.MsgData.create(msgData)
    ).finish();

    return this.sendRequest(1003, protoData);
  }

  // ============ 发送自定义消息 ============
  async sendCustomMessage(recvID, customData, sessionType = 1) {
    const content = JSON.stringify({
      data: typeof customData === 'string' ? customData : JSON.stringify(customData),
      description: '',
      extension: ''
    });

    const msgData = {
      sendID: this.userID,
      recvID: sessionType === 1 ? recvID : '',
      groupID: sessionType === 2 ? recvID : '',
      clientMsgID: `${this.userID}_${Date.now()}`,
      senderPlatformID: this.platformID,
      sessionType: sessionType,
      contentType: 110,
      content: new TextEncoder().encode(content),
      createTime: Date.now()
    };

    const protoData = this.protoTypes.MsgData.encode(
      this.protoTypes.MsgData.create(msgData)
    ).finish();

    return this.sendRequest(1003, protoData);
  }

  // ============ 获取最新消息序列号 ============
  async getMaxSeq() {
    const req = { userID: this.userID };
    const protoData = this.protoTypes.GetMaxSeqReq.encode(
      this.protoTypes.GetMaxSeqReq.create(req)
    ).finish();

    const resp = await this.sendRequest(1001, protoData);
    return resp.decodedData;  // { maxSeqs: {...}, minSeqs: {...} }
  }

  // ============ 心跳 ============
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 断开连接
  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // 阻止自动重连
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
  }

  // 检查连接状态
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// ============ 使用示例 ============
const client = new KKIMWebSocket({
  host: '192.168.1.100:10001',
  userID: 'alice123',
  token: 'your_jwt_token_here',

  // 事件回调
  onConnected: () => {
    console.log('已连接到服务器');
  },
  onDisconnected: () => {
    console.log('已断开连接');
  },
  onMessage: (data) => {
    console.log('收到新消息:', data.conversationID, data.msg);
  },
  onKickedOut: () => {
    alert('您的账号在其他设备登录，请重新登录');
  }
});

// 连接
client.connect();

// 发送文本消息（单聊）
client.sendTextMessage('bob456', '你好，这是一条测试消息')
  .then(result => {
    console.log('发送成功:', result);
    // result: { serverMsgID: "xxx", clientMsgID: "xxx", sendTime: 1234567890 }
  })
  .catch(err => console.error('发送失败:', err));

// 发送群聊消息
client.sendTextMessage('group123', '大家好', 2)
  .then(result => console.log('群消息发送成功:', result))
  .catch(err => console.error('群消息发送失败:', err));

// 获取最新消息序列号
client.getMaxSeq()
  .then(result => {
    console.log('各会话最新序列号:', result.maxSeqs);
  })
  .catch(err => console.error('获取失败:', err));
```

### 7.5 其他请求类型

#### 获取最新序列号 (reqIdentifier=1001)

请求 `data` 字段使用 `GetMaxSeqReq` Protobuf：

```protobuf
message GetMaxSeqReq {
  string userID = 1;
}
```

响应 `data` 字段为 `GetMaxSeqResp`：

```protobuf
message GetMaxSeqResp {
  map<string, int64> maxSeqs = 1;  // conversationID -> maxSeq
  map<string, int64> minSeqs = 2;  // conversationID -> minSeq
}
```

#### 按序列号拉取消息 (reqIdentifier=1002)

请求 `data` 字段使用 `PullMessageBySeqsReq`：

```protobuf
message PullMessageBySeqsReq {
  string userID = 1;
  repeated SeqRange seqRanges = 2;
  Order order = 3;  // 0=升序, 1=降序
}

message SeqRange {
  string conversationID = 1;
  int64 begin = 2;
  int64 end = 3;
  int64 num = 4;
}
```

#### 发送消息响应 (reqIdentifier=1003)

响应 `data` 字段为 `SendMsgResp`：

```protobuf
message SendMsgResp {
  string serverMsgID = 1;   // 服务端消息ID
  string clientMsgID = 2;   // 客户端消息ID
  int64 sendTime = 3;       // 发送时间戳（毫秒）
}
```

**解码示例**（之前的响应）：
```
data: "CiA0ZmFiZTI1MzViNzkxMjljYjAwNzhjMWQwZGRkZjE1NRIWYWxpY2UxMjRfMTc2NjYzMDA4NDYzMhjToO+atTM="

解码后:
- serverMsgID: 4fabe2535b79129cb0078c1d0dddf155
- clientMsgID: alice124_1766630084632
- sendTime: 1766630084563 (时间戳)
```

### 7.6 服务端推送消息 (reqIdentifier=2001)

服务端会主动推送新消息，`data` 字段为 `PushMessages`（Base64 编码）：

```protobuf
message PushMessages {
  map<string, PullMsgs> msgs = 1;             // 普通消息
  map<string, PullMsgs> notificationMsgs = 2; // 通知消息
}

message PullMsgs {
  repeated MsgData Msgs = 1;  // 注意: 大写 M
  bool isEnd = 2;
}
```

> **处理流程**: 收到推送 → Base64 解码 → Protobuf 解码 → 解析 MsgData
>
> 完整处理代码请参考上方 `KKIMWebSocket` 类中的 `handlePushMessage` 方法。

### 7.7 撤回消息通知处理 (contentType=2101)

当有消息被撤回时，服务端会推送 `contentType=2101` 的通知消息。

#### 数据解析流程

```
PushMessages.notificationMsgs
    │
    ▼
MsgData (contentType=2101)
    │
    ▼ TextDecoder.decode(content)
NotificationElem { detail: "{...}" }
    │
    ▼ JSON.parse(detail)
RevokeMsgTips {
  revokerUserID: "user1",
  clientMsgID: "xxx",
  seq: 123,
  conversationID: "si_user1_user2",
  revokeTime: 1703580000000,
  sesstionType: 1,
  isAdminRevoke: false
}
```

#### RevokeMsgTips 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| revokerUserID | string | 执行撤回操作的用户ID |
| clientMsgID | string | 被撤回消息的客户端消息ID |
| revokeTime | int64 | 撤回时间戳（毫秒） |
| sesstionType | int32 | 会话类型 (1=单聊, 3=群聊) **注意拼写** |
| seq | int64 | 被撤回消息的序列号 |
| conversationID | string | 会话ID |
| isAdminRevoke | bool | 是否为管理员/群主撤回 |

#### JavaScript 处理示例

```javascript
// 在 handlePushMessage 方法中添加撤回消息处理
handlePushMessage(message) {
  const bytes = this.base64ToUint8Array(message.data);
  const pushMessages = this.protoTypes.PushMessages.decode(bytes);

  // 处理通知消息
  if (pushMessages.notificationMsgs) {
    for (const [conversationID, pullMsgs] of Object.entries(pushMessages.notificationMsgs)) {
      for (const msg of pullMsgs.Msgs || []) {
        // 判断是否为撤回消息通知
        if (msg.contentType === 2101) {
          this.handleRevokeNotification(msg, conversationID);
        }
      }
    }
  }
}

// 处理撤回消息通知
handleRevokeNotification(msgData, conversationID) {
  try {
    // 1. 解析 content 得到 NotificationElem
    const contentStr = new TextDecoder().decode(msgData.content);
    const notificationElem = JSON.parse(contentStr);

    // 2. 解析 detail 得到 RevokeMsgTips
    const revokeTips = JSON.parse(notificationElem.detail);

    console.log('收到撤回通知:', {
      会话ID: revokeTips.conversationID,
      被撤回消息序号: revokeTips.seq,
      被撤回消息ID: revokeTips.clientMsgID,
      撤回者: revokeTips.revokerUserID,
      是否管理员撤回: revokeTips.isAdminRevoke,
      撤回时间: new Date(revokeTips.revokeTime)
    });

    // 3. 更新 UI - 根据 seq 找到对应消息并标记为已撤回
    this.onMessageRevoked && this.onMessageRevoked(revokeTips);

  } catch (error) {
    console.error('解析撤回通知失败:', error);
  }
}

// UI 更新示例
onMessageRevoked(tips) {
  // 在消息列表中找到被撤回的消息
  const message = this.findMessageBySeq(tips.conversationID, tips.seq);
  if (message) {
    message.isRevoked = true;
    message.revokeInfo = tips;

    // 根据撤回者显示不同文案
    if (tips.isAdminRevoke) {
      message.displayText = '管理员撤回了一条消息';
    } else if (tips.revokerUserID === this.currentUserID) {
      message.displayText = '你撤回了一条消息';
    } else {
      message.displayText = '对方撤回了一条消息';
    }

    // 触发 UI 刷新
    this.refreshMessageList(tips.conversationID);
  }
}
```

#### 注意事项

1. **字段拼写**: proto 中 `sesstionType` 多了一个 `s`，不是 `sessionType`
2. **查找被撤回消息**: 优先使用 `seq` + `conversationID` 定位，比 `clientMsgID` 更可靠
3. **Proto 版本一致**: 如果解析报 `RangeError`，说明前端 proto 文件与服务端不一致

### 7.8 踢下线和登出通知

| reqIdentifier | 说明 | 处理方式 |
|---------------|------|---------|
| 2002 | 踢下线通知（账号在其他设备登录） | 提示用户重新登录，断开连接 |
| 2003 | 登出通知 | 清理本地状态，断开连接 |

### 7.9 常见错误码

| errCode | 说明 | 处理建议 |
|---------|------|---------|
| 0 | 成功 | - |
| 1001 | Token 过期 | 重新登录获取新 Token |
| 1002 | Token 无效 | 检查 Token 格式 |
| 1003 | 用户不存在 | 检查 userID |
| 1004 | 发送者与接收者相同 | 不允许给自己发消息 |
| 1101 | 消息内容为空 | 检查 content 字段 |
| 1102 | 消息过大 | 消息超过 50KB 限制 |

## 8. 重要说明

1. **消息类型**: 业务消息必须以 **Binary 类型** 发送，不是 Text 类型
2. **请求 Data 字段**: 发送时是 Protobuf 编码后的 **字节数组**（JSON 中为数字数组）
3. **响应 Data 字段**: 响应中是 **Base64 编码的字符串**，需先解码再解析 Protobuf
4. **消息大小限制**: 最大 51200 字节 (50KB)
5. **连接超时**: 30秒无消息会断开连接，需保持心跳（建议 25 秒间隔）
6. **sdkType 参数**: Web 端必须设置 `sdkType=js`，否则服务端使用 Gob 编码
7. **clientMsgID**: 必须保证唯一性，建议使用 `{userID}_{timestamp}` 格式
8. **Protobuf 库**: 推荐使用 [protobufjs](https://github.com/protobufjs/protobuf.js)
9. **重连机制**: 建议实现自动重连，非正常断开时自动尝试重连
10. **Token 刷新**: Token 过期后需重新登录获取，建议在过期前主动刷新

## 9. 快速检查清单

对接前请确认以下要点：

- [ ] WebSocket URL 中包含 `sdkType=js` 参数
- [ ] 使用 Binary 类型发送业务消息
- [ ] 实现了 25 秒间隔的心跳机制
- [ ] 正确处理了响应 data 的 Base64 解码
- [ ] 处理了踢下线通知 (2002) 和登出通知 (2003)
- [ ] clientMsgID 使用唯一值
- [ ] 实现了断线重连机制
