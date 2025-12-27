# WebSocket Protocol Design

## Context

KKIM 消息网关使用 WebSocket 协议进行实时消息收发，Web 端需要正确实现客户端以对接后端服务。

## Technical Architecture

### 消息发送流程

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

### 消息接收流程

```
┌─────────────────────────────────────────────────────────────────┐
│  1. 收到 Binary 类型 WebSocket 消息                               │
├─────────────────────────────────────────────────────────────────┤
│  2. JSON 解析为 Resp 对象                                         │
├─────────────────────────────────────────────────────────────────┤
│  3. Base64 解码 data 字段                                         │
├─────────────────────────────────────────────────────────────────┤
│  4. Protobuf 解码为对应类型                                        │
│     根据 reqIdentifier 选择解码类型                                │
├─────────────────────────────────────────────────────────────────┤
│  5. 处理业务逻辑                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Protobuf Schema

```protobuf
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
  int64 seq = 13;
  int64 sendTime = 14;
  int64 createTime = 15;
  int32 status = 16;
  bool isRead = 17;
  map<string, bool> options = 18;
  OfflinePushInfo offlinePushInfo = 19;
  repeated string atUserIDList = 20;
  string attachedInfo = 21;
  string ex = 22;
}

message OfflinePushInfo {
  string title = 1;
  string desc = 2;
  string ex = 3;
  string iOSPushSound = 4;
  bool iOSBadgeCount = 5;
}

// 发送消息响应
message SendMsgResp {
  string serverMsgID = 1;
  string clientMsgID = 2;
  int64 sendTime = 3;
}

// 获取最新序列号
message GetMaxSeqReq {
  string userID = 1;
}

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
  repeated MsgData msgs = 1;
}

// 按序列号拉取消息
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

enum Order {
  ASC = 0;
  DESC = 1;
}
```

## Key Implementation Decisions

### 1. 编码方式选择

**决定**: 使用 `sdkType=js` 参数启用 JSON+Protobuf 编码

**原因**: 默认 `sdkType=go` 使用 Gob 编码，JavaScript 无法解析

**替代方案**: 无（必须使用 js 模式）

### 2. 心跳策略

**决定**: 每 25 秒发送心跳，使用 Text 类型 `{"type": "ping"}`

**原因**:
- 服务端心跳超时为 30 秒
- 25 秒间隔提供 5 秒容错时间
- Text 类型心跳比 Ping 帧更容易调试

### 3. 重连策略

**决定**: 指数退避重连，最多 5 次

**配置**:
- 初始间隔: 3 秒
- 最大重连次数: 5 次
- 正常关闭 (code=1000) 不重连

### 4. 消息回调匹配

**决定**: 使用 `msgIncr` 字段匹配请求和响应

**实现**:
- 客户端维护 `Map<msgIncr, callback>`
- 发送时注册回调
- 收到响应时通过 msgIncr 触发回调
- 设置 30 秒超时

### 5. clientMsgID 生成

**决定**: 格式为 `{userID}_{timestamp}`

**原因**:
- 保证同一用户消息唯一
- 便于调试和追踪
- 时间戳提供排序依据

## Data Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   UI 组件     │ ──────▶ │  WebSocket   │ ──────▶ │   服务端      │
│              │         │    Client    │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │  sendTextMessage()     │                        │
       │ ─────────────────────▶ │                        │
       │                        │  构建 MsgData          │
       │                        │  Protobuf 编码         │
       │                        │  构建 Req              │
       │                        │  JSON 序列化           │
       │                        │ ─────────────────────▶ │
       │                        │                        │  处理消息
       │                        │ ◀───────────────────── │
       │                        │  JSON 解析             │
       │                        │  Base64 解码           │
       │                        │  Protobuf 解码         │
       │ ◀───────────────────── │                        │
       │  callback(result)      │                        │
```

## Error Handling Strategy

| 错误类型 | 处理方式 |
|---------|---------|
| 连接失败 | 自动重连，最多 5 次 |
| Token 过期 | 触发重新登录流程 |
| 消息发送失败 | 返回错误给调用方 |
| 解码失败 | 记录日志，忽略消息 |
| 踢下线 | 断开连接，提示用户 |

## Dependencies

- **protobufjs**: Protobuf 编解码库
- **WebSocket API**: 浏览器原生 WebSocket

## Performance Considerations

1. **消息大小限制**: 50KB，超出需分片或压缩
2. **心跳开销**: 25 秒一次，开销可忽略
3. **Protobuf vs JSON**: Protobuf 体积更小，但需要编解码
4. **连接复用**: 单一 WebSocket 连接处理所有消息

## Security Considerations

1. **Token 认证**: 每个连接和请求都携带 JWT Token
2. **HTTPS/WSS**: 生产环境使用加密连接
3. **Token 刷新**: 在过期前主动刷新
4. **踢下线机制**: 防止多端同时登录
