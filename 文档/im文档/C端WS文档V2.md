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

### 5.3 消息状态 (Status)

| Status值 | 常量名               | 含义       | 前端处理建议 |
|----------|----------------------|------------|--------------|
| 0        | MsgStatusNotExist    | 消息不存在 | 不显示该消息 |
| 1        | MsgStatusSending     | 发送中     | 显示发送中状态（loading图标） |
| 2        | MsgStatusSendSuccess | 发送成功   | 正常显示消息 |
| 3        | MsgStatusSendFailed  | 发送失败   | 显示发送失败，提供重发按钮 |
| 4        | MsgStatusHasDeleted  | 已删除     | 不显示或显示"消息已删除" |
| 5        | MsgStatusFiltered    | 已过滤     | 不显示或显示"消息已被过滤" |

> **注意**:
> - `status=1` 表示发送中，不是正常状态
> - `status=2` 才是发送成功的正常消息
> - 撤回消息通过 `contentType=2101` 通知来标识，不是通过 status 字段

## 6. 会话类型 (SessionType)

| 值 | 说明       |
|----|----------|
| 1 | 单聊       |
| 2 | 群聊(暂不支持) |
| 3 | 超级群      |
| 4 | 通知会话     |

## 7. 前端消息收发详细对接

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

### 7.2 接收消息完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│  1. 监听 WebSocket onmessage 事件                                 │
│     收到 reqIdentifier=2001 的推送消息                            │
├─────────────────────────────────────────────────────────────────┤
│  2. 解析 JSON 获取 data 字段                                      │
│     data 是 Base64 编码的字符串                                   │
├─────────────────────────────────────────────────────────────────┤
│  3. Base64 解码 → 二进制数据                                      │
├─────────────────────────────────────────────────────────────────┤
│  4. Protobuf 解码 → PushMessages 对象                             │
│     包含: msgs (普通消息), notificationMsgs (通知消息)             │
├─────────────────────────────────────────────────────────────────┤
│  5. 遍历 PushMessages.msgs 获取 MsgData 数组                      │
├─────────────────────────────────────────────────────────────────┤
│  6. 解析 MsgData.content (bytes → JSON字符串)                     │
│     根据 contentType 解析不同的消息内容                            │
├─────────────────────────────────────────────────────────────────┤
│  7. 根据 status 判断消息状态，更新 UI                              │
└─────────────────────────────────────────────────────────────────┘
```

#### 接收消息 MsgData 完整字段说明

| 字段 | 类型 | Protobuf编号 | 说明 |
|------|------|--------------|------|
| sendID | string | 1 | 发送者用户ID |
| recvID | string | 2 | 接收者用户ID（单聊时有值） |
| groupID | string | 3 | 群组ID（群聊时有值） |
| clientMsgID | string | 4 | 客户端消息唯一ID |
| serverMsgID | string | 5 | 服务端消息唯一ID |
| senderPlatformID | int32 | 6 | 发送者平台ID（见第2章） |
| senderNickname | string | 7 | 发送者昵称 |
| senderFaceURL | string | 8 | 发送者头像URL |
| sessionType | int32 | 9 | 会话类型：1=单聊, 3=超级群, 4=通知 |
| msgFrom | int32 | 10 | 消息来源：100=用户消息, 200=系统消息 |
| contentType | int32 | 11 | 消息内容类型（见第5章） |
| content | bytes | 12 | 消息内容（JSON格式的字节数组） |
| seq | int64 | 14 | 消息序列号（会话内唯一递增） |
| sendTime | int64 | 15 | 服务端发送时间戳（毫秒） |
| createTime | int64 | 16 | 消息创建时间戳（毫秒） |
| **status** | **int32** | **17** | **消息状态（见5.3章节）** |
| isRead | bool | 18 | 是否已读 |
| options | map<string,bool> | 19 | 消息选项 |
| offlinePushInfo | OfflinePushInfo | 20 | 离线推送配置 |
| atUserIDList | []string | 21 | @的用户ID列表 |
| attachedInfo | string | 22 | 附加信息 |
| ex | string | 23 | 扩展字段 |

#### 接收消息示例 (JSON 格式展示)

```json
{
  "sendID": "user123",
  "recvID": "user456",
  "groupID": "",
  "clientMsgID": "user123_1703580000000",
  "serverMsgID": "4fabe2535b79129cb0078c1d0dddf155",
  "senderPlatformID": 5,
  "senderNickname": "张三",
  "senderFaceURL": "https://xxx/avatar.jpg",
  "sessionType": 1,
  "msgFrom": 100,
  "contentType": 101,
  "content": "{\"text\":\"你好\"}",
  "seq": 123,
  "sendTime": 1703580000000,
  "createTime": 1703579999000,
  "status": 2,
  "isRead": false,
  "options": {},
  "atUserIDList": [],
  "attachedInfo": "",
  "ex": ""
}
```

#### 前端消息状态判断逻辑

```javascript
function getMessageDisplayInfo(msg) {
  // 1. 检查消息状态
  switch (msg.status) {
    case 0: // MsgStatusNotExist
      return { show: false, reason: '消息不存在' };
    case 1: // MsgStatusSending
      return { show: true, status: 'sending', text: '发送中...' };
    case 2: // MsgStatusSendSuccess
      return { show: true, status: 'success' };
    case 3: // MsgStatusSendFailed
      return { show: true, status: 'failed', text: '发送失败', canRetry: true };
    case 4: // MsgStatusHasDeleted
      return { show: false, reason: '消息已删除' };
    case 5: // MsgStatusFiltered
      return { show: false, reason: '消息已过滤' };
  }

  // 2. 检查是否被撤回（需要本地维护撤回状态）
  if (msg.isRevoked) {
    if (msg.revokeInfo.isAdminRevoke) {
      return { show: true, status: 'revoked', text: '管理员撤回了一条消息' };
    } else if (msg.revokeInfo.revokerUserID === currentUserID) {
      return { show: true, status: 'revoked', text: '你撤回了一条消息' };
    } else {
      return { show: true, status: 'revoked', text: '对方撤回了一条消息' };
    }
  }

  // 3. 正常显示消息
  return { show: true, status: 'normal' };
}
```

#### 前端本地存储建议

```javascript
// 消息存储结构
const messageStore = {
  // 按会话ID分组存储
  conversations: {
    "si_user123_user456": {
      messages: [
        {
          // ... MsgData 原始字段 ...

          // 前端额外维护的字段
          isRevoked: false,        // 是否被撤回
          revokeInfo: null,        // 撤回信息 (RevokeMsgTips)
          localStatus: 'success',  // 本地状态：sending/success/failed
          retryCount: 0            // 重试次数
        }
      ],
      maxSeq: 123,
      minSeq: 1
    }
  }
};

// 收到撤回通知时更新本地消息
function handleRevokeNotification(revokeTips) {
  const conversation = messageStore.conversations[revokeTips.conversationID];
  if (!conversation) return;

  const msg = conversation.messages.find(m => m.seq === revokeTips.seq);
  if (msg) {
    msg.isRevoked = true;
    msg.revokeInfo = revokeTips;
  }
}
```

### 7.3 发送消息 MsgData 结构 (Protobuf)

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

### 7.4 各类消息的 Content 格式

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

### 7.5 JavaScript 完整示例

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

### 7.6 其他请求类型

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

### 7.7 服务端推送消息 (reqIdentifier=2001)

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
> 完整字段说明和处理逻辑请参考 **7.2 接收消息完整流程** 章节。

### 7.8 撤回消息通知处理 (contentType=2101)

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

### 7.9 踢下线和登出通知

| reqIdentifier | 说明 | 处理方式 |
|---------------|------|---------|
| 2002 | 踢下线通知（账号在其他设备登录） | 提示用户重新登录，断开连接 |
| 2003 | 登出通知 | 清理本地状态，断开连接 |

### 7.10 常见错误码

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

---

## 10. 音视频通话 (RTC) 对接

本章详细介绍音视频通话功能的前端对接，包括信令协议、WebRTC连接建立、完整代码示例等。

### 10.1 概述

KKIM 音视频通话基于 WebRTC 技术实现，通过 WebSocket 信令通道传递呼叫控制消息。整体架构如下：

```
┌─────────────┐                    ┌─────────────┐
│   客户端A   │                    │   客户端B   │
│  (主叫方)   │                    │  (被叫方)   │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │    ┌───────────────────────┐     │
       │    │    KKIM 服务端        │     │
       │    │  (信令中转/状态管理)   │     │
       └────┤                       ├─────┘
            └───────────────────────┘
                      │
            ┌─────────┴─────────┐
            │   STUN/TURN 服务器  │
            │  (NAT穿透/媒体中继)  │
            └───────────────────┘
```

**核心流程**：
1. 主叫方通过 WebSocket 发送邀请信令 (reqIdentifier=1004)
2. 服务端转发邀请给被叫方 (推送消息 contentType=1601)
3. 被叫方接听后，双方建立 WebRTC 点对点连接
4. 通过 ICE 候选协商完成 NAT 穿透
5. 音视频流直接在客户端之间传输

### 10.2 信令协议

#### 10.2.1 协议标识符

| 标识符 | 值 | 方向 | 说明 |
|--------|-----|------|------|
| WSSendSignalMsg | 1004 | Client→Server | 发送RTC信令消息 |
| WSPushMsg | 2001 | Server→Client | 服务端推送（包含RTC通知） |

#### 10.2.2 信令消息类型

| 消息类型 | 说明 | 触发场景 |
|----------|------|---------|
| Invite | 发起邀请 | 主叫方点击"发起通话" |
| Accept | 接受邀请 | 被叫方点击"接听" |
| Reject | 拒绝邀请 | 被叫方点击"拒绝" |
| Cancel | 取消邀请 | 主叫方在对方接听前取消 |
| HungUp | 挂断通话 | 任一方在通话中挂断 |

#### 10.2.3 推送消息 ContentType

| ContentType | 说明 |
|-------------|------|
| 1601 | RTC信令通知（来电邀请等） |
| 110 | 自定义消息（WebRTC信令交换） |

### 10.3 Protobuf 消息结构

#### 10.3.1 InvitationInfo (邀请信息)

```protobuf
message InvitationInfo {
  string inviterUserID = 1;           // 邀请者用户ID
  repeated string inviteeUserIDList = 2; // 被邀请者用户ID列表
  string customData = 3;              // 自定义数据
  string groupID = 4;                 // 群组ID（群通话时填写）
  string roomID = 5;                  // 房间ID
  int32 timeout = 6;                  // 超时时间（秒），默认60
  string mediaType = 7;               // 媒体类型: "video" 或 "audio"
  int32 platformID = 8;               // 平台ID（5=Web）
  int32 sessionType = 9;              // 会话类型: 1=单聊, 2=群聊
  int64 initiateTime = 10;            // 发起时间戳（毫秒）
}
```

#### 10.3.2 SignalReq (信令请求 - 发送)

信令请求是一个 oneof 结构，根据操作类型选择不同字段：

```protobuf
message SignalReq {
  oneof payload {
    SignalInviteReq invite = 1;           // 发起邀请
    SignalInviteInGroupReq inviteInGroup = 2; // 群内邀请
    SignalCancelReq cancel = 3;           // 取消邀请
    SignalAcceptReq accept = 4;           // 接受邀请
    SignalHungUpReq hungUp = 5;           // 挂断
    SignalRejectReq reject = 6;           // 拒绝邀请
  }
}

message SignalInviteReq {
  InvitationInfo invitation = 1;          // 邀请信息
  OfflinePushInfo offlinePushInfo = 2;    // 离线推送（可选）
  ParticipantMetaData participant = 3;    // 参与者元数据
  string userID = 4;                      // 操作者用户ID
}

message SignalAcceptReq {
  InvitationInfo invitation = 1;
  ParticipantMetaData participant = 3;
  int32 opUserPlatformID = 4;             // 操作者平台ID
  string userID = 5;
}

message SignalRejectReq {
  InvitationInfo invitation = 1;
  ParticipantMetaData participant = 3;
  int32 opUserPlatformID = 4;
  string userID = 5;
}

message SignalCancelReq {
  InvitationInfo invitation = 1;
  ParticipantMetaData participant = 3;
  string userID = 4;
}

message SignalHungUpReq {
  InvitationInfo invitation = 1;
  string userID = 3;
}

message ParticipantMetaData {
  UserInfo userInfo = 3;                  // 用户信息
}

message UserInfo {
  string userID = 1;
  string nickname = 2;
}
```

#### 10.3.3 SignalResp (信令响应 - 接收)

```protobuf
message SignalResp {
  oneof payload {
    SignalInviteResp invite = 1;          // 邀请响应
    SignalInviteInGroupResp inviteInGroup = 2;
    SignalCancelResp cancel = 3;
    SignalAcceptResp accept = 4;
    SignalHungUpResp hungUp = 5;
    SignalRejectResp reject = 6;
  }
}

message SignalInviteResp {
  string token = 1;                       // 媒体服务器Token
  string roomID = 2;                      // 房间ID（服务端分配）
  string liveURL = 3;                     // 直播URL（可选）
}

message SignalAcceptResp {
  string token = 1;
  string roomID = 2;
  string liveURL = 3;
}
```

### 10.4 完整通话流程

#### 10.4.1 发起通话流程

```
┌───────────────────────────────────────────────────────────────────────────┐
│  主叫方 (Alice)                服务端                    被叫方 (Bob)      │
├───────────────────────────────────────────────────────────────────────────┤
│       │                          │                           │            │
│       │  1. 获取本地媒体流        │                           │            │
│       │  navigator.getUserMedia  │                           │            │
│       │                          │                           │            │
│       │  2. 发送邀请信令          │                           │            │
│       │ ─────────────────────────►│                           │            │
│       │  reqIdentifier=1004       │                           │            │
│       │  SignalReq.invite         │                           │            │
│       │                          │                           │            │
│       │  3. 响应(包含roomID)      │                           │            │
│       │ ◄─────────────────────────│                           │            │
│       │  SignalResp.invite        │                           │            │
│       │  { roomID: "xxx" }        │                           │            │
│       │                          │                           │            │
│       │                          │  4. 推送来电通知           │            │
│       │                          │ ─────────────────────────►│            │
│       │                          │  contentType=1601          │            │
│       │                          │  SignalInviteReq           │            │
│       │                          │                           │            │
│       │                          │                  显示来电UI │            │
│       │                          │                  播放铃声   │            │
│       │                          │                           │            │
└───────────────────────────────────────────────────────────────────────────┘
```

#### 10.4.2 接听通话流程

```
┌───────────────────────────────────────────────────────────────────────────┐
│  主叫方 (Alice)                服务端                    被叫方 (Bob)      │
├───────────────────────────────────────────────────────────────────────────┤
│       │                          │                           │            │
│       │                          │  1. 获取本地媒体流         │            │
│       │                          │                           │            │
│       │                          │  2. 发送接受信令           │            │
│       │                          │ ◄─────────────────────────│            │
│       │                          │  SignalReq.accept          │            │
│       │                          │                           │            │
│       │                          │  3. 响应                   │            │
│       │                          │ ─────────────────────────►│            │
│       │                          │  SignalResp.accept         │            │
│       │                          │                           │            │
│       │  4. 推送接听通知          │                           │            │
│       │ ◄─────────────────────────│                           │            │
│       │  对方已接听               │                           │            │
│       │                          │                           │            │
│       │  5. 创建 WebRTC Offer     │                           │            │
│       │ ─────────────────────────────────────────────────────►│            │
│       │  contentType=110 (自定义消息)                         │            │
│       │  { type: "webrtc_signal", signalType: "offer" }       │            │
│       │                          │                           │            │
│       │  6. 返回 Answer           │                           │            │
│       │ ◄─────────────────────────────────────────────────────│            │
│       │  { signalType: "answer" }│                           │            │
│       │                          │                           │            │
│       │  7. ICE候选交换           │                           │            │
│       │ ◄────────────────────────────────────────────────────►│            │
│       │  { signalType: "candidate" }                          │            │
│       │                          │                           │            │
│       │  8. WebRTC连接建立        │                           │            │
│       │ ◄═══════════════════════════════════════════════════►│            │
│       │  音视频流直接传输          │                           │            │
│       │                          │                           │            │
└───────────────────────────────────────────────────────────────────────────┘
```

#### 10.4.3 拒绝/取消/挂断流程

```
拒绝通话：
  被叫方 → SignalReq.reject → 服务端 → 推送给主叫方 → 主叫方清理资源

取消呼叫：
  主叫方 → SignalReq.cancel → 服务端 → 推送给被叫方 → 被叫方关闭来电UI

挂断通话：
  任一方 → SignalReq.hungUp → 服务端 → 推送给对方 → 双方清理WebRTC连接
```

### 10.5 JavaScript 完整实现

#### 10.5.1 状态管理

```javascript
// RTC 状态管理
const rtcState = {
  status: 'idle',           // 状态: idle, calling, ringing, connected
  roomID: null,             // 房间ID（服务端分配）
  inviterUserID: null,      // 主叫方用户ID
  inviteeUserID: null,      // 被叫方用户ID
  mediaType: 'video',       // 媒体类型: video 或 audio
  invitation: null,         // 当前邀请信息 (InvitationInfo)
  localStream: null,        // 本地媒体流
  remoteStream: null,       // 远端媒体流
  peerConnection: null,     // WebRTC PeerConnection
  callStartTime: null,      // 通话开始时间
  callDurationTimer: null   // 通话计时器
};
```

#### 10.5.2 ICE 服务器配置

```javascript
// ICE 服务器配置（STUN + TURN）
// 注意：生产环境应使用自己部署的 TURN 服务器
const iceServers = [
  // STUN 服务器（用于简单NAT场景）
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },

  // TURN 服务器（用于对称NAT/防火墙场景，必须配置！）
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];
```

> **重要**：
> - STUN 服务器用于发现公网IP，适用于简单NAT场景
> - TURN 服务器用于媒体中继，适用于对称NAT或防火墙场景
> - 如果只配置 STUN 而不配置 TURN，在复杂网络环境下会导致"能接通但看不到对方画面"

#### 10.5.3 Protobuf 编码器

```javascript
// Protobuf 编码器
class ProtobufEncoder {
  constructor() {
    this.buffer = [];
  }

  writeVarint(value) {
    value = value >>> 0;
    while (value > 0x7f) {
      this.buffer.push((value & 0x7f) | 0x80);
      value >>>= 7;
    }
    this.buffer.push(value);
  }

  writeVarint64(value) {
    let bigValue = BigInt(value);
    while (bigValue > 0x7fn) {
      this.buffer.push(Number((bigValue & 0x7fn) | 0x80n));
      bigValue >>= 7n;
    }
    this.buffer.push(Number(bigValue));
  }

  writeString(fieldNumber, value) {
    if (!value) return;
    const bytes = new TextEncoder().encode(value);
    this.writeVarint((fieldNumber << 3) | 2);
    this.writeVarint(bytes.length);
    this.buffer.push(...bytes);
  }

  writeBytes(fieldNumber, value) {
    if (!value || value.length === 0) return;
    this.writeVarint((fieldNumber << 3) | 2);
    this.writeVarint(value.length);
    this.buffer.push(...value);
  }

  writeInt32(fieldNumber, value) {
    if (value === 0) return;
    this.writeVarint((fieldNumber << 3) | 0);
    this.writeVarint(value);
  }

  writeInt64(fieldNumber, value) {
    if (value === 0) return;
    this.writeVarint((fieldNumber << 3) | 0);
    this.writeVarint64(value);
  }

  finish() {
    return new Uint8Array(this.buffer);
  }
}
```

#### 10.5.4 信令消息编码

```javascript
// 编码 InvitationInfo
function encodeInvitationInfo(info) {
  const encoder = new ProtobufEncoder();
  encoder.writeString(1, info.inviterUserID);       // field 1
  if (info.inviteeUserIDList) {
    for (const userID of info.inviteeUserIDList) {
      encoder.writeString(2, userID);               // field 2 (repeated)
    }
  }
  if (info.customData) encoder.writeString(3, info.customData);
  if (info.groupID) encoder.writeString(4, info.groupID);
  if (info.roomID) encoder.writeString(5, info.roomID);
  encoder.writeInt32(6, info.timeout || 60);        // field 6
  encoder.writeString(7, info.mediaType || 'video'); // field 7
  encoder.writeInt32(8, info.platformID || 5);      // field 8
  encoder.writeInt32(9, info.sessionType || 1);     // field 9
  encoder.writeInt64(10, info.initiateTime || Date.now()); // field 10
  return encoder.finish();
}

// 编码 ParticipantMetaData
function encodeParticipantMetaData(meta) {
  const encoder = new ProtobufEncoder();
  if (meta.userInfo) {
    const userInfoEncoder = new ProtobufEncoder();
    userInfoEncoder.writeString(1, meta.userInfo.userID || '');
    userInfoEncoder.writeString(2, meta.userInfo.nickname || '');
    encoder.writeBytes(3, userInfoEncoder.finish()); // field 3: userInfo
  }
  return encoder.finish();
}

// 编码 SignalInviteReq
function encodeSignalInviteReq(req) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(1, encodeInvitationInfo(req.invitation)); // field 1
  if (req.participant) {
    encoder.writeBytes(3, encodeParticipantMetaData(req.participant)); // field 3
  }
  encoder.writeString(4, req.userID); // field 4
  return encoder.finish();
}

// 编码 SignalReq (invite)
function encodeSignalReqInvite(inviteReq) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(1, encodeSignalInviteReq(inviteReq)); // oneof field 1: invite
  return encoder.finish();
}

// 编码 SignalAcceptReq
function encodeSignalAcceptReq(req) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(1, encodeInvitationInfo(req.invitation));
  if (req.participant) {
    encoder.writeBytes(3, encodeParticipantMetaData(req.participant));
  }
  encoder.writeInt32(4, req.opUserPlatformID || 5);
  encoder.writeString(5, req.userID);
  return encoder.finish();
}

// 编码 SignalReq (accept)
function encodeSignalReqAccept(acceptReq) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(4, encodeSignalAcceptReq(acceptReq)); // oneof field 4: accept
  return encoder.finish();
}

// 编码 SignalRejectReq
function encodeSignalRejectReq(req) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(1, encodeInvitationInfo(req.invitation));
  if (req.participant) {
    encoder.writeBytes(3, encodeParticipantMetaData(req.participant));
  }
  encoder.writeInt32(4, req.opUserPlatformID || 5);
  encoder.writeString(5, req.userID);
  return encoder.finish();
}

// 编码 SignalReq (reject)
function encodeSignalReqReject(rejectReq) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(6, encodeSignalRejectReq(rejectReq)); // oneof field 6: reject
  return encoder.finish();
}

// 编码 SignalCancelReq
function encodeSignalCancelReq(req) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(1, encodeInvitationInfo(req.invitation));
  if (req.participant) {
    encoder.writeBytes(3, encodeParticipantMetaData(req.participant));
  }
  encoder.writeString(4, req.userID);
  return encoder.finish();
}

// 编码 SignalReq (cancel)
function encodeSignalReqCancel(cancelReq) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(3, encodeSignalCancelReq(cancelReq)); // oneof field 3: cancel
  return encoder.finish();
}

// 编码 SignalHungUpReq
function encodeSignalHungUpReq(req) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(1, encodeInvitationInfo(req.invitation));
  encoder.writeString(3, req.userID);
  return encoder.finish();
}

// 编码 SignalReq (hungUp)
function encodeSignalReqHungUp(hungUpReq) {
  const encoder = new ProtobufEncoder();
  encoder.writeBytes(5, encodeSignalHungUpReq(hungUpReq)); // oneof field 5: hungUp
  return encoder.finish();
}
```

#### 10.5.5 Protobuf 解码器

```javascript
// Protobuf 解码器
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
    return new TextDecoder().decode(this.readBytes(length));
  }
}
```

#### 10.5.6 信令响应解码

```javascript
// 解码 InvitationInfo（来电通知中包含）
function decodeInvitationInfo(bytes) {
  const decoder = new ProtobufDecoder(bytes);
  const result = {
    inviterUserID: '',
    inviteeUserIDList: [],
    roomID: '',
    timeout: 60,
    mediaType: 'video',
    platformID: 0,
    sessionType: 1
  };

  while (decoder.hasMore()) {
    const tag = decoder.readVarint();
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x7;

    switch (fieldNumber) {
      case 1: result.inviterUserID = decoder.readString(decoder.readVarint()); break;
      case 2: result.inviteeUserIDList.push(decoder.readString(decoder.readVarint())); break;
      case 3: decoder.readString(decoder.readVarint()); break; // customData (跳过)
      case 4: decoder.readString(decoder.readVarint()); break; // groupID (跳过)
      case 5: result.roomID = decoder.readString(decoder.readVarint()); break;
      case 6: result.timeout = decoder.readVarint(); break;
      case 7: result.mediaType = decoder.readString(decoder.readVarint()); break;
      case 8: result.platformID = decoder.readVarint(); break;
      case 9: result.sessionType = decoder.readVarint(); break;
      case 10: decoder.readVarint(); break; // initiateTime (跳过)
      default:
        if (wireType === 0) decoder.readVarint();
        else if (wireType === 2) decoder.readBytes(decoder.readVarint());
    }
  }
  return result;
}

// 解码 SignalInviteReq（服务端推送的来电通知）
function decodeSignalInviteReq(bytes) {
  const decoder = new ProtobufDecoder(bytes);
  const result = { invitation: null, participant: null, userID: '' };

  while (decoder.hasMore()) {
    const tag = decoder.readVarint();
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x7;

    switch (fieldNumber) {
      case 1: // invitation (InvitationInfo)
        result.invitation = decodeInvitationInfo(decoder.readBytes(decoder.readVarint()));
        break;
      case 2: // offlinePushInfo (跳过)
      case 3: // participant (跳过)
        decoder.readBytes(decoder.readVarint());
        break;
      case 4: // userID
        result.userID = decoder.readString(decoder.readVarint());
        break;
      default:
        if (wireType === 0) decoder.readVarint();
        else if (wireType === 2) decoder.readBytes(decoder.readVarint());
    }
  }
  return result;
}

// 解码 SignalInviteResp
function decodeSignalInviteResp(bytes) {
  const decoder = new ProtobufDecoder(bytes);
  const result = { token: '', roomID: '', liveURL: '' };

  while (decoder.hasMore()) {
    const tag = decoder.readVarint();
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x7;

    switch (fieldNumber) {
      case 1: result.token = decoder.readString(decoder.readVarint()); break;
      case 2: result.roomID = decoder.readString(decoder.readVarint()); break;
      case 3: result.liveURL = decoder.readString(decoder.readVarint()); break;
      default:
        if (wireType === 0) decoder.readVarint();
        else if (wireType === 2) decoder.readBytes(decoder.readVarint());
    }
  }
  return result;
}

// 解码 SignalResp（发送信令后的响应）
function decodeSignalResp(base64Data) {
  const bytes = base64ToUint8Array(base64Data);
  const decoder = new ProtobufDecoder(bytes);
  const result = { type: null, data: null };

  while (decoder.hasMore()) {
    const tag = decoder.readVarint();
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x7;

    if (wireType === 2) {
      const data = decoder.readBytes(decoder.readVarint());
      switch (fieldNumber) {
        case 1: result.type = 'invite'; result.data = decodeSignalInviteResp(data); break;
        case 2: result.type = 'inviteInGroup'; result.data = decodeSignalInviteResp(data); break;
        case 3: result.type = 'cancel'; result.data = {}; break;
        case 4: result.type = 'accept'; result.data = decodeSignalInviteResp(data); break;
        case 5: result.type = 'hungUp'; result.data = {}; break;
        case 6: result.type = 'reject'; result.data = {}; break;
      }
    } else if (wireType === 0) {
      decoder.readVarint();
    }
  }
  return result;
}
```

#### 10.5.7 发送信令消息

```javascript
// 发送 RTC 信令消息
function sendSignalMessage(signalReqData) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket 未连接');
    return;
  }

  const req = {
    reqIdentifier: 1004,  // RTC 信令标识
    token: token,
    sendID: userID,
    operationID: generateUUID(),
    msgIncr: String(++msgIncr),
    data: uint8ArrayToBase64(signalReqData)  // Base64 编码
  };

  const reqJson = JSON.stringify(req);
  console.log('[RTC] 发送信令:', req.msgIncr);

  // 以 Binary 类型发送
  ws.send(new TextEncoder().encode(reqJson));
}
```

#### 10.5.8 发起通话

```javascript
async function startCall() {
  const btnStartCall = document.getElementById('btnStartCall');

  // 防止重复点击
  if (btnStartCall.disabled) return;
  btnStartCall.disabled = true;

  const calleeID = document.getElementById('calleeID').value;
  const mediaType = document.getElementById('mediaType').value; // 'video' 或 'audio'

  if (!calleeID) {
    console.error('请输入呼叫对象ID');
    btnStartCall.disabled = false;
    return;
  }

  try {
    // 1. 获取本地媒体流
    console.log('正在请求摄像头/麦克风权限...');
    await getLocalMedia(mediaType);

    // 2. 生成临时 roomID（服务端会返回正式的）
    rtcState.roomID = `room_${userID}_${calleeID}_${Date.now()}`;
    rtcState.inviterUserID = userID;
    rtcState.inviteeUserID = calleeID;
    rtcState.mediaType = mediaType;

    // 3. 构建邀请信息
    const invitation = {
      inviterUserID: userID,
      inviteeUserIDList: [calleeID],
      roomID: rtcState.roomID,
      timeout: 60,
      mediaType: mediaType,
      platformID: 5,      // Web
      sessionType: 1,     // 单聊
      initiateTime: Date.now()
    };
    rtcState.invitation = invitation;

    // 4. 编码并发送邀请信令
    const signalData = encodeSignalReqInvite({
      invitation: invitation,
      participant: { userInfo: { userID: userID, nickname: userID } },
      userID: userID
    });
    sendSignalMessage(signalData);

    // 5. 更新状态为"呼叫中"
    updateCallStatus('calling');
    console.log(`发起${mediaType === 'audio' ? '语音' : '视频'}通话: ${calleeID}`);

    // 6. 创建 PeerConnection（等待对方接听后发送 Offer）
    createPeerConnection();

  } catch (e) {
    console.error('发起通话失败:', e.message);
    cleanupCall();
    btnStartCall.disabled = false;
  }
}
```

#### 10.5.9 接听来电

```javascript
async function acceptCall() {
  if (!rtcState.invitation) {
    console.error('无来电');
    return;
  }

  try {
    // 1. 获取本地媒体流
    console.log('正在请求摄像头/麦克风权限...');
    await getLocalMedia(rtcState.mediaType);

    // 2. 发送接受信令
    sendSignalMessage(encodeSignalReqAccept({
      invitation: rtcState.invitation,
      participant: { userInfo: { userID: userID, nickname: userID } },
      opUserPlatformID: 5,
      userID: userID
    }));

    // 3. 隐藏来电UI
    showIncomingCall(false);

    // 4. 创建 PeerConnection（等待对方发送 Offer）
    createPeerConnection();

    console.log('已接听');
  } catch (e) {
    console.error('接听失败:', e.message);
    cleanupCall();
  }
}
```

#### 10.5.10 拒绝/取消/挂断

```javascript
// 拒绝来电
function rejectCall() {
  if (!rtcState.invitation) return;

  sendSignalMessage(encodeSignalReqReject({
    invitation: rtcState.invitation,
    participant: { userInfo: { userID: userID, nickname: userID } },
    opUserPlatformID: 5,
    userID: userID
  }));

  showIncomingCall(false);
  cleanupCall();
  console.log('已拒绝');
}

// 取消呼叫（在对方接听前）
function cancelCall() {
  if (!rtcState.invitation) return;

  sendSignalMessage(encodeSignalReqCancel({
    invitation: rtcState.invitation,
    participant: { userInfo: { userID: userID, nickname: userID } },
    userID: userID
  }));

  cleanupCall();
  console.log('已取消');
}

// 挂断通话
function hangupCall() {
  if (rtcState.invitation) {
    sendSignalMessage(encodeSignalReqHungUp({
      invitation: rtcState.invitation,
      userID: userID
    }));
  }
  cleanupCall();
  console.log('已挂断');
}
```

#### 10.5.11 获取本地媒体流

```javascript
async function getLocalMedia(mediaType) {
  try {
    // 检查可用设备
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    console.log(`检测到设备: 摄像头${videoDevices.length}个, 麦克风${audioDevices.length}个`);

    const constraints = {
      audio: true,
      video: mediaType === 'video'
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    rtcState.localStream = stream;

    // 显示本地视频
    document.getElementById('localVideo').srcObject = stream;

    console.log('本地媒体流获取成功');
    return stream;
  } catch (e) {
    let errorMsg = `获取媒体失败: ${e.name} - ${e.message}`;
    let hint = '';

    // 根据错误类型提供明确提示
    if (e.name === 'NotReadableError' || e.message.includes('in use')) {
      hint = '【设备被占用】请关闭其他使用摄像头的应用(Zoom/Teams等)';
    } else if (e.name === 'NotAllowedError') {
      hint = '【权限被拒绝】请允许浏览器访问摄像头/麦克风';
    } else if (e.name === 'NotFoundError') {
      hint = '【设备未找到】未检测到摄像头或麦克风';
    }

    console.error(errorMsg);
    if (hint) console.error(hint);
    throw e;
  }
}
```

#### 10.5.12 创建 PeerConnection

```javascript
function createPeerConnection() {
  console.log('[WebRTC] 创建连接，ICE服务器:', iceServers.length, '个');

  const pc = new RTCPeerConnection({ iceServers });

  // 添加本地媒体轨道
  if (rtcState.localStream) {
    rtcState.localStream.getTracks().forEach(track => {
      pc.addTrack(track, rtcState.localStream);
    });
    console.log('[WebRTC] 已添加本地媒体轨道');
  }

  // 监听远端媒体轨道
  pc.ontrack = (event) => {
    console.log('[WebRTC] 收到远端媒体轨道');
    rtcState.remoteStream = event.streams[0];
    document.getElementById('remoteVideo').srcObject = event.streams[0];
  };

  // 监听 ICE 候选
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('[ICE] 发现候选:', event.candidate.type);
      sendWebRTCSignal('candidate', event.candidate);
    } else {
      console.log('[ICE] 候选收集完成');
    }
  };

  // 监听 ICE 连接状态
  pc.oniceconnectionstatechange = () => {
    console.log('[ICE] 连接状态:', pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      console.error('[ICE] 连接失败！可能是NAT穿透失败，需要TURN服务器');
    }
  };

  // 监听连接状态
  pc.onconnectionstatechange = () => {
    console.log('[WebRTC] 连接状态:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('[WebRTC] 连接成功！');
      updateCallStatus('connected');
      startCallDurationTimer();
    } else if (pc.connectionState === 'failed') {
      console.error('[WebRTC] 连接失败！');
      hangupCall();
    } else if (pc.connectionState === 'disconnected') {
      console.log('[WebRTC] 连接断开');
      hangupCall();
    }
  };

  rtcState.peerConnection = pc;
  return pc;
}
```

#### 10.5.13 WebRTC 信令交换

```javascript
// 发送 WebRTC 信令（通过自定义消息）
function sendWebRTCSignal(type, data) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const targetID = rtcState.inviterUserID === userID
    ? rtcState.inviteeUserID
    : rtcState.inviterUserID;

  // 构建自定义消息内容
  const content = JSON.stringify({
    type: 'webrtc_signal',
    signalType: type,     // 'offer', 'answer', 'candidate'
    roomID: rtcState.roomID,
    data: data
  });

  // 使用 contentType=110 (自定义消息) 发送
  const msgData = {
    sendID: userID,
    recvID: targetID,
    clientMsgID: `${userID}_rtc_${Date.now()}`,
    senderPlatformID: 5,
    sessionType: 1,
    contentType: 110,
    content: new TextEncoder().encode(content),
    createTime: Date.now()
  };

  const req = {
    reqIdentifier: 1003,  // 普通消息
    token: token,
    sendID: userID,
    operationID: generateUUID(),
    msgIncr: String(++msgIncr),
    data: uint8ArrayToBase64(encodeMsgData(msgData))
  };

  ws.send(new TextEncoder().encode(JSON.stringify(req)));
}

// 处理接收到的 WebRTC 信令
async function handleWebRTCSignal(signalData) {
  const { signalType, data, roomID } = signalData;
  if (roomID !== rtcState.roomID) return;

  const pc = rtcState.peerConnection;
  if (!pc) return;

  try {
    switch (signalType) {
      case 'offer':
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendWebRTCSignal('answer', answer);
        break;
      case 'answer':
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        break;
      case 'candidate':
        await pc.addIceCandidate(new RTCIceCandidate(data));
        break;
    }
  } catch (e) {
    console.error('WebRTC信令处理失败:', e.message);
  }
}
```

#### 10.5.14 处理信令响应

```javascript
// 处理服务端返回的信令响应
function handleSignalResponse(resp) {
  if (resp.errCode !== 0) {
    console.error('RTC错误:', resp.errCode, resp.errMsg);
    return;
  }
  if (!resp.data) return;

  try {
    const signalResp = decodeSignalResp(resp.data);
    console.log('[RTC响应]', signalResp.type);

    switch (signalResp.type) {
      case 'invite':
      case 'inviteInGroup':
        if (signalResp.data.roomID) {
          // 更新为服务端分配的 roomID
          rtcState.roomID = signalResp.data.roomID;
          // 同步更新 invitation 中的 roomID（重要！）
          if (rtcState.invitation) {
            rtcState.invitation.roomID = signalResp.data.roomID;
          }
          console.log('[RTC] 更新roomID:', signalResp.data.roomID);
          updateCallStatus('calling');
        }
        break;

      case 'accept':
        console.log('对方已接听');
        // 对方接听后，主叫方创建并发送 Offer
        if (rtcState.peerConnection) {
          rtcState.peerConnection.createOffer()
            .then(offer => rtcState.peerConnection.setLocalDescription(offer))
            .then(() => sendWebRTCSignal('offer', rtcState.peerConnection.localDescription))
            .catch(e => console.error('创建offer失败:', e));
        }
        break;

      case 'reject':
        console.log('对方拒绝');
        cleanupCall();
        break;

      case 'cancel':
        console.log('对方取消');
        showIncomingCall(false);
        cleanupCall();
        break;

      case 'hungUp':
        console.log('对方挂断');
        cleanupCall();
        break;
    }
  } catch (e) {
    console.error('解析RTC响应失败:', e);
  }
}
```

#### 10.5.15 处理来电推送

```javascript
// 处理服务端推送的来电通知
function handleRTCPushNotification(msgData) {
  console.log('[RTC处理] contentType=', msgData.contentType);

  try {
    // contentType 1601 = RTC信令通知（来电邀请等）
    if (msgData.contentType === 1601) {
      const signalReq = decodeSignalInviteReq(msgData.content);
      if (signalReq.invitation) {
        processIncomingCall(signalReq.invitation);
      }
      return;
    }

    // contentType 110 = 自定义消息（WebRTC信令交换）
    if (msgData.contentType === 110) {
      const contentStr = new TextDecoder().decode(msgData.content);
      const content = JSON.parse(contentStr);

      if (content.type === 'webrtc_signal') {
        handleWebRTCSignal(content);
        return;
      }

      // 兼容旧格式
      if (content.invitation) {
        processIncomingCall(content.invitation);
      }
    }
  } catch (e) {
    console.error('[RTC处理] 失败:', e.message);
  }
}

// 处理来电
function processIncomingCall(invitation) {
  console.log('收到来电:', invitation.inviterUserID, 'roomID=', invitation.roomID);

  // 检查是否忙线
  if (rtcState.status !== 'idle') {
    console.log('当前忙线，忽略来电');
    return;
  }

  // 保存邀请信息
  rtcState.invitation = invitation;
  rtcState.inviterUserID = invitation.inviterUserID;
  rtcState.inviteeUserID = userID;
  rtcState.roomID = invitation.roomID;
  rtcState.mediaType = invitation.mediaType || 'video';

  // 显示来电UI
  showIncomingCall(true, rtcState.inviterUserID, rtcState.mediaType);
  updateCallStatus('ringing');
}
```

#### 10.5.16 清理资源

```javascript
function cleanupCall() {
  // 停止本地媒体流
  if (rtcState.localStream) {
    rtcState.localStream.getTracks().forEach(track => track.stop());
    rtcState.localStream = null;
  }

  // 关闭 PeerConnection
  if (rtcState.peerConnection) {
    rtcState.peerConnection.close();
    rtcState.peerConnection = null;
  }

  // 清理视频元素
  document.getElementById('localVideo').srcObject = null;
  document.getElementById('remoteVideo').srcObject = null;

  // 停止计时器
  stopCallDurationTimer();

  // 重置状态
  rtcState.roomID = null;
  rtcState.inviterUserID = null;
  rtcState.inviteeUserID = null;
  rtcState.invitation = null;
  rtcState.remoteStream = null;

  updateCallStatus('idle');
}
```

#### 10.5.17 媒体控制

```javascript
// 静音/取消静音
function toggleMuteAudio() {
  if (!rtcState.localStream) return;

  const audioTrack = rtcState.localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    const btn = document.getElementById('btnMuteAudio');
    btn.textContent = audioTrack.enabled ? '静音' : '取消静音';
  }
}

// 关闭/打开视频
function toggleMuteVideo() {
  if (!rtcState.localStream) return;

  const videoTrack = rtcState.localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    const btn = document.getElementById('btnMuteVideo');
    btn.textContent = videoTrack.enabled ? '关闭视频' : '打开视频';
  }
}
```

### 10.6 常见问题排查

#### 10.6.1 "设备被占用" 错误

**错误信息**: `NotReadableError: Could not start video source` 或 `Device in use`

**原因**: 摄像头被其他应用占用

**解决方案**:
1. 关闭其他使用摄像头的应用（Zoom、Teams、微信等）
2. 关闭浏览器其他标签页
3. 刷新页面重试
4. 如果只是测试信令，可选择"语音通话"模式

#### 10.6.2 "权限被拒绝" 错误

**错误信息**: `NotAllowedError: Permission denied`

**原因**: 用户拒绝了摄像头/麦克风权限

**解决方案**:
1. 点击浏览器地址栏左侧的锁图标
2. 在"摄像头"和"麦克风"选项中选择"允许"
3. 刷新页面重试

#### 10.6.3 能接通但看不到对方画面

**原因**: NAT穿透失败，只配置了STUN没有配置TURN

**解决方案**:
1. 确保 `iceServers` 配置中包含 TURN 服务器
2. 检查TURN服务器是否可用
3. 查看控制台 ICE 连接状态日志：
   - `checking` → 正在尝试连接
   - `connected` → 连接成功
   - `failed` → 连接失败，需要TURN服务器

**ICE候选类型说明**:
| 类型 | 说明 | 需要的服务器 |
|------|------|-------------|
| host | 本地IP候选 | 无（局域网可用） |
| srflx | STUN反射候选 | STUN服务器 |
| relay | TURN中继候选 | TURN服务器 |

#### 10.6.4 "call not found" 错误

**原因**: 取消/挂断时使用的 roomID 与服务端不一致

**解决方案**:
在收到 `invite` 响应后，同步更新 `rtcState.invitation.roomID`:
```javascript
if (signalResp.data.roomID) {
  rtcState.roomID = signalResp.data.roomID;
  if (rtcState.invitation) {
    rtcState.invitation.roomID = signalResp.data.roomID;  // 重要！
  }
}
```

#### 10.6.5 "user is already in a call" 错误

**原因**: 用户已在通话中，或之前的通话未正确清理

**解决方案**:
1. 发起新通话前先检查并清理旧通话:
```javascript
if (rtcState.roomID || rtcState.invitation) {
  // 取消之前的通话
  cancelCall();
  await new Promise(r => setTimeout(r, 500));
}
```
2. 确保 `cleanupCall()` 正确重置所有状态

### 10.7 RTC 快速检查清单

对接 RTC 功能前请确认以下要点：

- [ ] 已正确配置 ICE 服务器（包含 STUN 和 TURN）
- [ ] 使用 `reqIdentifier=1004` 发送信令消息
- [ ] 正确处理 `contentType=1601` 的来电推送
- [ ] 正确处理 `contentType=110` 的 WebRTC 信令交换
- [ ] 信令响应中的 `roomID` 已同步到 `rtcState.invitation.roomID`
- [ ] 发起通话按钮有防重复点击保护
- [ ] 实现了完整的资源清理 (`cleanupCall`)
- [ ] HTTPS 环境下测试（生产环境必须HTTPS才能访问摄像头）

### 10.8 生产环境建议

1. **TURN 服务器**: 部署自己的 TURN 服务器（推荐 coturn），确保媒体中继可用
2. **HTTPS**: 生产环境必须使用 HTTPS，否则浏览器不允许访问摄像头
3. **信令超时**: 实现信令发送超时检测，5秒未收到响应应提示用户
4. **重连机制**: WebSocket 断开时应停止当前通话并提示用户
5. **忙线处理**: 收到来电时如果正在通话，应自动拒绝或提示用户
6. **通话记录**: 通话结束后可调用 `GetCallHistory` API 获取通话记录
