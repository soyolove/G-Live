'use client';

import { useState, useCallback, useEffect } from 'react';

const MOTION_API_URL = process.env.NEXT_PUBLIC_MOTION_API_URL || 'http://localhost:8013/api/motion';

// Motion interfaces (matching the backend)
interface MotionFrame {
  x: number;
  y: number;
  duration: number;
  instant?: boolean;
}

interface Motion {
  id: string;
  name: string;
  description: string;
  type: 'sequence' | 'single' | 'loop';
  frames: MotionFrame[];
  defaultSpeed?: number;
  tags?: string[];
}

export function MotionControl() {
  const [motionLibrary, setMotionLibrary] = useState<Motion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [autoMode, setAutoMode] = useState(false);
  const [lastMotion, setLastMotion] = useState<string>('');

  // 从 API 获取动作库
  useEffect(() => {
    const fetchMotionLibrary = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${MOTION_API_URL}/library`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch motion library');
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          setMotionLibrary(result.data);
        } else {
          throw new Error(result.error || 'Invalid response format');
        }
      } catch (err) {
        console.error('Failed to load motion library:', err);
        setError(err instanceof Error ? err.message : 'Failed to load motions');
        // 设置一个空的默认库
        setMotionLibrary([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMotionLibrary();
  }, []);

  // 执行动作
  const executeMotion = useCallback(async (motion: Motion) => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    setLastMotion(motion.name);

    try {
      // 首先复位（除非本身就是复位动作）
      if (motion.id !== 'reset') {
        await fetch(`${MOTION_API_URL}/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 执行动作序列
      for (const frame of motion.frames) {
        await fetch(`${MOTION_API_URL}/look`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x: frame.x,
            y: frame.y,
            instant: frame.instant || false
          })
        });

        if (frame.duration > 0) {
          const actualSpeed = speed * (motion.defaultSpeed || 1);
          await new Promise(resolve => setTimeout(resolve, frame.duration / actualSpeed));
        }
      }
    } catch (error) {
      console.error('动作执行失败:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, speed]);

  // 手动控制头部位置
  const moveHead = useCallback(async (x: number, y: number) => {
    if (isExecuting) return;
    
    try {
      await fetch(`${MOTION_API_URL}/look`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, instant: false })
      });
    } catch (error) {
      console.error('Failed to move head:', error);
    }
  }, [isExecuting]);

  // 自动播放随机动作
  useEffect(() => {
    if (!autoMode || motionLibrary.length === 0) return;

    const interval = setInterval(() => {
      const randomMotion = motionLibrary[Math.floor(Math.random() * motionLibrary.length)];
      executeMotion(randomMotion);
    }, 4000);

    return () => clearInterval(interval);
  }, [autoMode, motionLibrary, executeMotion]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">🎭 动作控制</h2>
        <div className="text-center py-8 text-gray-500">
          加载动作库中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">🎭 动作控制</h2>
        <div className="text-center py-8">
          <p className="text-red-500 mb-2">加载动作库失败</p>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-2">请确保 Agent 服务正在运行</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🎭 动作控制</h2>
      
      {/* 状态显示 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {isExecuting ? (
            <span className="text-blue-600">执行中: {lastMotion}</span>
          ) : (
            <span>就绪 (共 {motionLibrary.length} 个动作)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">速度:</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-gray-600">{speed.toFixed(1)}x</span>
        </div>
      </div>

      {/* 预设动作按钮 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {motionLibrary.map((motion) => (
          <button
            key={motion.id}
            onClick={() => executeMotion(motion)}
            disabled={isExecuting}
            className="px-3 py-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={motion.description}
          >
            {motion.name}
          </button>
        ))}
      </div>

      {/* 方向控制 */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">手动控制</h3>
        <div className="grid grid-cols-3 gap-2 max-w-[150px] mx-auto">
          <div></div>
          <button
            onClick={() => moveHead(0, -0.5)}
            disabled={isExecuting}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50"
          >
            ↑
          </button>
          <div></div>
          <button
            onClick={() => moveHead(-0.5, 0)}
            disabled={isExecuting}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50"
          >
            ←
          </button>
          <button
            onClick={() => moveHead(0, 0)}
            disabled={isExecuting}
            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors active:scale-95 disabled:opacity-50"
          >
            ●
          </button>
          <button
            onClick={() => moveHead(0.5, 0)}
            disabled={isExecuting}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50"
          >
            →
          </button>
          <div></div>
          <button
            onClick={() => moveHead(0, 0.5)}
            disabled={isExecuting}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50"
          >
            ↓
          </button>
          <div></div>
        </div>
      </div>

      {/* 自动模式 */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="autoMode"
          checked={autoMode}
          onChange={(e) => setAutoMode(e.target.checked)}
          className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
        />
        <label htmlFor="autoMode" className="ml-2 text-gray-700">
          自动播放随机动作（每4秒）
        </label>
      </div>
    </div>
  );
}