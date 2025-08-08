# JiLive - AI Trading Live Streaming Suite

JiLive 是一个基于 Alice v3 (Wonderland v3) 框架的 AI 主播系统，专为交易直播场景设计。它结合了 VTuber 技术、弹幕互动和 AI 智能响应。

## 系统架构

### 核心组件

#### 1. Agent (`jilive/agent`)
- **功能**: 核心 AI 代理，处理弹幕并生成响应
- **端口**: 8012 (Agent API), 8013 (Custom API)
- **特性**:
  - 弹幕实时处理和批量处理
  - AI 智能分析和响应生成
  - 动作指令生成（控制 VTuber）
  - 字幕推送（支持 TTS）

#### 2. VTuber Frontend (`jilive/vtuber`)
- **功能**: Live2D VTuber 前端展示
- **端口**: 8010 (Next.js)
- **特性**:
  - Live2D 模型渲染和控制
  - 动作触发（手动/自动）
  - 表情管理
  - 实时控制界面

#### 3. VTuber Backend (`jilive/vtuber-backend`)
- **功能**: VTuber 实时控制服务
- **端口**: 8011
- **特性**:
  - SSE 实时通信
  - TTS 语音合成
  - 客户端连接管理
  - 字幕推送

#### 4. Danmaku Collector (`jilive/danmaku-collector`)
- **功能**: 从直播平台收集弹幕
- **端口**: 8015
- **支持平台**: Twitch（可扩展）

## 快速开始

### 1. 安装依赖
```bash
cd /Users/ryuko/dev/240630/alice-v3-beta
pnpm install
```

### 2. 启动服务

#### 方式一：使用启动脚本
```bash
cd apps/jilive
./start-all.sh  # 启动所有服务
./status.sh     # 检查服务状态
./stop-all.sh   # 停止所有服务
```

#### 方式二：单独启动各服务
```bash
# Terminal 1: 启动 Agent
cd apps/jilive/agent
pnpm dev

# Terminal 2: 启动 VTuber 前端
cd apps/jilive/vtuber
pnpm dev

# Terminal 3: 启动 VTuber 后端
cd apps/jilive/vtuber-backend
pnpm dev

# Terminal 4: 启动弹幕收集器
cd apps/jilive/danmaku-collector
pnpm dev
```

## 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| VTuber Frontend | 8010 | Next.js 前端 |
| VTuber Backend | 8011 | TTS 和字幕服务 |
| Agent API | 8012 | Agent 监控 API |
| Agent Custom API | 8013 | 弹幕/字幕 API |
| Danmaku Collector | 8015 | 弹幕收集服务 |

## API 端点

### Agent Custom API (8013)
- `POST /api/danmaku` - 提交单条弹幕
- `POST /api/danmaku/batch` - 批量提交弹幕
- `POST /api/subtitle/test` - 测试字幕推送

### VTuber Backend API (8011)
- `POST /api/subtitle-with-tts` - 发送字幕并生成 TTS
- `GET /api/sse` - SSE 事件流

### Danmaku Collector API (8015)
- `POST /api/connect` - 连接到直播间
- `POST /api/disconnect` - 断开连接
- `GET /api/status` - 获取连接状态

## 事件流

```
用户弹幕 → Danmaku Collector → Agent (AI 处理) → 
  ├→ Action Events → VTuber (动作控制)
  └→ Subtitle Events → VTuber Backend (TTS) → VTuber Frontend (显示)
```

## 配置

### Agent 配置
编辑 `apps/jilive/agent/src/config/index.ts`:
- AI 模型选择
- Redis 连接
- 批处理间隔

### VTuber 配置
- Live2D 模型放置在 `apps/jilive/vtuber/public/models/`
- TTS 配置在后端环境变量中

## 与交易系统集成

JiLive 可以与 Jirai-Alpha 的交易系统集成，实现：
- 实时交易信号播报
- 市场分析解说
- 观众交易问题回答
- 自动化交易展示

集成方式：
1. Agent 监听 Jirai-Alpha 的交易事件
2. 将交易信号转换为字幕和动作
3. VTuber 展示交易操作和解说

## 开发说明

### 技术栈
- **框架**: Alice v3 (Wonderland v3)
- **前端**: Next.js, React, Live2D
- **后端**: Express, TypeScript
- **AI**: Vercel AI SDK
- **实时通信**: SSE, WebSocket
- **TTS**: 多种 TTS 服务支持

### 目录结构
```
apps/jilive/
├── agent/           # 核心 AI 代理
├── vtuber/          # VTuber 前端 (Next.js)
├── vtuber-backend/  # VTuber 后端 (Express)
├── danmaku-collector/  # 弹幕收集器
└── *.sh            # 管理脚本
```

## 注意事项

1. **Redis 依赖**: Agent 需要 Redis 运行
2. **Live2D 许可**: 使用 Live2D 模型需要相应许可
3. **TTS 配额**: 注意 TTS 服务的使用配额
4. **性能优化**: 批量处理弹幕以提高性能

## 后续计划

- [ ] 支持更多直播平台（B站、YouTube）
- [ ] 增强交易信号展示
- [ ] 添加更多 VTuber 动作和表情
- [ ] 优化 AI 响应速度
- [ ] 添加观众互动功能