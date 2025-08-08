#!/bin/bash

# JiLive 服务停止脚本
# 停止所有相关服务

echo "🛑 Stopping JiLive Services..."
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 停止指定端口的服务
stop_port() {
    local port=$1
    local service_name=$2
    
    echo -e "\n${BLUE}🔍 检查端口 $port ($service_name)...${NC}"
    
    # 查找占用端口的进程
    local pid=$(lsof -ti :$port)
    
    if [ -z "$pid" ]; then
        echo -e "${YELLOW}⚠️  端口 $port 没有运行的服务${NC}"
    else
        echo -e "${RED}⛔ 停止进程 PID: $pid${NC}"
        kill -9 $pid 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 服务已停止${NC}"
        else
            echo -e "${RED}❌ 停止服务失败${NC}"
        fi
    fi
}

# 检查并停止 tmux 会话
stop_tmux_session() {
    if command -v tmux &> /dev/null; then
        if tmux has-session -t jilive 2>/dev/null; then
            echo -e "\n${BLUE}🔍 发现 tmux 会话 'jilive'${NC}"
            tmux kill-session -t jilive
            echo -e "${GREEN}✅ tmux 会话已停止${NC}"
        fi
    fi
}

# 主程序
main() {
    # 停止各个服务
    stop_port 8010 "Live2D Frontend"
    stop_port 8011 "SSE Control Backend"
    stop_port 8012 "AI Agent API"
    stop_port 8013 "AI Agent Danmaku"
    
    # 停止 tmux 会话（如果存在）
    stop_tmux_session
    
    # 额外检查 node 进程
    echo -e "\n${BLUE}🔍 检查残留的 node 进程...${NC}"
    
    # 查找相关的 node 进程
    local node_processes=$(ps aux | grep -E "(jilive-vtuber|jilive-agent)" | grep -v grep)
    
    if [ -z "$node_processes" ]; then
        echo -e "${GREEN}✅ 没有发现残留进程${NC}"
    else
        echo -e "${YELLOW}⚠️  发现以下相关进程：${NC}"
        echo "$node_processes"
        
        read -p "是否要停止这些进程？(y/n): " choice
        if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then
            # 提取 PID 并终止进程
            echo "$node_processes" | awk '{print $2}' | xargs kill -9 2>/dev/null
            echo -e "${GREEN}✅ 进程已终止${NC}"
        fi
    fi
    
    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}✨ 所有服务已停止！${NC}"
    echo -e "${GREEN}================================${NC}"
}

# 运行主程序
main