'use client';

import { useState, useEffect } from 'react';
import { MotionControl } from './components/MotionControl';
import { DanmakuSender } from './components/DanmakuSender';
import { SubtitleControl } from './components/SubtitleControl';

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<{
    agent: boolean;
    backend: boolean;
  }>({ agent: false, backend: false });

  // 检查连接状态
  useEffect(() => {
    const checkConnections = async () => {
      // 检查 Agent
      try {
        const response = await fetch('http://localhost:8012/api/overview');
        setConnectionStatus(prev => ({ ...prev, agent: response.ok }));
      } catch {
        setConnectionStatus(prev => ({ ...prev, agent: false }));
      }

      // 检查 VTuber Backend
      try {
        const response = await fetch('http://localhost:8011/health');
        setConnectionStatus(prev => ({ ...prev, backend: response.ok }));
      } catch {
        setConnectionStatus(prev => ({ ...prev, backend: false }));
      }
    };

    checkConnections();
    const interval = setInterval(checkConnections, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 标题和状态 */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎭 JiLive 控制面板
            <span className="text-sm font-normal text-gray-500 ml-4">端口: 8016</span>
          </h1>
          <div className="flex gap-4">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${connectionStatus.agent ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600">
                Agent: {connectionStatus.agent ? '已连接' : '未连接'}
              </span>
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${connectionStatus.backend ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600">
                Backend: {connectionStatus.backend ? '已连接' : '未连接'}
              </span>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 左侧列 */}
          <div className="space-y-6">
            <MotionControl />
            <SubtitleControl />
          </div>

          {/* 右侧列 */}
          <div className="space-y-6">
            <DanmakuSender />
            
            {/* 快速链接 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">🔗 快速链接</h2>
              <div className="grid grid-cols-2 gap-4">
                <a
                  href="http://localhost:8010"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-center transition-all"
                >
                  VTuber 前端
                </a>
                <a
                  href="http://localhost:8012/api/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-center transition-all"
                >
                  Agent API
                </a>
                <a
                  href="http://localhost:8011/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-center transition-all"
                >
                  Backend 状态
                </a>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}