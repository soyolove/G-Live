# JiLive AI 虚拟主播系统

JiLive 是一个基于 AI 的虚拟主播系统，能够实时理解和响应观众互动，控制虚拟形象做出相应动作。

## 系统概述

JiLive 采用"大脑-身体"分离架构：

- **jilive-agent**（本项目）：AI 大脑，负责理解观众意图、做出决策
- **jilive-vtuber**：虚拟身体，执行 AI 大脑的指令，展现虚拟形象

## 核心特性

### 🧠 智能交互
- 使用 Google Gemini AI 理解和回复弹幕
- AI 自动生成有趣的字幕回复（30字以内）
- AI 根据弹幕情绪控制虚拟形象动作（点头/摇头）
- 智能识别热门话题并优先回应

### ⚡ 高性能处理
- 事件驱动架构，低延迟响应
- 批量处理机制，每10秒智能分析一批弹幕
- 支持多渠道并发输入

### 🤖 AI 工具系统
- 内置动作工具，AI 自主决定何时使用
- 支持动态速度调整（如兴奋时快速点头）
- 工具使用完全由 AI 根据弹幕内容判断

### 🔮 未来规划
- 支持私聊消息处理
- 视频内容理解与反应
- 礼物系统集成
- 更丰富的 AI 个性化表现

## 工作流程

```
观众弹幕 → AI 批量收集 → Gemini AI 分析 → 生成回复+动作 → 虚拟形象执行
```

例如：
- 多人说"好可爱" → AI 识别为热门话题 → 回复"谢谢大家的夸奖！(◕‿◕)" + 快速点头
- 观众："不对吧" → AI 识别否定情绪 → 回复"是有什么问题吗？" + 摇头动作
- 观众讨论游戏 → AI 理解话题 → 回复"大家都在玩什么游戏呀？"

## 技术架构

```
DanmakuPump → DanmakuAIReactor → SubtitlePushConsumer + ActionPushConsumer
```

- **DanmakuPump**: 接收来自各平台的弹幕消息
- **DanmakuAIReactor**: 使用 Gemini AI 批量分析弹幕，生成回复和动作
- **SubtitlePushConsumer**: 将 AI 回复推送为字幕显示
- **ActionPushConsumer**: 将动作指令推送给虚拟形象系统

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
echo "GEMINI_API_KEY=your_api_key_here" > .env

# 启动 AI 大脑
pnpm dev

# 系统将在以下端口启动：
# - 8012: Agent API (系统监控)
# - 8013: Custom API (弹幕接收)
```

## API Endpoints

- `GET /api/overview` - Agent status and overview
- `GET /api/controllers` - List all controllers
- `GET /api/influence-paths` - Analyze event flow paths
- `POST /api/danmaku` - Submit single danmaku
- `POST /api/danmaku/batch` - Submit multiple danmaku

### Example: Submit Danmaku

```bash
curl -X POST http://localhost:8013/api/danmaku \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "username": "TestUser",
    "content": "说: Hello JiLive!",
    "roomId": "room456"
  }'
```

## AI 功能特性

### 智能回复
- AI 分析弹幕内容和情绪，生成个性化回复
- 回复限制在30字以内，适合字幕显示
- 支持颜文字和表情符号

### 自动动作
- **点头**: AI 检测到肯定、赞同、开心内容时自动触发
- **摇头**: AI 检测到否定、疑惑内容时自动触发
- **快速点头**: 检测到热门话题（5人以上说同样的话）时表示兴奋

### 批处理配置
- `DANMAKU_BATCH_INTERVAL`: AI 处理间隔（默认10秒）
- `DANMAKU_MAX_BATCH_SIZE`: 每批最大处理数（默认20条）

## 配置说明

环境变量：
- `GEMINI_API_KEY`: Google AI API 密钥（必需）
- `JILIVE_API_PORT`: API 服务器端口（默认: 8012）
- `DANMAKU_BATCH_INTERVAL`: AI 批处理间隔（默认: 10000ms）
- `DANMAKU_MAX_BATCH_SIZE`: 每批最大弹幕数（默认: 20）
- `JILIVE_VERBOSE`: 启用详细日志

## 项目结构

```
src/
├── controllers/     # 控制器（消息处理逻辑）
├── events/         # 事件定义
├── tasks/          # 任务定义  
├── config/         # 配置管理
└── index.ts        # 入口文件
```

## 技术栈

- **框架**: Alice Wonderland v3 Agent Framework
- **语言**: TypeScript
- **消息队列**: Redis + BullMQ
- **事件处理**: 事件驱动架构

---

> JiLive - 让 AI 成为最懂观众的虚拟主播 🎭