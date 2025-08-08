# Live2D Control Backend (TypeScript)

## 快速开始

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 启动后端服务器
```bash
npm run dev
```

服务器会在 **8011 端口**启动，你会看到：
```
🚀 Live2D Control Backend Started
📍 Server listening on:
   Local:    http://localhost:8011
```

### 3. 测试连接

#### 方法1：使用测试页面
在浏览器打开 `backend/test.html`，可以：
- 查看连接状态
- 手动发送控制命令
- 查看连接日志

#### 方法2：在前端测试
1. 确保前端运行中 (http://localhost:8010)
2. 右上角 Manual Controls 面板
3. 确认 Backend URL 是 `http://localhost:8011/sse`
4. 勾选 "Enable SSE Control"
5. 应该看到绿色 "Connected"

### 4. 查看连接日志

后端连接成功时会显示：
```
✅ [SSE] New client connected:
   ID: client_xxxxx
   IP: ::1
   Total active clients: 1
```

## 故障排查

### 前端连不上？
1. 检查后端是否启动
2. 检查端口 8011 是否被占用
3. 检查前端 URL 设置是否正确
4. 打开浏览器控制台看错误信息

### 面板一直闪烁？
这是重连机制导致的，说明连接失败了。检查后端是否正常运行。

## API 使用示例

```javascript
// 控制视线
fetch('http://localhost:8011/api/control/look', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ x: 0.5, y: 0.5 })
});

// 播放表情
fetch('http://localhost:8011/api/control/expression', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 1 })
});
```