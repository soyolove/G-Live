# JiLive 服务管理脚本

本目录包含用于管理 JiLive 项目所有服务的便捷脚本。

## 服务列表

1. **Live2D Frontend** (端口 8010) - VTuber 前端展示
2. **SSE Control Backend** (端口 8011) - 服务端事件控制后端
3. **AI Agent** (端口 8012/8013) - AI 智能代理服务

## 脚本说明

### 🚀 start-all.sh - 启动所有服务

启动项目所需的所有服务。

```bash
cd apps
./start-all.sh
```

**功能特性：**
- 自动检测端口占用情况
- 支持两种启动方式：
  1. 在新的终端窗口中启动每个服务（默认）
  2. 在 tmux 会话中启动所有服务（如果安装了 tmux）
- 自动检查依赖
- 显示服务访问地址

### 🛑 stop-all.sh - 停止所有服务

停止所有正在运行的服务。

```bash
cd apps
./stop-all.sh
```

**功能特性：**
- 根据端口查找并停止服务
- 清理 tmux 会话（如果使用）
- 检查并清理残留进程

### 📊 status.sh - 检查服务状态

查看所有服务的运行状态。

```bash
cd apps
./status.sh
```

**显示信息：**
- 各服务运行状态和 PID
- 端口占用情况
- 健康检查结果（SSE 后端）
- 快速访问链接
- 相关进程统计

## 使用建议

### 首次使用

1. 确保已安装依赖：
   ```bash
   # 在项目根目录
   pnpm install
   ```

2. 启动所有服务：
   ```bash
   cd apps
   ./start-all.sh
   ```

3. 访问服务：
   - Live2D 前端: http://localhost:8010
   - 弹幕测试页面: http://localhost:8012/danmaku-sender.html

### 使用 tmux（推荐）

如果安装了 tmux，可以在一个会话中管理所有服务：

1. 启动服务时选择 tmux 模式
2. 查看服务日志：
   ```bash
   tmux attach -t jilive
   ```
3. tmux 快捷键：
   - `Ctrl+B` + `数字`: 切换窗口
   - `Ctrl+B` + `d`: 分离会话
   - `Ctrl+B` + `[`: 滚动模式

### 故障排除

如果服务无法启动：

1. 检查端口占用：
   ```bash
   ./status.sh
   ```

2. 停止所有服务后重试：
   ```bash
   ./stop-all.sh
   ./start-all.sh
   ```

3. 检查日志输出中的错误信息

4. 确保环境变量已正确设置（特别是 TTS 相关的配置）

## 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Live2D Frontend | 8010 | Next.js 前端应用 |
| SSE Backend | 8011 | Express 后端，提供 SSE 和 API |
| AI Agent API | 8012 | Agent 控制 API |
| AI Agent Danmaku | 8013 | 弹幕服务器 |

## 环境要求

- Node.js >= 18
- pnpm
- macOS 或 Linux（Windows 用户需要调整脚本）
- （可选）tmux - 用于更好的服务管理