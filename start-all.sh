#!/bin/bash

# JiLive 服务启动脚本
# 启动所有相关服务

echo "🚀 Starting JiLive Services..."
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# 现在脚本在 apps/jilive/ 下，所以需要调整路径
PROJECT_ROOT="$SCRIPT_DIR"

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm 未安装。请先安装 pnpm: npm install -g pnpm${NC}"
    exit 1
fi

# 函数：启动服务
start_service() {
    local service_name=$1
    local service_path=$2
    local start_command=$3
    local port=$4
    
    echo -e "\n${BLUE}📦 启动 $service_name (端口 $port)...${NC}"
    echo "路径: $service_path"
    
    # 检查目录是否存在
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}❌ 目录不存在: $service_path${NC}"
        return 1
    fi
    
    # 进入目录并启动服务
    cd "$service_path" || return 1
    
    # 检查是否已有服务在运行
    if lsof -i :$port &> /dev/null; then
        echo -e "${YELLOW}⚠️  端口 $port 已被占用，可能服务已在运行${NC}"
    else
        # 在新的终端窗口中启动服务
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            osascript -e "tell app \"Terminal\" to do script \"cd '$service_path' && $start_command\""
        else
            # Linux (假设使用 gnome-terminal)
            gnome-terminal --tab --title="$service_name" -- bash -c "cd '$service_path' && $start_command; exec bash"
        fi
        echo -e "${GREEN}✅ $service_name 启动命令已执行${NC}"
    fi
}

# 创建一个简单的 tmux 启动版本（可选）
start_in_tmux() {
    if command -v tmux &> /dev/null; then
        echo -e "\n${BLUE}使用 tmux 启动所有服务...${NC}"
        
        # 创建新的 tmux 会话
        tmux new-session -d -s jilive
        
        # 启动 Live2D 前端
        tmux rename-window -t jilive:0 'Live2D Frontend'
        tmux send-keys -t jilive:0 "cd '$PROJECT_ROOT/vtuber' && pnpm dev" C-m
        
        # 启动 SSE 控制后端
        tmux new-window -t jilive:1 -n 'SSE Backend'
        tmux send-keys -t jilive:1 "cd '$PROJECT_ROOT/vtuber-backend' && pnpm dev" C-m
        
        # 启动 AI Agent
        tmux new-window -t jilive:2 -n 'AI Agent'
        tmux send-keys -t jilive:2 "cd '$PROJECT_ROOT/agent' && pnpm dev" C-m
        
        echo -e "${GREEN}✅ 所有服务已在 tmux 会话 'jilive' 中启动${NC}"
        echo -e "${YELLOW}使用 'tmux attach -t jilive' 查看服务${NC}"
        return 0
    fi
    return 1
}

# 主程序
main() {
    echo "项目根目录: $PROJECT_ROOT"
    
    # 询问用户使用哪种方式启动
    if command -v tmux &> /dev/null; then
        echo -e "\n${YELLOW}检测到 tmux 已安装。${NC}"
        echo "请选择启动方式："
        echo "1) 在新的终端窗口中启动每个服务（默认）"
        echo "2) 在 tmux 会话中启动所有服务"
        read -p "请输入选择 (1 或 2): " choice
        
        if [ "$choice" = "2" ]; then
            start_in_tmux
            return
        fi
    fi
    
    # 在新终端窗口中启动服务
    echo -e "\n${YELLOW}在新的终端窗口中启动服务...${NC}"
    
    # 1. 启动 Live2D 前端（端口 8010）
    start_service "Live2D Frontend" \
        "$PROJECT_ROOT/vtuber" \
        "pnpm dev" \
        "8010"
    
    sleep 2
    
    # 2. 启动 SSE 控制后端（端口 8011）
    start_service "SSE Control Backend" \
        "$PROJECT_ROOT/vtuber-backend" \
        "pnpm dev" \
        "8011"
    
    sleep 2
    
    # 3. 启动 AI Agent（端口 8012/8013）
    start_service "AI Agent" \
        "$PROJECT_ROOT/agent" \
        "pnpm dev" \
        "8012"
    
    sleep 2
    
    # 4. 启动控制面板（端口 8016）
    start_service "Control Panel" \
        "$PROJECT_ROOT/agent-control-panel" \
        "pnpm dev" \
        "8016"
    
    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}✨ 所有服务启动完成！${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo "服务地址："
    echo -e "${BLUE}📺 Live2D Frontend:${NC} http://localhost:8010"
    echo -e "${BLUE}🔌 SSE Backend:${NC} http://localhost:8011"
    echo -e "${BLUE}🤖 AI Agent:${NC} http://localhost:8012"
    echo -e "${BLUE}🎮 控制面板:${NC} http://localhost:8016"
    echo -e "${BLUE}📝 旧版测试页:${NC} http://localhost:8012/danmaku-sender.html"
    echo ""
    echo -e "${YELLOW}提示：${NC}"
    echo "- 每个服务都在独立的终端窗口中运行"
    echo "- 使用 Ctrl+C 可以停止单个服务"
    echo "- 确保所有依赖已安装（pnpm install）"
}

# 运行主程序
main