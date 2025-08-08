# Twitch Chat Monitor

一个现代化的 Twitch 聊天监控服务，提供后端 API 服务。

## 功能特性

- 🎯 实时监控任意公开 Twitch 频道聊天
- 🚀 基于 Server-Sent Events 的实时数据推送
- 📡 完整的 RESTful API 接口
- 🔧 TypeScript 全栈开发

## 快速开始

### 启动后端 API 服务
```bash
npm run server:dev  # 开发模式
npm run server      # 生产模式
```

## API 使用示例

```javascript
// 连接频道
await fetch('http://localhost:3001/api/channels/shroud/connect', {
  method: 'POST'
});

// 监听实时消息
const eventSource = new EventSource('http://localhost:3001/api/channels/shroud/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New message:', data);
};
```


## 技术栈

- **后端:** Node.js + Express + TypeScript
- **实时通信:** Server-Sent Events (SSE)
- **Twitch API:** tmi.js

## 项目结构

```
├── server/           # 后端 API 服务
│   ├── services/     # 核心服务
│   ├── types/        # 类型定义
│   └── app.ts        # Express 应用
```