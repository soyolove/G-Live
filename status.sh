#!/bin/bash

# JiLive 服务状态检查脚本
# 检查所有服务的运行状态

echo "📊 JiLive Services Status"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查端口状态
check_port() {
    local port=$1
    local service_name=$2
    local service_url=$3
    
    echo -e "\n${BLUE}[$service_name]${NC}"
    
    # 检查端口是否被占用
    if lsof -i :$port &> /dev/null; then
        local pid=$(lsof -ti :$port)
        echo -e "${GREEN}✅ 运行中${NC} (PID: $pid)"
        echo "   端口: $port"
        echo "   地址: $service_url"
        
        # 尝试健康检查
        if [ "$port" = "8011" ]; then
            # SSE 后端有健康检查端点
            if curl -s http://localhost:$port/health > /dev/null; then
                local health=$(curl -s http://localhost:$port/health)
                echo "   健康状态: 正常"
                echo "   活动客户端: $(echo $health | grep -o '"activeClients":[0-9]*' | cut -d: -f2)"
            fi
        fi
    else
        echo -e "${RED}❌ 未运行${NC}"
        echo "   端口: $port (空闲)"
    fi
}

# 检查进程
check_process() {
    local process_name=$1
    local display_name=$2
    
    local count=$(ps aux | grep -E "$process_name" | grep -v grep | wc -l)
    
    if [ $count -gt 0 ]; then
        echo -e "${GREEN}✅ $display_name: $count 个进程${NC}"
    else
        echo -e "${RED}❌ $display_name: 未发现进程${NC}"
    fi
}

# 检查 tmux 会话
check_tmux() {
    if command -v tmux &> /dev/null; then
        if tmux has-session -t jilive 2>/dev/null; then
            echo -e "\n${BLUE}[tmux 会话]${NC}"
            echo -e "${GREEN}✅ 会话 'jilive' 正在运行${NC}"
            
            # 列出窗口
            local windows=$(tmux list-windows -t jilive -F "#{window_index}: #{window_name}")
            echo "   窗口列表:"
            echo "$windows" | sed 's/^/     /'
        fi
    fi
}

# 主程序
main() {
    # 检查各个服务端口
    check_port 8010 "Live2D Frontend" "http://localhost:8010"
    check_port 8011 "SSE Control Backend" "http://localhost:8011"
    check_port 8012 "AI Agent API" "http://localhost:8012"
    check_port 8013 "AI Agent Danmaku" "http://localhost:8013"
    
    # 检查相关进程
    echo -e "\n${BLUE}[进程状态]${NC}"
    check_process "jilive-vtuber" "VTuber 相关进程"
    check_process "jilive-agent" "Agent 相关进程"
    
    # 检查 tmux 会话
    check_tmux
    
    # 显示快速链接
    echo -e "\n${BLUE}[快速访问]${NC}"
    echo "📺 Live2D 前端: http://localhost:8010"
    echo "🔌 SSE 后端健康检查: http://localhost:8011/health"
    echo "🤖 AI Agent API: http://localhost:8012"
    echo "📝 弹幕测试页面: http://localhost:8012/danmaku-sender.html"
    
    echo -e "\n${YELLOW}[提示]${NC}"
    echo "• 使用 ./start-all.sh 启动所有服务"
    echo "• 使用 ./stop-all.sh 停止所有服务"
    echo "• 在 tmux 中运行时，使用 'tmux attach -t jilive' 查看服务日志"
}

# 运行主程序
main