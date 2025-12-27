<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**请使用中文回答所有问题。**

## Build Commands

```bash
npm install      # Install dependencies
npm run serve    # Development server with hot-reload
npm run build    # Production build
npm run lint     # ESLint check
```

## Architecture Overview

This is **BoxIM (盒子IM)** - a Vue 2 instant messaging web application with WebRTC support for audio/video calls.

**Core Stack:**
- Vue 2.7 + Vue Router 3 + Pinia (state management)
- Element UI for components
- Axios for HTTP with token-based auth
- Custom WebSocket client with heartbeat and auto-reconnection
- WebRTC for private and group calls

**Key Directories:**
- `/src/api/` - HTTP client (`httpRequest.js`), WebSocket (`wssocket.js`), WebRTC (`webrtc.js`), and utility modules
- `/src/components/` - Vue components organized by feature: `/chat`, `/common`, `/friend`, `/group`, `/rtc`, `/setting`
- `/src/store/` - Pinia stores: `userStore`, `chatStore`, `friendStore`, `groupStore`, `configStore`
- `/src/view/` - Page components: Home, Chat, Friend, Group, Login, Register

**Global Properties (via main.js):**
All stores and utilities are mounted globally: `this.$http`, `this.$wsApi`, `this.$msgType`, `this.$date`, `this.$emo`, `this.$url`, `this.$str`, `this.$elm`, `this.$enums`, `this.$eventBus`, plus Pinia stores (`this.chatStore`, etc.)

## Key Patterns

**Message Caching:** `chatStore.js` uses hot/cold message separation - recent messages in memory, historical messages in localforage cache. This prevents performance issues with large message volumes.

**WebSocket Protocol:** Command-based messaging with `cmd` field. Connection managed in `wssocket.js` with 15-second reconnection delay.

**RTC State Machine:** `FREE → WAIT_CALL/WAIT_ACCEPT → ACCEPTED → CHATING` (see `userStore.js` for RTC state, `rtcPrivateApi.js` and `rtcGroupApi.js` for call handling)

## Environment

- `.env.development` - Uses proxy `/api2` → `https://www.boxim.online/api`, WebSocket `wss://www.boxim.online/im`
- `.env.production` - Direct API at `https://www.boxim.online/api`
