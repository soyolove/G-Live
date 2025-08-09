'use client';

import { useState, useCallback } from 'react';

const SUBTITLE_API_URL = process.env.NEXT_PUBLIC_SUBTITLE_API_URL || 'http://localhost:8013/api/subtitle/test';

interface SubtitleHistory {
  id: string;
  text: string;
  type: string;
  duration: number;
  time: string;
}

export function SubtitleControl() {
  const [text, setText] = useState('Hello Live2D!');
  const [type, setType] = useState<'response' | 'reaction' | 'status'>('response');
  const [duration, setDuration] = useState(3000);
  const [history, setHistory] = useState<SubtitleHistory[]>([]);
  const [autoMode, setAutoMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  // 发送字幕
  const sendSubtitle = useCallback(async (customText?: string, customType?: string) => {
    const subtitleText = customText || text;
    const subtitleType = customType || type;
    
    if (!subtitleText.trim()) return;

    setSending(true);
    const subtitle = {
      text: subtitleText,
      type: subtitleType,
      duration: duration
    };

    try {
      const response = await fetch(SUBTITLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subtitle)
      });

      if (response.ok) {
        // 添加到历史
        setHistory(prev => [{
          id: `subtitle-${Date.now()}`,
          text: subtitleText,
          type: subtitleType,
          duration: duration,
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 20));

        // 显示成功状态
        setSuccess(true);
        setTimeout(() => setSuccess(false), 1500);
      }
    } catch (error) {
      console.error('字幕发送失败:', error);
    } finally {
      setSending(false);
    }
  }, [text, type, duration]);

  // 快捷字幕
  const quickSubtitles = [
    { text: '你好，观众朋友们！', type: 'response', label: '问候' },
    { text: '哇！好多人啊！', type: 'reaction', label: '惊讶' },
    { text: '谢谢大家的支持 ❤️', type: 'response', label: '感谢' },
    { text: '系统正常运行中...', type: 'status', label: '状态' },
    { text: '开始直播啦！', type: 'reaction', label: '开播' },
    { text: '今天天气真好呢~', type: 'response', label: '闲聊' },
  ];

  // 自动发送
  useState(() => {
    if (!autoMode) return;

    const subtitles = [
      { text: '欢迎来到我的直播间！', type: 'response' },
      { text: '今天要给大家带来精彩的内容哦~', type: 'response' },
      { text: '哇！弹幕好热闹！', type: 'reaction' },
      { text: '正在准备下一个环节...', type: 'status' },
      { text: '大家有什么想看的吗？', type: 'response' },
      { text: '让我们继续吧！', type: 'response' },
    ];

    const interval = setInterval(() => {
      const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];
      sendSubtitle(randomSubtitle.text, randomSubtitle.type);
    }, 5000);

    return () => clearInterval(interval);
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">📺 字幕控制</h2>

      {/* 输入区域 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          字幕内容
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendSubtitle()}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="输入字幕内容..."
          disabled={sending}
        />
      </div>

      {/* 选项 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            类型
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="response">回复</option>
            <option value="reaction">反应</option>
            <option value="status">状态</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            时长 (ms)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            min="1000"
            max="10000"
            step="500"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* 发送按钮 */}
      <button
        onClick={() => sendSubtitle()}
        disabled={sending || !text.trim()}
        className={`w-full px-4 py-2 rounded-lg font-medium text-white transition-all ${
          success 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : 'bg-gradient-to-r from-green-400 to-teal-400 hover:from-green-500 hover:to-teal-500'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {sending ? '发送中...' : success ? '发送成功!' : '发送字幕'}
      </button>

      {/* 快捷字幕 */}
      <div className="my-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">快捷字幕</h3>
        <div className="grid grid-cols-3 gap-2">
          {quickSubtitles.map((item, index) => (
            <button
              key={index}
              onClick={() => sendSubtitle(item.text, item.type)}
              disabled={sending}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm transition-all active:scale-95"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 自动发送 */}
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="autoSubtitle"
          checked={autoMode}
          onChange={(e) => setAutoMode(e.target.checked)}
          className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
        />
        <label htmlFor="autoSubtitle" className="ml-2 text-gray-700">
          自动发送随机字幕（每5秒）
        </label>
      </div>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">发送历史</h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {history.map((item) => (
              <div key={item.id} className="px-3 py-2 bg-blue-50 rounded text-sm border-l-4 border-blue-400">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-gray-500">{item.time}</span>
                    <span className="text-xs bg-blue-200 text-blue-800 px-1 rounded ml-2">
                      {item.type}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{item.duration}ms</span>
                </div>
                <div className="text-gray-800 mt-1">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}