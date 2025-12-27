# Project Context

## Purpose
BoxIM (盒子IM) 是一个基于 Vue 2 的即时通讯 Web 应用，支持：
- 私聊和群聊消息
- WebRTC 音视频通话（私聊和群聊）
- 好友管理和群组管理
- 消息历史和本地缓存

## Tech Stack
- **前端框架**: Vue 2.7 + Vue Router 3
- **状态管理**: Pinia
- **UI 组件库**: Element UI 2.15
- **HTTP 客户端**: Axios 1.7
- **实时通信**: 自定义 WebSocket 客户端（心跳检测、自动重连）
- **音视频**: WebRTC
- **本地存储**: LocalForage（IndexedDB/WebSQL）
- **构建工具**: Vue CLI 4
- **协议序列化**: Protocol Buffers (protobufjs)
- **其他**: SparkMD5（文件哈希）、pinyin-pro（拼音搜索）、js-audio-recorder（录音）

## Project Conventions

### Code Style
- **语言**: JavaScript (ES6+)
- **Linting**: ESLint + eslint-plugin-vue (essential 规则集)
- **样式**: SASS/SCSS
- **组件**: Vue 单文件组件 (.vue)
- **命名规范**:
  - 组件文件: PascalCase (如 `ChatBox.vue`)
  - Store 文件: camelCase + Store 后缀 (如 `chatStore.js`)
  - API 模块: camelCase (如 `httpRequest.js`)

### Architecture Patterns

**目录结构**:
```
src/
├── api/          # HTTP、WebSocket、WebRTC 及工具模块
├── assets/       # 静态资源（图片、样式）
├── components/   # Vue 组件（按功能分组）
│   ├── chat/     # 聊天相关组件
│   ├── common/   # 通用组件
│   ├── friend/   # 好友相关组件
│   ├── group/    # 群组相关组件
│   ├── rtc/      # 音视频通话组件
│   └── setting/  # 设置相关组件
├── router/       # Vue Router 配置
├── store/        # Pinia stores
├── utils/        # 工具函数
└── view/         # 页面级组件
```

**全局属性 (main.js 挂载)**:
- HTTP: `this.$http`
- WebSocket: `this.$wsApi`
- 消息类型: `this.$msgType`
- 日期工具: `this.$date`
- 表情工具: `this.$emo`
- URL 工具: `this.$url`
- 字符串工具: `this.$str`
- DOM 工具: `this.$elm`
- 枚举常量: `this.$enums`
- 事件总线: `this.$eventBus`
- Pinia stores: `this.userStore`, `this.chatStore`, `this.friendStore`, `this.groupStore`, `this.configStore`

**消息缓存策略**:
- `chatStore.js` 采用冷热分离：近期消息保存在内存，历史消息存储在 LocalForage
- 防止大量消息导致的性能问题

**WebSocket 协议**:
- 基于命令的消息格式，使用 `cmd` 字段区分消息类型
- 连接管理在 `wssocket.js`，15 秒重连延迟

**RTC 状态机**:
- 状态流转: `FREE → WAIT_CALL/WAIT_ACCEPT → ACCEPTED → CHATING`
- 状态存储在 `userStore.js`
- 私聊通话: `rtcPrivateApi.js`
- 群聊通话: `rtcGroupApi.js`

### Testing Strategy
- 目前无自动化测试配置
- 通过 `npm run lint` 进行代码静态检查

### Git Workflow
- 开发服务器: `npm run serve`
- 生产构建: `npm run build`
- 代码检查: `npm run lint`

## Domain Context
这是一个即时通讯应用，核心业务领域包括：
- **用户认证**: 登录、注册、Token 管理
- **消息系统**: 文本、图片、文件、语音消息
- **会话管理**: 私聊会话、群聊会话
- **联系人**: 好友列表、好友请求
- **群组**: 群成员管理、群设置
- **实时通话**: WebRTC 一对一和多人通话

## Important Constraints
- 必须支持现代浏览器 (> 1%, last 2 versions)
- WebRTC 需要 HTTPS 环境
- 后端 API 位于 `https://www.boxim.online/api`
- WebSocket 服务位于 `wss://www.boxim.online/im`

## External Dependencies
- **后端 API**: BoxIM 后端服务 (RESTful API)
- **WebSocket 服务**: 实时消息推送
- **TURN/STUN 服务器**: WebRTC 信令和中继
