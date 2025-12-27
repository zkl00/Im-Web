# WebSocket Protocol Specification

## Purpose

KKIM 消息网关 WebSocket 接口规范，用于 Web 端实时消息收发。定义了连接建立、消息协议、心跳机制、消息类型等核心功能的规范要求。

## Requirements

### Requirement: WebSocket Connection

客户端 SHALL 通过 WebSocket 连接到消息网关进行实时通信。

**连接地址格式**:
```
ws://{host}:10001/?sendID={userID}&platformID=5&token={token}&sdkType=js
```

**必要参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| sendID | string | 当前用户ID |
| platformID | int | 平台标识 (Web=5) |
| token | string | JWT 认证令牌 |
| sdkType | string | 必须设为 "js" |

**可选参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| compression | string | 压缩方式，支持 "gzip" |

**平台标识 (platformID)**:
| 值 | 平台 |
|----|------|
| 1 | iOS |
| 2 | Android |
| 3 | Windows |
| 4 | macOS |
| 5 | Web |
| 6 | MiniWeb (微信小程序) |
| 7 | Linux |
| 8 | AndroidPad |
| 9 | iPad |
| 10 | Admin |

#### Scenario: 成功建立连接
- **GIVEN** 用户已登录并获取有效 Token
- **WHEN** 客户端使用正确参数连接 WebSocket
- **THEN** 连接成功建立，客户端可以收发消息

#### Scenario: 连接参数缺失
- **GIVEN** 客户端尝试连接
- **WHEN** 缺少必要参数 (sendID/token/sdkType)
- **THEN** 连接被拒绝

#### Scenario: Token 无效
- **GIVEN** 客户端使用过期或无效 Token
- **WHEN** 尝试建立连接
- **THEN** 连接被拒绝，返回认证错误

---

### Requirement: Request Protocol

客户端发送请求 SHALL 遵循标准请求格式。

**请求格式 (Req)**:
```json
{
  "reqIdentifier": 1003,
  "token": "xxx",
  "sendID": "user123",
  "operationID": "uuid",
  "msgIncr": "1",
  "data": [10, 8, 97, ...]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| reqIdentifier | int | 请求标识符 |
| token | string | JWT Token |
| sendID | string | 发送者ID |
| operationID | string | 操作唯一ID (UUID) |
| msgIncr | string | 消息序号（递增，用于响应回调） |
| data | byte[] | Protobuf 编码的字节数组 |

**注意**: `data` 字段在发送时是**字节数组**（JSON 中表示为数字数组），不是 Base64 字符串。

#### Scenario: 发送标准请求
- **GIVEN** 已建立 WebSocket 连接
- **WHEN** 客户端构建请求并以 Binary 类型发送
- **THEN** 服务端正确解析并处理请求

#### Scenario: msgIncr 用于响应匹配
- **GIVEN** 客户端发送多个请求
- **WHEN** 服务端返回响应
- **THEN** 客户端通过 msgIncr 匹配对应的请求回调

---

### Requirement: Response Protocol

服务端响应 SHALL 遵循标准响应格式。

**响应格式 (Resp)**:
```json
{
  "reqIdentifier": 1003,
  "msgIncr": "1",
  "operationID": "uuid",
  "errCode": 0,
  "errMsg": "",
  "data": "CiA0ZmFi..."
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| reqIdentifier | int | 对应请求的标识符 |
| msgIncr | string | 对应请求的消息序号 |
| operationID | string | 操作唯一ID |
| errCode | int | 错误码，0 表示成功 |
| errMsg | string | 错误信息 |
| data | string | Protobuf 编码的响应数据（Base64 字符串） |

**注意**: 响应中的 `data` 字段是 **Base64 编码的字符串**，需先 Base64 解码，再进行 Protobuf 解码。

#### Scenario: 成功响应
- **GIVEN** 客户端发送有效请求
- **WHEN** 服务端处理完成
- **THEN** 返回 errCode=0 和 Base64 编码的 data

#### Scenario: 错误响应
- **GIVEN** 请求处理失败
- **WHEN** 服务端返回响应
- **THEN** errCode 非零，errMsg 包含错误描述

---

### Requirement: Protocol Identifiers

系统 SHALL 使用以下协议标识符区分不同类型的消息。

**客户端→服务端**:
| 标识符 | 值 | 说明 |
|--------|-----|------|
| WSGetNewestSeq | 1001 | 获取最新消息序列号 |
| WSPullMsgBySeqList | 1002 | 按序列号批量拉取消息 |
| WSSendMsg | 1003 | 发送消息 |
| WSSendSignalMsg | 1004 | 发送信令消息(音视频) |
| WSPullMsg | 1005 | 拉取消息 |
| WSGetConvMaxReadSeq | 1006 | 获取会话最大已读序列号 |

**服务端→客户端**:
| 标识符 | 值 | 说明 |
|--------|-----|------|
| WSPushMsg | 2001 | 服务端推送消息 |
| WSKickOnlineMsg | 2002 | 踢下线通知 |
| WsLogoutMsg | 2003 | 登出通知 |

#### Scenario: 发送消息
- **GIVEN** 用户要发送一条消息
- **WHEN** 客户端使用 reqIdentifier=1003
- **THEN** 服务端识别为发送消息请求并处理

#### Scenario: 接收推送消息
- **GIVEN** 有新消息发送给用户
- **WHEN** 服务端推送 reqIdentifier=2001
- **THEN** 客户端解析并展示新消息

#### Scenario: 被踢下线
- **GIVEN** 用户账号在其他设备登录
- **WHEN** 服务端发送 reqIdentifier=2002
- **THEN** 客户端断开连接并提示用户重新登录

---

### Requirement: Heartbeat Mechanism

客户端 SHALL 实现心跳机制保持连接活跃。

**配置**:
- 心跳超时: 30秒 (pongWait)
- 建议心跳间隔: 25秒

**心跳方式一：WebSocket Ping/Pong 帧（推荐）**
使用 WebSocket 标准的 Ping 帧，服务端会自动回复 Pong。

**心跳方式二：Text 消息心跳**
```javascript
// 发送
{"type": "ping"}
// 接收
{"type": "pong"}
```

#### Scenario: 心跳保持连接
- **GIVEN** 客户端已连接
- **WHEN** 每 25 秒发送心跳
- **THEN** 连接保持活跃不会超时断开

#### Scenario: 心跳超时
- **GIVEN** 客户端已连接
- **WHEN** 超过 30 秒未发送心跳
- **THEN** 服务端关闭连接

---

### Requirement: Message Content Types

系统 SHALL 支持以下消息内容类型。

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

#### Scenario: 发送文本消息
- **GIVEN** 用户输入文本内容
- **WHEN** 使用 contentType=101 发送
- **THEN** 消息以文本形式展示给接收方

#### Scenario: 发送图片消息
- **GIVEN** 用户选择图片文件
- **WHEN** 上传后使用 contentType=102 发送
- **THEN** 消息以图片形式展示给接收方

---

### Requirement: Session Types

系统 SHALL 支持以下会话类型。

| 值 | 说明 |
|----|------|
| 1 | 单聊 |
| 2 | 群聊 |
| 3 | 超级群 |
| 4 | 通知会话 |

#### Scenario: 单聊会话
- **GIVEN** 用户要与另一用户私聊
- **WHEN** 使用 sessionType=1 发送消息
- **THEN** 消息仅发送给指定的 recvID 用户

#### Scenario: 群聊会话
- **GIVEN** 用户要在群组发消息
- **WHEN** 使用 sessionType=2 并指定 groupID
- **THEN** 消息发送给群内所有成员

---

### Requirement: MsgData Structure

发送消息时 SHALL 使用 MsgData Protobuf 结构。

**MsgData 字段**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sendID | string | 是 | 发送者用户ID |
| recvID | string | 单聊必填 | 接收者用户ID |
| groupID | string | 群聊必填 | 群组ID |
| clientMsgID | string | 是 | 客户端消息唯一ID |
| senderPlatformID | int32 | 是 | 发送者平台 |
| sessionType | int32 | 是 | 会话类型 |
| contentType | int32 | 是 | 消息内容类型 |
| content | bytes | 是 | 消息内容 (JSON 字节数组) |
| createTime | int64 | 是 | 创建时间戳（毫秒） |
| options | map | 否 | 消息选项 |
| offlinePushInfo | object | 否 | 离线推送配置 |
| atUserIDList | []string | 否 | @的用户ID列表 |
| ex | string | 否 | 扩展字段 |

**clientMsgID 格式**: `{sendID}_{timestamp}`

#### Scenario: 构建单聊消息
- **GIVEN** 用户要发送单聊消息
- **WHEN** 构建 MsgData 并设置 recvID
- **THEN** 消息正确发送给目标用户

#### Scenario: 构建群聊消息
- **GIVEN** 用户要发送群聊消息
- **WHEN** 构建 MsgData 并设置 groupID
- **THEN** 消息正确发送给群组

---

### Requirement: Text Message Content

文本消息 (contentType=101) 的 content SHALL 遵循以下格式。

```json
{"text": "消息文本内容"}
```

#### Scenario: 发送纯文本
- **GIVEN** 用户输入 "你好"
- **WHEN** 构建 content 为 `{"text": "你好"}`
- **THEN** 接收方收到并正确显示文本

---

### Requirement: Picture Message Content

图片消息 (contentType=102) 的 content SHALL 遵循以下格式。

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

#### Scenario: 发送图片包含缩略图
- **GIVEN** 用户选择一张图片
- **WHEN** 上传原图、大图和缩略图后构建 content
- **THEN** 接收方可查看缩略图和原图

---

### Requirement: Sound Message Content

语音消息 (contentType=103) 的 content SHALL 遵循以下格式。

```json
{
  "uuid": "唯一ID",
  "soundPath": "语音文件路径",
  "sourceUrl": "https://xxx/voice.mp3",
  "dataSize": 12345,
  "duration": 5
}
```

#### Scenario: 发送语音消息
- **GIVEN** 用户录制 5 秒语音
- **WHEN** 上传后构建包含 duration=5 的 content
- **THEN** 接收方可播放语音并看到时长

---

### Requirement: Video Message Content

视频消息 (contentType=104) 的 content SHALL 遵循以下格式。

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

#### Scenario: 发送视频带封面
- **GIVEN** 用户选择视频文件
- **WHEN** 上传视频和封面图后构建 content
- **THEN** 接收方可预览封面并播放视频

---

### Requirement: File Message Content

文件消息 (contentType=105) 的 content SHALL 遵循以下格式。

```json
{
  "filePath": "文件路径",
  "uuid": "唯一ID",
  "sourceUrl": "https://xxx/file.pdf",
  "fileName": "document.pdf",
  "fileSize": 102400
}
```

#### Scenario: 发送文件
- **GIVEN** 用户选择 PDF 文件
- **WHEN** 上传后构建包含文件名和大小的 content
- **THEN** 接收方可查看文件名并下载

---

### Requirement: At Message Content

@消息 (contentType=106) 的 content SHALL 遵循以下格式。

```json
{
  "text": "@张三 你好",
  "atUserList": ["user123"],
  "isAtSelf": false
}
```

#### Scenario: 发送@消息
- **GIVEN** 用户在群里@某人
- **WHEN** 构建 content 包含 atUserList
- **THEN** 被@的用户收到特殊提醒

---

### Requirement: Location Message Content

位置消息 (contentType=109) 的 content SHALL 遵循以下格式。

```json
{
  "description": "北京市朝阳区xxx",
  "longitude": 116.397128,
  "latitude": 39.916527
}
```

#### Scenario: 发送位置
- **GIVEN** 用户选择当前位置
- **WHEN** 获取经纬度后构建 content
- **THEN** 接收方可在地图上查看位置

---

### Requirement: Custom Message Content

自定义消息 (contentType=110) 的 content SHALL 遵循以下格式。

```json
{
  "data": "{\"key\":\"value\"}",
  "description": "自定义描述",
  "extension": "扩展信息"
}
```

#### Scenario: 发送自定义消息
- **GIVEN** 应用需要发送自定义数据
- **WHEN** 将数据 JSON 化放入 data 字段
- **THEN** 接收方可解析并处理自定义数据

---

### Requirement: Quote Message Content

引用消息 (contentType=114) 的 content SHALL 遵循以下格式。

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

#### Scenario: 回复引用消息
- **GIVEN** 用户选择一条消息进行回复
- **WHEN** 构建 content 包含原消息信息
- **THEN** 接收方可看到引用的原消息和回复内容

---

### Requirement: GetMaxSeq Request

获取最新序列号请求 (reqIdentifier=1001) SHALL 使用以下格式。

**请求 Protobuf**:
```protobuf
message GetMaxSeqReq {
  string userID = 1;
}
```

**响应 Protobuf**:
```protobuf
message GetMaxSeqResp {
  map<string, int64> maxSeqs = 1;
  map<string, int64> minSeqs = 2;
}
```

#### Scenario: 获取各会话最新序列号
- **GIVEN** 客户端需要同步消息
- **WHEN** 发送 GetMaxSeq 请求
- **THEN** 返回各会话的最大和最小序列号

---

### Requirement: PullMessageBySeqs Request

按序列号拉取消息请求 (reqIdentifier=1002) SHALL 使用以下格式。

**请求 Protobuf**:
```protobuf
message PullMessageBySeqsReq {
  string userID = 1;
  repeated SeqRange seqRanges = 2;
  Order order = 3;
}

message SeqRange {
  string conversationID = 1;
  int64 begin = 2;
  int64 end = 3;
  int64 num = 4;
}
```

#### Scenario: 拉取历史消息
- **GIVEN** 用户需要查看历史消息
- **WHEN** 指定会话ID和序列号范围
- **THEN** 返回对应范围内的消息列表

---

### Requirement: SendMsg Response

发送消息响应 (reqIdentifier=1003) SHALL 返回以下格式。

**响应 Protobuf**:
```protobuf
message SendMsgResp {
  string serverMsgID = 1;
  string clientMsgID = 2;
  int64 sendTime = 3;
}
```

#### Scenario: 发送成功响应
- **GIVEN** 消息发送成功
- **WHEN** 服务端返回响应
- **THEN** 包含服务端生成的 serverMsgID 和 sendTime

---

### Requirement: Push Message Handling

客户端 SHALL 正确处理服务端推送的消息 (reqIdentifier=2001)。

**推送 Protobuf**:
```protobuf
message PushMessages {
  map<string, PullMsgs> msgs = 1;
  map<string, PullMsgs> notificationMsgs = 2;
}

message PullMsgs {
  repeated MsgData msgs = 1;
}
```

#### Scenario: 处理新消息推送
- **GIVEN** 服务端推送新消息
- **WHEN** 客户端收到 reqIdentifier=2001
- **THEN** 解码 PushMessages 并展示消息

#### Scenario: 处理通知消息
- **GIVEN** 服务端推送通知
- **WHEN** 客户端收到包含 notificationMsgs 的推送
- **THEN** 解析并处理系统通知

---

### Requirement: Kick Offline Handling

客户端 SHALL 正确处理踢下线通知 (reqIdentifier=2002)。

#### Scenario: 账号在其他设备登录
- **GIVEN** 用户账号在其他设备登录
- **WHEN** 收到踢下线通知
- **THEN** 断开连接并提示用户重新登录

---

### Requirement: Logout Notification

客户端 SHALL 正确处理登出通知 (reqIdentifier=2003)。

#### Scenario: 收到登出通知
- **GIVEN** 服务端发送登出通知
- **WHEN** 客户端收到通知
- **THEN** 清理本地状态并断开连接

---

### Requirement: Error Handling

客户端 SHALL 正确处理各类错误码。

**常见错误码**:
| errCode | 说明 | 处理建议 |
|---------|------|---------|
| 0 | 成功 | - |
| 1001 | Token 过期 | 重新登录获取新 Token |
| 1002 | Token 无效 | 检查 Token 格式 |
| 1003 | 用户不存在 | 检查 userID |
| 1004 | 发送者与接收者相同 | 不允许给自己发消息 |
| 1101 | 消息内容为空 | 检查 content 字段 |
| 1102 | 消息过大 | 消息超过 50KB 限制 |

#### Scenario: Token 过期处理
- **GIVEN** 收到 errCode=1001
- **WHEN** 客户端检测到 Token 过期
- **THEN** 引导用户重新登录

#### Scenario: 消息过大处理
- **GIVEN** 消息超过 50KB
- **WHEN** 收到 errCode=1102
- **THEN** 提示用户消息过大，建议压缩或分割

---

### Requirement: Auto Reconnection

客户端 SHALL 实现自动重连机制。

**重连策略**:
- 非正常断开时自动尝试重连
- 建议最大重连次数: 5 次
- 建议重连间隔: 3 秒

#### Scenario: 网络断开自动重连
- **GIVEN** 网络临时中断
- **WHEN** WebSocket 异常断开
- **THEN** 客户端自动尝试重连

#### Scenario: 达到最大重连次数
- **GIVEN** 多次重连失败
- **WHEN** 达到最大重连次数
- **THEN** 停止重连并提示用户网络异常

---

### Requirement: Message Size Limit

消息大小 SHALL 不超过 50KB (51200 字节)。

#### Scenario: 消息大小验证
- **GIVEN** 用户发送消息
- **WHEN** 消息序列化后超过 50KB
- **THEN** 拒绝发送并提示用户

---

### Requirement: Binary Message Type

业务消息 SHALL 以 Binary 类型发送。

#### Scenario: 正确的消息类型
- **GIVEN** 客户端发送业务消息
- **WHEN** 使用 WebSocket 发送
- **THEN** 消息类型为 Binary，不是 Text

---

## Implementation Notes

1. **sdkType 参数**: Web 端必须设置 `sdkType=js`，否则服务端使用 Gob 编码导致解析失败
2. **Protobuf 库**: 推荐使用 protobufjs
3. **clientMsgID**: 必须保证唯一性，建议格式 `{userID}_{timestamp}`
4. **请求 data**: 发送时为字节数组（JSON 数字数组）
5. **响应 data**: 响应为 Base64 字符串，需解码后再解析 Protobuf
6. **Token 刷新**: 建议在 Token 过期前主动刷新
