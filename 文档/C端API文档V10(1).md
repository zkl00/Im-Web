# C端（用户端）HTTP API 文档

## 通用说明

- Header: operationID 建议每次请求携带
- Header: token 登录态接口需携带
- Header: X-Tenant-ID SaaS 多租户，目前分配1000（白名单接口尤需，租户分配系统开发完，系统分配）
- 白名单接口：self_register、self_login

## POST /user/self_register（用户端注册）

功能与使用场景: 用户相关接口，用于注册、供 C 端界面调用

逻辑说明:

- 校验用户身份与必要参数。

- 读取/写入用户信息到用户服务（user RPC），并同步缓存。

- 处理隐私/权限检查，如仅允许本人或管理员查看敏感字段。

功能: 自助注册

该接口为 HTTP 自定义处理（非 a2r 直通），以下为内部 handler 使用的 Go 请求/响应结构：

| 字段 | 类型 | 必填 | 说明 |
| -------------- | -------------- | -------------- | ----------------------------------- |
| userID         | string         | true           | 用户唯一 ID，格式示例：user_10001。 |
| nickname       | string         | true           | 展示名/昵称，UTF-8 字符串。         |
| faceURL        | string         | false          | 头像 URL 或文件路径                 |
| password       | string         | true           | 密码                                |

### 响应（Resp）

- Go 类型：SelfRegisterResp (defined in internal/api/user.go)

| 字段 | 类型 | 说明 |
| ---- | ---- | ----------------------------------- |
| userID         | string         | 用户唯一 ID，格式示例：user_10001。 |

### 示例请求

{

 "ex": "example",

 "faceURL": "https://cdn.example.com/files/abcd.jpg",

 "nickname": "Alice",

 "userID": "user_10001"

}

### 示例响应

{

 "userID": "string"

}

### 错误码

- 1101: UserID does not exist or is not registered (UserIDNotFoundError)

- 1102: user is already registered (RegisteredAlreadyError)

- 1001: Input parameter error (ArgsError)

- 1002: Insufficient permission (NoPermissionError)



------



## POST /user/self_login（用户端登录）

功能与使用场景: 用户相关接口，用于注册、查询和更新用户信息，供 C 端界面

逻辑说明:

- 校验用户身份与必要参数。

- 读取/写入用户信息到用户服务（user RPC），并同步缓存。

- 处理隐私/权限检查，如仅允许本人或管理员查看敏感字段。

功能: 自助登录

该接口为 HTTP 自定义处理（非 a2r 直通），以下为内部 handler 使用的 Go 请求/响应结构：

| 字段 | 类型 | 是否必填 | 说明 |
| ---- | ---- | -------- | ------------------------------------------ |
| userID         | string         | true               | 用户唯一 ID，格式示例：user_10001。        |
| platformID     | int32          | true               | 平台 ID（示例：1-iOS，2-Android，3-Web）。 |
| password       | string         | true               | 密码                                       |

### 响应（Resp）

- Go 类型：SelfLoginResp (defined in internal/api/user.go)

| 字段 | 类型 | 说明 |
| ---- | ---- | ------------------------------------------------------------ |
| token             | string         | 鉴权 token（JWT），需要在登录后由服务端获取并在后续接口中放在 Header: token 中。 |
| expireTimeSeconds | int64          | 整型数值，表示数量或枚举值。                                 |

### 示例请求

{

 "platformID": 1,

 "userID": "user_10001"

}

### 示例响应

{

 "expireTimeSeconds": 123, 

 "token": "string"

}

### 错误码

- 1101: UserID does not exist or is not registered (UserIDNotFoundError)

- 1102: user is already registered (RegisteredAlreadyError)

- 1001: Input parameter error (ArgsError)

- 1002: Insufficient permission (NoPermissionError)

## POST /user/update_user_info_ex（个人信息修改）

功能: 更新用户信息(扩展)

对应 RPC: user.User/UpdateUserInfoEx

功能与使用场景: 用户相关接口，用于注册、查询和更新用户信息，供 C 端界面

逻辑说明:

- 校验用户身份与必要参数。

- 读取/写入用户信息到用户服务（user RPC），并同步缓存。

- 处理隐私/权限检查，如仅允许本人或管理员查看敏感字段。

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | -------- | -------------- |
| userInfo          | object         | true               | 用户信息       |
| userInfo.userID   | string         | true               | 用户 lD        |
| userInfo.nickname | string         | false              | 用户名称       |
| userInfo.faceURL  | string         | false              | 用户头像       |
| ex                | string         | false              | 扩展字段       |

### 响应（Resp）

- Go 类型：user.UpdateUserInfoExResp

| 字段 | 类型 | 说明 |
| ---- | ---- | -------------- |
| 无             |                |                |

### 示例请求

{

 "userInfo": {

  "appMangerLevel": 0,

  "createTime": 1700000000,

  "ex": "{"bio":"Hello world"}",

  "faceURL": "https://cdn.example.com/avatars/alice.png",

  "globalRecvMsgOpt": 0,

  "nickname": "Alice",

  "userID": "user_10001"

 }

}

### 示例响应

{

 "errCode": 1004,

 "errMsg": "RecordNotFoundError",

 "errDlt": ": [1004]RecordNotFoundError"

}

### 错误码

- 1101: UserID does not exist or is not registered (UserIDNotFoundError)

- - 1102: user is already registered (RegisteredAlreadyError)

- - 1001: Input parameter error (ArgsError)

- - 1002: Insufficient permission (NoPermissionError)

- ------



## POST /user/get_users_info（获取个人信息）

功能: 获取用户信息

对应 RPC: user.User/GetDesignateUsers

功能与使用场景: 用户相关接口，用于注册、查询和更新用户信息，供 C 端界面

逻辑说明:

- 校验用户身份与必要参数。

- 读取/写入用户信息到用户服务（user RPC），并同步缓存。

- 处理隐私/权限检查，如仅允许本人或管理员查看敏感字段。

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | -------- | ----------------------------------- |
| userIDs        | string         | true               | 用户唯一 ID，格式示例：user_10001。 |

### 响应（Resp）

- Go 类型：user.GetDesignateUsersResp

| 字段 | 类型 | 说明 |
| ---- | ---- | -------------- |
| userID         | string         | 用户ID         |
| nickname       | string         | 用户昵称       |
| faceURL        | string         | 用户头像       |
| ex             | string         | 扩展信息       |
| createTime     | int64          | 创建时间       |

### 示例请求

{

 "userIDs": [

  "user_10001"

 ]

}

### 示例响应

{

 "usersInfo": [{

 "_placeholder": true

}]

}

### 错误码

- 1101: UserID does not exist or is not registered (UserIDNotFoundError)

- 1102: user is already registered (RegisteredAlreadyError)

- 1001: Input parameter error (ArgsError)

- 1002: Insufficient permission (NoPermissionError)

## POST /user/get_users_info(查找好友)

功能：或者指定用户的公开信息

对应RPC：略

功能与使用场景：添加好友前，根据用户ID搜索好友列表，后发起好友申请    

逻辑说明：略

| 字段    | 类型  | 必填 | 说明               |
| ------- | ----- | ---- | ------------------ |
| userIDs | array | true | 要查询的用户ID列表 |

### 响应（Resp）

GetDesignateUsersResp列表

| 字段       | 类型   | 说明                   |
| ---------- | ------ | ---------------------- |
| userID     | string | 用户ID                 |
| nickname   | string | 用户昵称               |
| faceURL    | string | 用户头像URL            |
| ex         | string | 扩展字段               |
| createTime | int64  | 创建时间（毫秒时间戳） |

### 示例请求

{
    "userIDs": ["user_10001", "user_10002", "user_10003"]

}

### 示例响应

{
    "errCode": 0,
    "errMsg": "",
    "errDlt": "",
    "data": {
      "usersInfo": [
        {
          "userID": "user_10001",
          "nickname": "张三",
          "faceURL": "https://example.com/avatar/10001.jpg",
          "ex": "",
          "createTime": 1703404800000,
          "appMangerLevel": 0,
          "globalRecvMsgOpt": 0
        },
        {
          "userID": "user_10002",
          "nickname": "李四",
          "faceURL": "https://example.com/avatar/10002.jpg",
          "ex": "",
          "createTime": 1703404900000,
          "appMangerLevel": 0,
          "globalRecvMsgOpt": 0
        }
      ]
    }
  }

### 错误码

- 1001: 参数错误 (ArgsError)
- 1004: 记录未找到 (RecordNotFoundError)
- 1101: 无权限 (NoPermissionError)



## POST /friend/add_friend（添加好友）

功能: 申请加好友

对应 RPC: relation.Friend/ApplyToAddFriend

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | -------- | ----------------------------------- |
| fromUserID     | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| toUserID       | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| reqMsg         | string         | false              | 申请信息                            |
| ex             | string         | false              | 参数说明请参考协议定义或后端实现。  |

### 响应（Resp）

- Go 类型：relation.ApplyToAddFriendResp

| 字段 | 类型 | 说明 |
| ---- | ---- | -------------- |
| 无             |                |                |

### 示例请求

{

 "ex": "example",

 "fromUserID": "user_10001",

 "reqMsg": "example",

 "toUserID": "user_10001"

}

### 示例响应

{

 "errCode": 1004,

 "errMsg": "RecordNotFoundError",

 "errDlt": ": [1004]RecordNotFoundError"

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## POST /friend/add_friend_response（审核好友申请）

功能: 响应好友申请

对应 RPC: relation.Friend/RespondFriendApply

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | -------- | ----------------------------------- |
| fromUserID     | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| toUserID       | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| handleResult   | int32          | false              | 处理结果。 1：同意；-1：拒绝        |
| handleMsg      | string         | false              | 处理信息                            |

### 响应（Resp）

- Go 类型：relation.RespondFriendApplyResp

| 字段 | 类型 | 说明 |
| ---- | ---- | -------------- |
| 无             |                |                |

### 示例请求

{

 "fromUserID": "user_10001",

 "handleMsg": "example",

 "handleResult": 123,

 "toUserID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": ""

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## *POST /friend/delete_friend*（*删除好友*）

功能: 删除好友

对应 RPC: relation.Friend/DeleteFriend

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段 | 类型 | 必填 | 说明                      |
| -------------- | -------------- | ------------------ | ----------------------------------- |
| ownerUserID    | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| friendUserID   | string         | true               | 用户唯一 ID，格式示例：user_10001。 |

### 响应（Resp）

- Go 类型：relation.DeleteFriendResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "friendUserID": "user_10001",

 "ownerUserID": "user_10001"

}

### 示例响应

{

 "errCode": 1004,

 "errMsg": "RecordNotFoundError",

 "errDlt": ": [1004]RecordNotFoundError"

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## *POST /friend/get_friend_apply_list*（*好友申请列表*）

功能: 好友申请列表

对应 RPC: relation.Friend/GetPaginationFriendsApplyTo

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段        | 类型    | 必填 | 说明                                               |
| --------------------- | ----------------- | ------------------ | ------------------------------------------------------------ |
| userID                | string            | true               | 用户唯一 ID，格式示例：user_10001。                          |
| pagination            | RequestPagination | true               | 分页参数，包含 pageNumber（页码）和 showNumber（每页数量）。 |
| pagination.pageNumber | int               | true               | 当前页码，从 1 开始                                          |
| pagination.showNumber | int               | true               | 当前页请求数量                                               |

### 响应（Resp）

- Go 类型：relation.GetPaginationFriendsApplyToResp

| 字段 | 类型 | 说明                                |
| -------------- | -------------- | --------------------------------------------- |
| fromUserID     | string         | 发出申请者的用户 ID                           |
| fromNickname   | string         | 发出申请者的用户名                            |
| fromFaceURL    | string         | 发出申请者的头像URL                           |
| toUserID       | string         | 接收申请者的用户 ID                           |
| toNickname     | string         | 接收申请者的用户名                            |
| toFaceURL      | string         | 接收申请者的头像URL                           |
| handleResult   | int32          | 好友申请处理状态 1：同意、0：未处理、-1：拒绝 |
| reqMsg         | string         | 申请的信息                                    |
| createTime     | int64          | 创建时间                                      |
| handlerUserID  | string         | 处理者的 ID                                   |
| handleMsg      | string         | 处理信息                                      |
| handleTime     | int64          | 处理时间                                      |
| ex             | string         | 扩展字段                                      |

### 示例请求

{

 "pagination": {

  "pageNumber": 1,

  "showNumber": 20

 },

 "userID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": "",

 "data": {

  "FriendRequests": [

   {

​    "fromUserID": "11111111",

​    "fromNickname": "yourNickname",

​    "fromFaceURL": "yourFaceURL",

​    "toUserID": "11111112",

​    "toNickname": "alantestuid3",

​    "toFaceURL": "1111111",

​    "handleResult": 1,

​    "reqMsg": "hello!",

​    "createTime": 1688458858893,

​    "handlerUserID": "admin",

​    "handleMsg": "agree",

​    "handleTime": 1688458955357,

​    "ex": ""

   }

  ],

  "total": 1

 }

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## *POST /friend/get_self_friend_apply_list*（*我发起的好友申请*）

功能: 我发起的好友申请

对应 RPC: relation.Friend/GetPaginationFriendsApplyFrom

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段        | 类型    | 必填 | 说明                                               |
| --------------------- | ----------------- | ------------------ | ------------------------------------------------------------ |
| userID                | string            | true               | 用户唯一 ID，格式示例：user_10001。                          |
| pagination            | RequestPagination | true               | 分页参数，包含 pageNumber（页码）和 showNumber（每页数量）。 |
| pagination.pageNumber | int               | true               | 当前页码，从 1 开始                                          |
| pagination.showNumber | int               | true               | 当前页请求数量                                               |

### 响应（Resp）

- Go 类型：relation.GetPaginationFriendsApplyFromResp

| 字段 | 类型 | 说明                                |
| -------------- | -------------- | --------------------------------------------- |
| fromUserID     | string         | 发出申请者的用户 ID                           |
| fromNickname   | string         | 发出申请者的用户名                            |
| fromFaceURL    | string         | 发出申请者的头像URL                           |
| toUserID       | string         | 接收申请者的用户 ID                           |
| toNickname     | string         | 接收申请者的用户名                            |
| toFaceURL      | string         | 接收申请者的头像URL                           |
| handleResult   | int32          | 好友申请处理状态 1：同意、0：未处理、-1：拒绝 |
| reqMsg         | string         | 申请的信息                                    |
| createTime     | int64          | 创建时间                                      |
| handlerUserID  | string         | 处理者的 ID                                   |
| handleMsg      | string         | 处理信息                                      |
| handleTime     | int64          | 处理时间                                      |
| ex             | string         | 扩展字段                                      |

### 示例请求

{

 "pagination": {

  "pageNumber": 1,

  "showNumber": 20

 },

 "userID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": "",

 "data": {

  "friendRequests": [

   {

​    "fromUserID": "11111111",

​    "fromNickname": "yourNickname",

​    "fromFaceURL": "yourFaceURL",

​    "toUserID": "11111112",

​    "toNickname": "alantestuid3",

​    "toFaceURL": "1111111",

​    "handleResult": 1,

​    "reqMsg": "hello!",

​    "createTime": 1688458858893,

​    "handlerUserID": "admin",

​    "handleMsg": "agree",

​    "handleTime": 1688458955357,

​    "ex": ""

   },

   {

​    "fromUserID": "11111111",

​    "fromNickname": "yourNickname",

​    "fromFaceURL": "yourFaceURL",

​    "toUserID": "11111113",

​    "toNickname": "yourNickname",

​    "toFaceURL": "yourFaceURL",

​    "handleResult": 1,

​    "reqMsg": "hello!",

​    "createTime": 1688460586632,

​    "handlerUserID": "admin",

​    "handleMsg": "agree",

​    "handleTime": 1688460590618,

​    "ex": ""

   }

  ],

  "total": 2

 }

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## *POST /friend/get_friend_list*（*好友列表*）

功能: 好友列表

对应 RPC: relation.Friend/GetPaginationFriends

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段        | 类型    | 必填 | 说明                                               |
| --------------------- | ----------------- | ------------------ | ------------------------------------------------------------ |
| pagination            | RequestPagination | true               | 分页参数，包含 pageNumber（页码）和 showNumber（每页数量）。 |
| pagination.pageNumber | int               | true               | 当前页码，从 1 开始                                          |
| pagination.showNumber | int               | true               | 当前页请求数量                                               |
| userID                | string            | true               | 用户唯一 ID，格式示例：user_10001。                          |

### 响应（Resp）

- Go 类型：relation.GetPaginationFriendsResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| ownerUserID    | string         | 用户 ID        |
| remark         | string         | 备注           |
| createTime     | int64          | 创建时间       |
| friendUser     | UserInfo       | 用户信息对象   |
| addSource      | int32          | 添加来源       |
| operatorUserID | string         | 操作者 ID      |
| ex             | string         | 扩展字段       |

 

| 字段   | 类型 | 说明                          |
| ---------------- | -------------- | --------------------------------------- |
| UserInfo         | Object         | 用户信息                                |
| userID           | string         | 用户ID                                  |
| nickname         | string         | 用户名                                  |
| faceURL          | string         | 用户头像URL                             |
| ex               | string         | 扩展字段                                |
| createTime       | int            | 创建时间                                |
| globalRecvMsgOpt | int            | 全局是否接收离线推送 0：接收；2：不接收 |

### 示例请求

{

 "pagination": {

  "pageNumber": 1,

  "showNumber": 20

 },

 "userID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": "",

 "data": {

  "friendsInfo": [

   {

​    "ownerUserID": "11111111",

​    "remark": "",

​    "createTime": 1688458955,

​    "friendUser": {

​     "userID": "11111112",

​     "nickname": "alantestuid3",

​     "faceURL": "1111111",

​     "ex": "",

​     "createTime": 0,

​     "appMangerLevel": 0,

​     "globalRecvMsgOpt": 0

​    },

​    "addSource": 2,

​    "operatorUserID": "11111111",

​    "ex": ""

   },

   {

​    "ownerUserID": "11111111",

​    "remark": "",

​    "createTime": 1688459860,

​    "friendUser": {

​     "userID": "11111113",

​     "nickname": "yourNickname",

​     "faceURL": "yourFaceURL",

​     "ex": "",

​     "createTime": 0,

​     "appMangerLevel": 0,

​     "globalRecvMsgOpt": 0

​    },

​    "addSource": 2,

​    "operatorUserID": "11111111",

​    "ex": ""

   }

  ],

  "total": 2

 }

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## *POST /friend/add_black*（*拉黑*）

功能: 拉黑

对应 RPC: relation.Friend/AddBlack

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段 | 类型 | 必填 | 说明                      |
| -------------- | -------------- | ------------------ | ----------------------------------- |
| ownerUserID    | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| blackUserID    | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| ex             | string         | false              | 扩展字段                            |

### 响应（Resp）

- Go 类型：relation.AddBlackResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "blackUserID": "user_10001",

 "ex": "example",

 "ownerUserID": "user_10001"

}

### 示例响应

{

 "errCode": 1004,

 "errMsg": "RecordNotFoundError",

 "errDlt": ": [1004]RecordNotFoundError"

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## *POST /friend/get_black_list*（*黑名单列表*）

功能: 黑名单

对应 RPC: relation.Friend/GetPaginationBlacks

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段        | 类型    | 必填 | 说明                                               |
| --------------------- | ----------------- | ------------------ | ------------------------------------------------------------ |
| userID                | string            | true               | 用户唯一 ID，格式示例：user_10001。                          |
| pagination            | RequestPagination | true               | 分页参数，包含 pageNumber（页码）和 showNumber（每页数量）。 |
| pagination.pageNumber | int               | true               | 当前页码，从 1 开始                                          |
| pagination.showNumber | int               | true               | 当前页请求数量                                               |

### 响应（Resp）

- Go 类型：relation.GetPaginationBlacksResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| ownerUserID    | string         | 用户 ID        |
| createTime     | int64          | 拉黑时间       |
| blackUserInfo  | PublicUserInfo | 被拉黑用户信息 |
| addSource      | int32          | 拉黑来源       |
| operatorUserID | string         | 操作者 ID      |
| ex             | string         | 扩展字段       |

 

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| PublicUserInfo | Object         | 被拉黑用户信息 |
| userID         | string         | 用户ID         |
| nickname       | string         | 用户名         |
| faceURL        | string         | 用户头像       |
| ex             | string         | 扩展字段       |

### 示例请求

{

 "pagination": {

  "pageNumber": 1,

  "showNumber": 20

 },

 "userID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": "",

 "data": {

  "blacks": [

   {

​    "ownerUserID": "11111111",

​    "createTime": 1688460626,

​    "blackUserInfo": {

​     "userID": "11111113",

​     "nickname": "yourNickname",

​     "faceURL": "yourFaceURL",

​     "ex": ""

​    },

​    "addSource": 0,

​    "operatorUserID": "admin",

​    "ex": ""

   }

  ],

  "total": 1

 }

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)

## *POST /friend/remove_black*（*移除黑名单*）

功能: 移除黑名单

对应 RPC: relation.Friend/RemoveBlack

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段 | 类型 | 说明                      |
| -------------- | -------------- | ----------------------------------- |
| ownerUserID    | string         | 用户唯一 ID，格式示例：user_10001。 |
| blackUserID    | string         | 用户唯一 ID，格式示例：user_10001。 |

### 响应（Resp）

- Go 类型：relation.RemoveBlackResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "blackUserID": "user_10001",

 "ownerUserID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": ""

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- - 1302: Blocked by the peer (BlockedByPeer)

- - 1303: Not the peer's friend (NotPeersFriend)

- - 1304: Already in a friend relationship (RelationshipAlreadyError)

- ------



## *POST /friend/is_friend*（*是否好友*）

功能: 是否好友

对应 RPC: relation.Friend/IsFriend

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段 | 类型 | 说明                      |
| -------------- | -------------- | ----------------------------------- |
| userID1        | string         | 用户唯一 ID，格式示例：user_10001。 |
| userID2        | string         | 用户唯一 ID，格式示例：user_10001。 |

### 响应（Resp）

- Go 类型：relation.IsFriendResp

| 字段 | 类型 | 说明                        |
| -------------- | -------------- | ------------------------------------- |
| inUser1Friends | bool           | ture: userID2 在 userID1 的好友列表中 |
| inUser2Friends | bool           | ture: userID1 在 userID2 的好友列表中 |

### 示例请求

{

 "userID1": "user_10001",

 "userID2": "user_10001"

}

### 示例响应

{

 "inUser1Friends": true, 

 "inUser2Friends": true

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## *POST /friend/update_friends*（*更新好友信息*）

功能: 更新好友关系

对应 RPC: relation.Friend/UpdateFriends

功能与使用场景: 好友关系接口，用于申请、处理与查询好友，适用于社交关系管理。

逻辑说明:

- 记录申请并通知目标用户（推送/消息）。

- 处理同意/拒绝并更新双向关系数据。

- 维护好友相关的备注/分组/黑名单状态。

| 字段 | 类型 | 必填 | 说明                      |
| -------------- | -------------- | ------------------ | ----------------------------------- |
| ownerUserID    | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| friendUserIDs  | string         | true               | 用户唯一 ID，格式示例：user_10001。 |
| isPinned       | bool           | false              | 是否星标                            |
| remark         | string         | false              | 备注内容                            |
| ex             | string         | false              | 扩展字段                            |

### 响应（Resp）

- Go 类型：relation.UpdateFriendsResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "ex": "example",

 "friendUserIDs": [

  "user_10001"

 ],

 "isPinned": true,

 "ownerUserID": "user_10001",

 "remark": "example"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": ""

}

### 错误码

- 1301: Cannot add yourself as a friend (CanNotAddYourselfError)

- 1302: Blocked by the peer (BlockedByPeer)

- 1303: Not the peer's friend (NotPeersFriend)

- 1304: Already in a friend relationship (RelationshipAlreadyError)



------



## *POST /group/create_group*（*创建群*）

功能: 创建群

对应 RPC: group.Group/CreateGroup

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段              | 类型 | 必填 | 说明         |
| --------------------------- | -------------- | ------------------ | ---------------------- |
| memberUserIDs               | array          | false              | 群成员列表             |
| groupInfo                   | GroupInfo      | true               | 群信息列表             |
| adminUserIDs                | array          | false              | 群管理员列表           |
| ownerUserID                 | string         | true          | 群主（群主只能是自己，，，，管理后台会有个超级管理员，可以指定群主） |
| groupInfo.groupID           | string         | false              | 群ID                   |
| groupInfo.groupName         | string         | true               | 群名称                 |
| groupInfo.notification      | string         | false              | 群公告                 |
| groupInfo.introduction      | string         | false              | 群介绍                 |
| groupInfo.faceURL           | string         | false              | 群头像地址             |
| groupInfo.groupType | int | true | 群类型:0普通群，1：大群 2：工作群。目前只支持2 |
| groupInfo.ex                | string         | false              | 群扩展信息             |
| groupInfo.needVerification  | int            | false              | 进群是否需要验证 0:所有人需要验证 1:直接加入无需验证 2:群成员邀请无需验证 |
| groupInfo.lookMemberInfo    | int            | false              | 能否查看其他群成员信息 |
| groupInfo.applyMemberFriend | int            | false              | 群成员是否允许添加好友 |

### 响应（Resp）

- Go 类型：group.CreateGroupResp

| 字段         | 类型 | 说明                                               |
| ---------------------- | -------------- | ------------------------------------------------------------ |
| groupID                | string         | 群ID                                                         |
| groupName              | string         | 群名称                                                       |
| notification           | string         | 群公告                                                       |
| introduction           | string         | 群介绍                                                       |
| faceURL                | string         | 群头像                                                       |
| ownerUserID            | string         | 群主ID                                                       |
| createTime             | int64          | 创建时间                                                     |
| memberCount            | uint32         | 群成员数量                                                   |
| ex                     | string         | 群扩展字段                                                   |
| status                 | int32          | 群状态0：正常状态；1：被封禁（暂未用）；2：被解散；3：处于全体禁言状态 |
| creatorUserID          | string         | 群创建者 ID                                                  |
| needVerification       | int32          | 进群是否需要验证 0:所有人需要验证 1:直接加入无需验证 2:群成员邀请无需验证 |
| lookMemberInfo         | int32          | 是否能查看其他群成员信息 0：允许查看群成员信息；1：不允许查看群成员信息 |
| applyMemberFriend      | int32          | 群成员是否能添加好友 0：允许从群成员处添加好友；1：不允许添加 |
| notificationUpdateTime | int64          | 群公告最后更新时间                                           |
| notificationUserID     | string         | 群公告最后设置用户 ID                                        |

### 示例请求

{

 "adminUserIDs": [

  "user_10001"

 ],

 "groupInfo": {

  "createTime": 1700000000,

  "faceURL": "https://cdn.example.com/groups/20001.png",

  "groupID": "group_20001",

  "groupName": "Study Group",

  "memberCount": 12,

  "notification": "Be nice",

  "ownerUserID": "user_10001"

 },

 "memberUserIDs": [

  "user_10001"

 ],

 "ownerUserID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": "",

 "data": {

  "groupInfo": {

   "groupID": "xadxwr24",

   "groupName": "yourg group name",

   "notification": "notification",

   "introduction": "introduction",

   "faceURL": "faceURL url",

   "ownerUserID": "199975690",

   "createTime": 1679656402377,

   "memberCount": 4,

   "ex": "ex",

   "status": 0,

   "creatorUserID": "",

   "groupType": 2,

   "needVerification": 0,

   "lookMemberInfo": 0,

   "applyMemberFriend": 0,

   "notificationUpdateTime": 0,

   "notificationUserID": ""

  }

 }

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/set_group_info_ex*（*设置群信息*）

功能: 设置群信息(扩展)

对应 RPC: group.Group/SetGroupInfoEx

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段    | 类型 | 必填 | 说明                                               |
| ----------------- | -------------- | ------------------ | ------------------------------------------------------------ |
| groupID           | string         | true               | 要修改的群ID                                                 |
| groupName         | string         | false              | 新群名                                                       |
| notification      | string         | false              | 新群公告                                                     |
| introduction      | string         | false              | 新群介绍                                                     |
| faceURL           | string         | false              | 新群头像                                                     |
| ex                | string         | false              | 新群扩展字段                                                 |
| needVerification  | int            | false              | 进群是否需要验证；0：申请加入群需要同意，成员邀请可直接进群，1：所有人进群需要验证，除了群主管理员邀请进群，2：直接进群 |
| lookMemberInfo    | int            | false              | 是否能查看其他群成员信息；0：允许查看群成员信息，1：不允许查看群成员信息 |
| applyMemberFriend | int            | false              | 群成员是否能添加好友；0：允许从群成员处添加好友，1：不允许添加 |

### 响应（Resp）

- Go 类型：group.SetGroupInfoExResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "applyMemberFriend": 123,

 "ex": "example",

 "faceURL": "https://cdn.example.com/files/abcd.jpg",

 "groupID": "group_20001",

 "groupName": "Alice",

 "introduction": "example",

 "lookMemberInfo": 123,

 "needVerification": 123,

 "notification": "example"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": ""

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/join_group*（*申请入群*）

功能: 申请入群

对应 RPC: group.Group/JoinGroup

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                                               |
| -------------- | -------------- | ------------------ | ------------------------------------------------------------ |
| groupID        | string         | true               | 群组唯一 ID，格式示例：group_20001。                         |
| reqMessage     | string         | false              | 申请信息                                                     |
| joinSource     | int32          | true               | 加群来源，1：管理员邀请，2：被邀请，3：搜索加入，4：扫码加入 |
| inviterUserID  | string         | true               | 申请者ID                                                     |
| ex             | string         | false              | 扩展字段                                                     |

### 响应（Resp）

- Go 类型：group.JoinGroupResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "ex": "example",

 "groupID": "group_20001",

 "inviterUserID": "user_10001",

 "joinSource": 123,

 "reqMessage": "example"

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/quit_group*（*退群*）

功能: 退群

对应 RPC: group.Group/QuitGroup

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                       |
| -------------- | -------------- | ------------------ | ------------------------------------ |
| groupID        | string         | true               | 群组唯一 ID，格式示例：group_20001。 |
| userID         | string         | true               | 用户唯一 ID，格式示例：user_10001。  |

### 响应（Resp）

- Go 类型：group.QuitGroupResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "groupID": "group_20001",

 "userID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": ""

}

 

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/group_application_response*（*处理入群申请*）

功能: 群申请响应

对应 RPC: group.Group/GroupApplicationResponse

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                                |
| -------------- | -------------- | ------------------ | --------------------------------------------- |
| groupID        | string         | true               | 群组唯一 ID，格式示例：group_20001。          |
| fromUserID     | string         | true               | 申请用户ID                                    |
| handledMsg     | string         | false              | 处理信息                                      |
| handleResult   | int32          | true               | 处理结果；-1：拒绝该用户加群，1：同意用户加群 |

### 响应（Resp）

- Go 类型：group.GroupApplicationResponseResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "fromUserID": "user_10001",

 "groupID": "group_20001",

 "handleResult": 123,

 "handledMsg": "example"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": ""

}

 

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/transfer_group*(转让群主)

功能: 转让群主

对应 RPC: group.Group/TransferGroupOwner

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 是否必填 | 说明                       |
| -------------- | -------------- | ------------------ | ------------------------------------ |
| groupID        | string         | true               | 群组唯一 ID，格式示例：group_20001。 |
| oldOwnerUserID | string         | true               | 原群主                               |
| newOwnerUserID | string         | true               | 新群主                               |

### 响应（Resp）

- Go 类型：group.TransferGroupOwnerResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "groupID": "group_20001",

 "newOwnerUserID": "user_10001",

 "oldOwnerUserID": "user_10001"

}

### 示例响应

{

 "errCode": 0,

 "errMsg": "",

 "errDlt": ""

}

 

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/get_groups_info*（*获取群信息*）

功能: 获取群信息

对应 RPC: group.Group/GetGroupsInfo

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                       |
| -------------- | -------------- | -------------- | ------------------------------------ |
| groupIDs       | Array          | true           | 群组唯一 ID，格式示例：group_20001。 |

### 响应（Resp）

- Go 类型：group.GetGroupsInfoResp

| 字段         | 类型 | 说明                                               |
| ---------------------- | -------------- | ------------------------------------------------------------ |
| GroupInfo              | Object         | 群信息                                                       |
| groupID                | string         | 群 ID                                                        |
| groupName              | string         | 群名称                                                       |
| notification           | string         | 群公告                                                       |
| introduction           | string         | 群介绍                                                       |
| faceURL                | string         | 群头像URL                                                    |
| ownerUserID            | string         | 群主 ID                                                      |
| createTime             | int64          | 创建时间                                                     |
| memberCount            | uint32         | 群成员数量                                                   |
| ex                     | string         | 群扩展字段                                                   |
| status                 | int32          | 群状态 0：正常状态；1：被封禁（暂未用）；2：被解散；3：处于全体禁言状态 |
| creatorUserID          | string         | 群创建者 ID                                                  |
| groupType              | int32          | 群类型                                                       |
| needVerification       | int32          | 进群是否需要验证 0：申请加入群需要同意，成员邀请可直接进群；1：所有人进群需要验证，除了群主管理员邀请进群；2：直接进群 |
| lookMemberInfo         | int32          | 是否能查看其他群成员信息 0：允许查看群成员信息；1：不允许查看群成员信息 |
| applyMemberFriend      | int32          | 群成员是否能添加好友 0：允许从群成员处添加好友；1：不允许添加 |
| notificationUpdateTime | int64          | 群公告最后更新时间                                           |
| notificationUserID     | string         | 群公告最后设置用户 ID                                        |

### 示例请求

{

 "groupIDs": [

  "group_20001"

 ]

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": "",

"data": {

"groupInfos": [

{

"groupID": "2559217223",

"groupName": "Group1",

"notification": "",

"introduction": "",

"faceURL": "",

"ownerUserID": "4771680259",

"createTime": 1687760824104,

"memberCount": 5,

"ex": "",

"status": 0,

"creatorUserID": "4771680259",

"groupType": 2,

"needVerification": 0,

"lookMemberInfo": 0,

"applyMemberFriend": 0,

"notificationUpdateTime": 0,

"notificationUserID": ""

},

{

"groupID": "2137448827",

"groupName": "11111",

"notification": "",

"introduction": "",

"faceURL": "",

"ownerUserID": "3517105008",

"createTime": 1687753739612,

"memberCount": 3,

"ex": "",

"status": 0,

"creatorUserID": "2699373280",

"groupType": 2,

"needVerification": 0,

"lookMemberInfo": 0,

"applyMemberFriend": 0,

"notificationUpdateTime": 0,

"notificationUserID": ""

}

]

}

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/kick_group*（*踢人*）

功能: 踢人

对应 RPC: group.Group/KickGroupMember

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                       |
| -------------- | -------------- | -------------- | ------------------------------------ |
| groupID        | string         | true           | 群组唯一 ID，格式示例：group_20001。 |
| kickedUserIDs  | Array          | true           | 被移除群的用户ID列表                 |
| reason         | string         | false          | 被移除群的原因                       |

### 响应（Resp）

- Go 类型：group.KickGroupMemberResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "groupID": "group_20001",

 "kickedUserIDs": [

  "user_10001"

 ],

 "reason": "example"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/get_group_members_info*（*群成员信息*）

功能: 群成员信息

对应 RPC: group.Group/GetGroupMembersInfo

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                       |
| -------------- | -------------- | ------------------ | ------------------------------------ |
| groupID        | string         | false              | 群组唯一 ID，格式示例：group_20001。 |
| userIDs        | Array          | true               | 用户唯一 ID，格式示例：user_10001。  |

### 响应（Resp）

- Go 类型：group.GetGroupMembersInfoResp

| 字段 | 类型 | 必填 | 说明                                               |
| -------------- | -------------- | ------------------ | ------------------------------------------------------------ |
| groupID        | string         | true               | 群 ID                                                        |
| userID         | string         | true               | 群成员 ID                                                    |
| roleLevel      | int32          | true               | 群成员等级 100：群主；60：管理员；20：普通成员               |
| joinTime       | int64          | true               | 群成员加群时间                                               |
| nickname       | string         | true               | 群成员群昵称                                                 |
| faceURL        | string         | true               | 群成员头像URL                                                |
| appMangerLevel | int32          | true               |                                                              |
| joinSource     | int32          | true               | 加群来源 1：管理员邀请；2：群成员邀请；3：搜索加入；4：扫码加入 |
| operatorUserID | string         | true               | 操作加群的用户 ID                                            |
| ex             | string         | true               | 群成员扩展字段                                               |
| muteEndTime    | int64          | true               | 封禁结束时间                                                 |
| inviterUserID  | string         | true               | 邀请进群的人的 ID                                            |

### 示例请求

{

 "groupID": "group_20001",

 "userIDs": [

  "user_10001"

 ]

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": "",

"data": {

"members": [

{

"groupID": "xadxwr24",

"userID": "199975690",

"roleLevel": 2,

"joinTime": 1679656402380,

"nickname": "Jason",

"faceURL": "ic_avatar_05",

"appMangerLevel": 0,

"joinSource": 2,

"operatorUserID": "admin",

"ex": "",

"muteEndTime": 0,

"inviterUserID": "admin"

},

{

"groupID": "xadxwr24",

"userID": "1910095287",

"roleLevel": 1,

"joinTime": 1679656402380,

"nickname": "2234",

"faceURL": "",

"appMangerLevel": 0,

"joinSource": 2,

"operatorUserID": "admin",

"ex": "",

"muteEndTime": 0,

"inviterUserID": "admin"

}

]

}

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/get_group_member_list*(群成员列表)

功能: 群成员列表

对应 RPC: group.Group/GetGroupMemberList

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型    | 必填 | 说明                                               |
| -------------- | ----------------- | -------------- | ------------------------------------------------------------ |
| pagination     | RequestPagination | True           | 分页参数，包含 pageNumber（页码）和 showNumber（每页数量）。 |
| groupID        | string            | true           | 群组唯一 ID，格式示例：group_20001。                         |
| keyword        | string            | false          | 关键字                                                       |

### 响应（Resp）

- Go 类型：group.GetGroupMemberListResp

| 字段 | 类型 | 说明                                               |
| -------------- | -------------- | ------------------------------------------------------------ |
| groupID        | string         | 群 ID                                                        |
| userID         | string         | 群成员 ID                                                    |
| roleLevel      | int32          | 群成员等级 100：群主；60：管理员；20：普通成员               |
| joinTime       | int64          | 群成员加群时间                                               |
| nickname       | string         | 群成员群昵称                                                 |
| faceURL        | string         | 群成员头像URL                                                |
| appMangerLevel | int32          |                                                              |
| joinSource     | int32          | 加群来源 1：管理员邀请；2：群成员邀请；3：搜索加入；4：扫码加入 |
| operatorUserID | string         | 操作加群的用户 ID                                            |
| ex             | string         | 群成员扩展字段                                               |
| muteEndTime    | int64          | 封禁结束时间                                                 |
| inviterUserID  | string         | 邀请进群的人的 ID                                            |

 

### 示例请求

{

 "filter": 123,

 "groupID": "group_20001",

 "keyword": "example",

 "pagination": {

  "pageNumber": 1,

  "showNumber": 20

 }

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": "",

"data": {

"total": 5,

"members": [

{

"groupID": "2559217223",

"userID": "3034068043",

"roleLevel": 20,

"joinTime": 1687762198048,

"nickname": "OK",

"faceURL": "http://203.56.175.233:10002/third/object?Fcache%2Fimage_cropper_1687330588901.jpg",

"appMangerLevel": 0,

"joinSource": 2,

"operatorUserID": "4771680259",

"ex": "",

"muteEndTime": 0,

"inviterUserID": "4771680259"

},

{

"groupID": "2559217223",

"userID": "3645617224",

"roleLevel": 60,

"joinTime": 1687762198048,

"nickname": "Huo",

"faceURL": "http://203.56.175.233:10002/third/object?Fimage_cropper_1687846002615.jpg",

"appMangerLevel": 0,

"joinSource": 2,

"operatorUserID": "4771680259",

"ex": "",

"muteEndTime": 0,

"inviterUserID": "4771680259"

},

{

"groupID": "2559217223",

"userID": "3791793226",

"roleLevel": 20,

"joinTime": 1687760824107,

"nickname": "Wo",

"faceURL": "",

"appMangerLevel": 0,

"joinSource": 2,

"operatorUserID": "4771680259",

"ex": "",

"muteEndTime": 0,

"inviterUserID": "4771680259"

},

{

"groupID": "2559217223",

"userID": "4771680259",

"roleLevel": 100,

"joinTime": 1687760824107,

"nickname": "Lumia",

"faceURL": "http://203.56.175.233:10002/third/object?

Fimage_cropper_1687330764676.jpg",

"appMangerLevel": 0,

"joinSource": 2,

"operatorUserID": "4771680259",

"ex": "",

"muteEndTime": 0,

"inviterUserID": "4771680259"

},

{

"groupID": "2559217223",

"userID": "7117248489",

"roleLevel": 20,

"joinTime": 1687762198048,

"nickname": "Hello",

"faceURL": "",

"appMangerLevel": 0,

"joinSource": 2,

"operatorUserID": "4771680259",

"ex": "",

"muteEndTime": 0,

"inviterUserID": "4771680259"

}

]

}

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/invite_user_to_group*(邀请入群)

功能: 邀请入群

对应 RPC: group.Group/InviteUserToGroup

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明     |
| -------------- | -------------- | -------------- | ------------------ |
| groupID        | string         | True           | 群ID               |
| reason         | string         | false          | 邀请说明           |
| invitedUserIDs | array          | true           | 被邀请的用户ID列表 |

### 响应（Resp）

- Go 类型：group.InviteUserToGroupResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "groupID": "group_20001",

 "invitedUserIDs": [

  "user_10001"

 ],

 "reason": "example"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/dismiss_group*（*解散群*）

功能: 解散群

对应 RPC: group.Group/DismissGroup

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                       |
| -------------- | -------------- | -------------- | ------------------------------------ |
| groupID        | string         | True           | 群组唯一 ID，格式示例：group_20001。 |
| deleteMember   | bool           | false          | 是否删除群成员信息                   |

### 响应（Resp）

- Go 类型：group.DismissGroupResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无         |                |                |

### 示例请求

{

 "deleteMember": true,

 "groupID": "group_20001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": "",

"data": null

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/mute_group_member*（*禁言群成员*）

功能: 禁言群成员

对应 RPC: group.Group/MuteGroupMember

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                       |
| -------------- | -------------- | -------------- | ------------------------------------ |
| groupID        | string         | True           | 群组唯一 ID，格式示例：group_20001。 |
| userID         | string         | true           | 用户唯一 ID，格式示例：user_10001。  |
| mutedSeconds   | uint32         | true           | 被禁言的秒数                         |

### 响应（Resp）

- Go 类型：group.MuteGroupMemberResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无   |                |                |

### 示例请求

{

 "groupID": "group_20001",

 "mutedSeconds": 123,

 "userID": "user_10001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/cancel_mute_group_member*（*取消禁言群成员*）

功能: 取消禁言群成员

对应 RPC: group.Group/CancelMuteGroupMember

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | *说明                       |
| -------------- | -------------- | ------------------ | ------------------------------------ |
| groupID        | string         | true          | 群组唯一 ID，格式示例：group_20001。 |
| userID         | string         | true          | 用户唯一 ID，格式示例：user_10001。  |

### 响应（Resp）

- Go 类型：group.CancelMuteGroupMemberResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "groupID": "group_20001",

 "userID": "user_10001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/mute_group*（*全员禁言*）

功能: 全员禁言

对应 RPC: group.Group/MuteGroup

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                       |
| -------------- | -------------- | ------------------ | ------------------------------------ |
| groupID        | string         | true      | 群组唯一 ID，格式示例：group_20001。 |

### 响应（Resp）

- Go 类型：group.MuteGroupResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "groupID": "group_20001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /group/cancel_mute_group*（*取消全员禁言*）

功能: 取消全员禁言

对应 RPC: group.Group/CancelMuteGroup

功能与使用场景: 群组管理接口，包含建群、邀请、成员管理等，适用于社群、讨论组等场景。

逻辑说明:

- 校验发起者权限（如创建者/管理员）。

- 更新群成员关系并持久化到群服务。

- 发送群通知（如需要）并更新群成员缓存/计数。

| 字段 | 类型 | 必填 | 说明                       |
| -------------- | -------------- | ------------------ | ------------------------------------ |
| groupID        | string         | true          | 群组唯一 ID，格式示例：group_20001。 |

### 响应（Resp）

- Go 类型：group.CancelMuteGroupResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "groupID": "group_20001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- 1201: GroupID does not exist (GroupIDNotFoundError)

- 1202: GroupID already exists (GroupIDExisted)

- 1203: Not in the group yet (NotInGroupYetError)

- 1204: Group has already been dismissed (DismissedAlreadyError)

- 1206: Relationship error codes. (GroupRequestHandled)



------



## *POST /conversation/get_sorted_conversation_list*（*排序后的会话列表*）

功能: 排序会话列表

对应 RPC: conversation.Conversation/GetSortedConversationList

功能与使用场景: 消息与会话相关接口，用于发送、拉取、撤回消息或会话操作，适用于实时聊天场景。

逻辑说明:

- 校验发送者权限与会话状态（黑名单/免打扰等）。

- 调用消息服务进行消息入库、投递（可能异步）、更新会话元信息。

- 返回消息序号/状态，客户端根据结果展示或重试。

| 字段  | 类型    | 必填 | 说明                                               |
| --------------- | ----------------- | -------------- | ------------------------------------------------------------ |
| userID          | string            | true          | 用户唯一 ID，格式示例：user_10001。                          |
| conversationIDs | string            | false         | 会话 ID，通常为两端拼接或系统生成的唯一标识。                |
| pagination      | RequestPagination | false          | 分页参数，包含 pageNumber（页码）和 showNumber（每页数量）。 |

### 响应（Resp）

- Go 类型：conversation.GetSortedConversationListResp

| 字段    | 类型 | 说明                                               |
| ----------------- | -------------- | ------------------------------------------------------------ |
| errCode           | int            | 错误码，0表示成功                                            |
| errMsg            | string         | 错误简要信息，为空                                           |
| errDlt            | errDlt         | 错误详细信息，为空                                           |
| unreadTotal       | string         | 未读数总数                                                   |
| conversationToal  | string         | 会话数总数                                                   |
| data              | object         | 通用数据对象，具体结构见下方                                 |
| conversationElems | array          | 无                                                           |
| conversationID    | string         | 会话ID                                                       |
| recvMsgOpt        | string         | 群聊消息免打扰                                               |
| unreadCount       | string         | 未读消息数                                                   |
| msgInfo           | object         | 消息内容                                                     |
| serverMsgID       | string         | 服务器消息ID                                                 |
| clientMsgID       | string         | 客户端消息ID                                                 |
| sessionType       | string         | 会话类型，发送的消息是单聊还是群聊,单聊为1，群聊（普通写扩散）为2,大群(读扩散接口)为3，通知会话为4 |
| recvID            | string         | 接收者ID                                                     |
| SendID            | string         | 发送者ID                                                     |
| faceURL           | string         | 头像URL。在单聊中，当发送者为当前用户时，该字段为好友头像URL |
| senderName        | string         | 发送者呢称。在单聊中，当发送者为当前用户时，该字段为好友呢称。在群聊中，该字段为对应的发送者呢称 |
| LatestMsgRecvTime | string         | 最后一条消息的接收时间                                       |
| msgFrom           | string         | 消息来源，100来源于用户发送，200来源于管理员发送或者系统广播通知等 |
| content           | object         | 消息的具体内容，内部是json 对象，其他消息的详细字段请参考[消息类型格式描述](https://docs.openim.io/zh-Hans/restapi/contentDescription)文档 |
| contentType       | int            | [消息类型](https://docs.openim.io/zh-Hans/restapi/contentDescription) |
| groupID           | string         | 群聊ID                                                       |
| groupName         | string         | 群聊名称                                                     |
| groupFaceURL      | string         | 群聊头像URL                                                  |
| groupMemberCount  | string         | 群聊人数                                                     |
| IsPinned          | string         | 会话是否置顶                                                 |
| ex                | string         | 拓展字段                                                     |

### 示例请求

{

 "conversationIDs": [

  "conv_user_10001_user_10002"

 ],

 "pagination": {

  "pageNumber": 1,

  "showNumber": 20

 },

 "userID": "user_10001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": "",

"data": {

"conversationTotal": 2,

"unreadTotal": 2,

"conversationElems": [

{

"conversationID": "si_110_114",

"recvMsgOpt": 0,

"unreadCount": 1,

"IsPinned": false,

"msgInfo": {

"serverMsgID": "c54203436b727117226cb528fc7b08e8",

"clientMsgID": "c972d53afb9d6b9744f1edfc4ac1aeef",

"sessionType": 1,

"sendID": "114",

"recvID": "110",

"senderName": "yourNickname",

"faceURL": "yourFaceURL",

"groupID": "",

"groupName": "",

"groupFaceURL": "",

"groupType": 0,

"groupMemberCount": 0,

"LatestMsgRecvTime": 1695212630741,

"msgFrom": 200,

"contentType": 101,

"content": "{"content":"hello!!"}",

"ex":""

}

},

{

"conversationID": "si_110_111",

"recvMsgOpt": 0,

"unreadCount": 1,

"IsPinned": false,

"msgInfo": {

"serverMsgID": "5c3d8542f9eae1487283a5fe335aab1a",

"clientMsgID": "e09109bdfeb221cec1827317c313e3d0",

"sessionType": 1,

"sendID": "111",

"recvID": "110",

"senderName": "yourNickname",

"faceURL": "yourFaceURL",

"groupID": "",

"groupName": "",

"groupFaceURL": "",

"groupType": 0,

"groupMemberCount": 0,

"LatestMsgRecvTime": 1695212630740,

"msgFrom": 200,

"contentType": 101,

"content": "{"content":"hello!!"}",

"ex":""

}

}

]

}

}

### 错误码

- 0: No error (NoError)

- 1001: Input parameter error (ArgsError)

- 500: Server internal error (ServerInternalError)

- 1002: Insufficient permission (NoPermissionError)



------



## *POST /conversation/get_not_notify_conversation_ids*(免打扰ids)

功能: 免打扰 IDs

对应 RPC: conversation.Conversation/GetNotNotifyConversationIDs

功能与使用场景: 消息与会话相关接口，用于发送、拉取、撤回消息或会话操作，适用于实时聊天场景。

逻辑说明:

- 校验发送者权限与会话状态（黑名单/免打扰等）。

- 调用消息服务进行消息入库、投递（可能异步）、更新会话元信息。

- 返回消息序号/状态，客户端根据结果展示或重试。

| 字段 | 类型 | 必填 | 说明                      |
| -------------- | -------------- | -------------- | ----------------------------------- |
| userID         | string         | true          | 用户唯一 ID，格式示例：user_10001。 |

### 响应（Resp）

- Go 类型：conversation.GetNotNotifyConversationIDsResp

| 字段  | 类型 | 说明   |
| --------------- | -------------- | ---------------- |
| conversationIDs | Array          | 免打扰的会话列表 |

### 示例请求

{

 "userID": "user_10001"

}

### 示例响应

{

 "conversationIDs": ["string"]

}

### 错误码

- 0: No error (NoError)

- 1001: Input parameter error (ArgsError)

- 500: Server internal error (ServerInternalError)

- 1002: Insufficient permission (NoPermissionError)



------



## *POST /conversation/get_pinned_conversation_ids*(置顶ids)

功能: 置顶 IDs

对应 RPC: conversation.Conversation/GetPinnedConversationIDs

功能与使用场景: 消息与会话相关接口，用于发送、拉取、撤回消息或会话操作，适用于实时聊天场景。

逻辑说明:

- 校验发送者权限与会话状态（黑名单/免打扰等）。

- 调用消息服务进行消息入库、投递（可能异步）、更新会话元信息。

- 返回消息序号/状态，客户端根据结果展示或重试。

| 字段 | 类型 | 必填 | 说明                      |
| -------------- | -------------- | -------------- | ----------------------------------- |
| userID         | string         | true          | 用户唯一 ID，格式示例：user_10001。 |

### 响应（Resp）

- Go 类型：conversation.GetPinnedConversationIDsResp

| 字段  | 类型 | 说明                     |
| --------------- | -------------- | ---------------------------------- |
| conversationIDs | array          | 参数说明请参考协议定义或后端实现。 |

### 示例请求

{

 "userID": "user_10001"

}

### 示例响应

{

 "conversationIDs": ["string"]

}

### 错误码

- 0: No error (NoError)

- 1001: Input parameter error (ArgsError)

- 500: Server internal error (ServerInternalError)

- 1002: Insufficient permission (NoPermissionError)



------



## *POST /msg/revoke_msg*(撤回消息)

功能: 撤回消息

对应 RPC: msg.Msg/RevokeMsg

功能与使用场景: 消息与会话相关接口，用于发送、拉取、撤回消息或会话操作，适用于实时聊天场景。

逻辑说明:

- 校验发送者权限与会话状态（黑名单/免打扰等）。

- 调用消息服务进行消息入库、投递（可能异步）、更新会话元信息。

- 返回消息序号/状态，客户端根据结果展示或重试。

| 字段 | 类型 | 必填 | 说明                                |
| -------------- | -------------- | -------------- | --------------------------------------------- |
| conversationID | string         | true      | 会话 ID，通常为两端拼接或系统生成的唯一标识。 |
| seq            | int64          | true      | 消息序列号，用于消息定位与幂等处理。          |
| userID         | string         | true      | 用户唯一 ID，格式示例：user_10001。           |

### 响应（Resp）

- Go 类型：msg.RevokeMsgResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "conversationID": "conv_user_10001_user_10002",

 "seq": 1001,

 "userID": "user_10001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- MessageHasReadDisable: (code not found)

- 1402: Member muted in the group (MutedInGroup)

- 1403: Group is muted (MutedGroup)

- 1404: Message already revoked (MsgAlreadyRevoke)



------



## *POST /msg/mark_msgs_as_read*（*标记已读*）

功能: 标记已读

对应 RPC: msg.Msg/MarkMsgsAsRead

功能与使用场景: 消息与会话相关接口，用于发送、拉取、撤回消息或会话操作，适用于实时聊天场景。

逻辑说明:

- 校验发送者权限与会话状态（黑名单/免打扰等）。

- 调用消息服务进行消息入库、投递（可能异步）、更新会话元信息。

- 返回消息序号/状态，客户端根据结果展示或重试。

| 字段 | 类型 | 必填 | 说明                                |
| -------------- | -------------- | -------------- | --------------------------------------------- |
| conversationID | string         | True           | 会话 ID，通常为两端拼接或系统生成的唯一标识。 |
| seqs           | int64          | true           | 消息序列号，用于消息定位与幂等处理。          |
| userID         | string         | True           | 用户唯一 ID，格式示例：user_10001。           |

### 响应（Resp）

- Go 类型：msg.MarkMsgsAsReadResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "conversationID": "conv_user_10001_user_10002",

 "seqs": [

  1001

 ],

 "userID": "user_10001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- MessageHasReadDisable: (code not found)

- 1402: Member muted in the group (MutedInGroup)

- 1403: Group is muted (MutedGroup)

- 1404: Message already revoked (MsgAlreadyRevoke)



------



## *POST /msg/mark_conversation_as_read*（*会话已读*）

功能: 会话已读

对应 RPC: msg.Msg/MarkConversationAsRead

功能与使用场景: 消息与会话相关接口，用于发送、拉取、撤回消息或会话操作，适用于实时聊天场景。

逻辑说明:

- 校验发送者权限与会话状态（黑名单/免打扰等）。

- 调用消息服务进行消息入库、投递（可能异步）、更新会话元信息。

- 返回消息序号/状态，客户端根据结果展示或重试。

| 字段 | 类型 | 必填 | 说明                                |
| -------------- | -------------- | ------------------ | --------------------------------------------- |
| conversationID | string         | true          | 会话 ID，通常为两端拼接或系统生成的唯一标识。 |
| userID         | string         | true          | 用户唯一 ID，格式示例：user_10001。           |
| hasReadSeq     | int64          | false         | 标记已读到的最大消息序号，表示该序号及之前的所有消息都已读 |
| seqs           | int64          | false          | 指定的消息序号列表，用于标记特定消息已读 |

### 响应（Resp）

- Go 类型：msg.MarkConversationAsReadResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "conversationID": "conv_user_10001_user_10002",

 "hasReadSeq": 1001,

 "seqs": [

  1001

 ],

 "userID": "user_10001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

 

### 错误码

- MessageHasReadDisable: (code not found)

- 1402: Member muted in the group (MutedInGroup)

- 1403: Group is muted (MutedGroup)

- 1404: Message already revoked (MsgAlreadyRevoke)



------



## *POST /msg/clear_conversation_msg*（*清空会话消息*）

功能: 清空会话消息

对应 RPC: msg.Msg/ClearConversationsMsg

功能与使用场景: 消息与会话相关接口，用于发送、拉取、撤回消息或会话操作，适用于实时聊天场景。

逻辑说明:

- 校验发送者权限与会话状态（黑名单/免打扰等）。

- 调用消息服务进行消息入库、投递（可能异步）、更新会话元信息。

- 返回消息序号/状态，客户端根据结果展示或重试。

| 字段  | 类型 | 必填 | 说明                                |
| --------------- | -------------- | -------------- | --------------------------------------------- |
| conversationIDs | string         | true           | 会话 ID，通常为两端拼接或系统生成的唯一标识。 |
| userID          | string         | True           | 用户唯一 ID，格式示例：user_10001。           |

### 响应（Resp）

- Go 类型：msg.ClearConversationsMsgResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "conversationIDs": [

  "conv_user_10001_user_10002"

 ],

 "deleteSyncOpt": "example",

 "userID": "user_10001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- MessageHasReadDisable: (code not found)

- 1402: Member muted in the group (MutedInGroup)

- 1403: Group is muted (MutedGroup)

- 1404: Message already revoked (MsgAlreadyRevoke)



------



## *POST /msg/delete_msgs*（*删除消息*）

功能: 删除消息

对应 RPC: msg.Msg/DeleteMsgs

功能与使用场景: 消息与会话相关接口，用于发送、拉取、撤回消息或会话操作，适用于实时聊天场景。

逻辑说明:

- 校验发送者权限与会话状态（黑名单/免打扰等）。

- 调用消息服务进行消息入库、投递（可能异步）、更新会话元信息。

- 返回消息序号/状态，客户端根据结果展示或重试。

| 字段 | 类型 | 必填 | 说明                                |
| -------------- | -------------- | -------------- | --------------------------------------------- |
| conversationID | string         | true           | 会话 ID，通常为两端拼接或系统生成的唯一标识。 |
| seqs           | int64          | true           | 消息序列号，用于消息定位与幂等处理。          |
| userID         | string         | true           | 用户唯一 ID，格式示例：user_10001。           |

### 响应（Resp）

- Go 类型：msg.DeleteMsgsResp

| 字段 | 类型 | 说明 |
| -------------- | -------------- | -------------- |
| 无             |                |                |

### 示例请求

{

 "conversationID": "conv_user_10001_user_10002",

 "deleteSyncOpt": "example",

 "seqs": [

  1001

 ],

 "userID": "user_10001"

}

### 示例响应

{

"errCode": 0,

"errMsg": "",

"errDlt": ""

}

### 错误码

- MessageHasReadDisable: (code not found)

- 1402: Member muted in the group (MutedInGroup)

- 1403: Group is muted (MutedGroup)

- 1404: Message already revoked (MsgAlreadyRevoke)



------



 