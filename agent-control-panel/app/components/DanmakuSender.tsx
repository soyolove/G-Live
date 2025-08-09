'use client';

import { useState, useCallback } from 'react';

const DANMAKU_API_URL = process.env.NEXT_PUBLIC_DANMAKU_API_URL || 'http://localhost:8013/api/danmaku';

interface DanmakuHistory {
  id: string;
  username: string;
  content: string;
  time: string;
}

export function DanmakuSender() {
  const [username, setUsername] = useState('测试用户');
  const [platform, setPlatform] = useState('web');
  const [content, setContent] = useState('');
  const [history, setHistory] = useState<DanmakuHistory[]>([]);
  const [autoMode, setAutoMode] = useState(false);
  const [sending, setSending] = useState(false);

  // 发送弹幕
  const sendDanmaku = useCallback(async (text?: string) => {
    const messageContent = text || content;
    if (!messageContent.trim()) return;

    setSending(true);
    const danmaku = {
      id: `msg-${Date.now()}-${Math.random()}`,
      userId: `user-${username}`,
      username: username,
      content: messageContent,
      platform: platform,
      roomId: 'web-room',
      metadata: {
        source: 'control-panel',
        timestamp: new Date().toISOString()
      }
    };

    try {
      const response = await fetch(DANMAKU_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(danmaku)
      });

      if (response.ok) {
        // 添加到历史
        setHistory(prev => [{
          id: danmaku.id,
          username: danmaku.username,
          content: danmaku.content,
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 20));

        // 清空输入
        if (!text) setContent('');
      }
    } catch (error) {
      console.error('发送弹幕失败:', error);
    } finally {
      setSending(false);
    }
  }, [content, username, platform]);

  // 快捷弹幕
  const quickMessages = [
    '666', '主播好可爱', '对', '不对', 
    '好的 👍', '不行 👎', 'YES!', 'NO!'
  ];

  // 自动发送
  useState(() => {
    if (!autoMode) return;

    const messages = [
      '666', '主播好棒', '太可爱了', '❤️❤️❤️',
      '哈哈哈', '开心', '说: 你好呀', '说: 感谢大家'
    ];

    const interval = setInterval(() => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      const randomUser = `观众${Math.floor(Math.random() * 100)}`;
      setUsername(randomUser);
      sendDanmaku(randomMsg);
    }, 3000);

    return () => clearInterval(interval);
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">💬 弹幕测试</h2>

      {/* 设置 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            用户名
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入昵称"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            平台
          </label>
          <input
            type="text"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="平台名称"
          />
        </div>
      </div>

      {/* 输入框 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendDanmaku()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入弹幕内容..."
          disabled={sending}
        />
        <button
          onClick={() => sendDanmaku()}
          disabled={sending || !content.trim()}
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {sending ? '发送中...' : '发送'}
        </button>
      </div>

      {/* 快捷弹幕 */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">快捷弹幕</h3>
        <div className="grid grid-cols-4 gap-2">
          {quickMessages.map((msg) => (
            <button
              key={msg}
              onClick={() => sendDanmaku(msg)}
              disabled={sending}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-all active:scale-95"
            >
              {msg}
            </button>
          ))}
        </div>
      </div>

      {/* 自动发送 */}
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="autoDanmaku"
          checked={autoMode}
          onChange={(e) => setAutoMode(e.target.checked)}
          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="autoDanmaku" className="ml-2 text-gray-700">
          自动发送模拟弹幕（每3秒）
        </label>
      </div>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">发送历史</h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {history.map((item) => (
              <div key={item.id} className="px-3 py-2 bg-gray-50 rounded text-sm">
                <span className="text-gray-500 text-xs">{item.time}</span>
                <span className="text-purple-600 font-medium mx-2">{item.username}:</span>
                <span className="text-gray-800">{item.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}