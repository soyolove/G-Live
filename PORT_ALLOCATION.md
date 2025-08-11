# 端口分配文档

本文档记录了 Neuro Wonder 项目中所有服务的端口分配情况。

## 端口分配表（8010-8019）

| 端口 | 服务名称 | 描述 | 项目路径 |
|------|----------|------|----------|
| 8010 | jilive-vtuber 前端 | Live2D 模型查看器和控制界面 (Next.js) | `apps/jilive-vtuber/` |
| 8011 | jilive-vtuber 后端 | SSE 控制服务器，提供远程控制 API | `apps/jilive-vtuber/backend/` |
| 8012 | jilive-agent API | AI 虚拟主播大脑 - 系统监控 API | `apps/jilive-agent/` |
| 8013 | jilive-agent Custom API | AI 虚拟主播大脑 - 弹幕接收 API | `apps/jilive-agent/` |
| 8014 | 预留 | - | - |
| 8015 | jilive-danmaku-collector | 弹幕采集服务 | `apps/jilive-danmaku-collector/`  |
| 8016 | jilive-control-panel | JiLive 控制面板 (Next.js) | `apps/jilive/agent-control-panel/` |
| 8017 | 预留 | - | - |
| 8018 | 预留 | - | - |
| 8019 | 预留 | - | - |

## 服务启动命令

### JiLive 虚拟主播系统

```bash
# 1. 启动 Live2D 前端（端口 8010）
cd apps/jilive-vtuber
pnpm dev

# 2. 启动 SSE 控制后端（端口 8011）
cd apps/jilive-vtuber/backend
npm run dev

# 3. 启动 AI Agent（端口 8012/8013）
cd apps/jilive-agent
pnpm dev
```



## 端口使用规范

1. **8010-8019** 段专门用于本项目
2. 每个服务使用固定端口，避免动态分配
3. 新增服务从预留端口中选择
4. 避免使用常见端口（3000、8080等）

## 常见问题

### Q: 端口被占用怎么办？

检查占用端口的进程：
```bash
# macOS/Linux
lsof -i :8010

# Windows
netstat -ano | findstr :8010
```

### Q: 如何修改端口？

1. 修改对应项目的配置文件或环境变量
2. 更新本文档的端口分配表
3. 更新相关 API 调用中的端口号

## 服务间通信

- **jilive-agent → jilive-vtuber**: Agent 通过 `http://localhost:8011/api/control/*` 控制虚拟形象
- **弹幕源 → jilive-agent**: 通过 `http://localhost:8013/api/danmaku` 发送弹幕

## 环境变量配置

如需通过环境变量覆盖默认端口：

```bash
# jilive-vtuber 后端
PORT=8011 npm run dev

# jilive-agent
JILIVE_API_PORT=8012 pnpm dev
```