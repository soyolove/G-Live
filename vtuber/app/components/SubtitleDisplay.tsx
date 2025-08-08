"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface SubtitleData {
  text: string;
  type: 'response' | 'reaction' | 'status';
  duration?: number;
  timestamp: string;
}

interface SubtitleDisplayProps {
  subtitle: SubtitleData | null;
}

export function SubtitleDisplay({ subtitle }: SubtitleDisplayProps) {
  const [visible, setVisible] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleData | null>(null);

  useEffect(() => {
    if (subtitle) {
      setCurrentSubtitle(subtitle);
      setVisible(true);

      // 自动隐藏字幕
      const duration = subtitle.duration || 3000; // 默认3秒
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setCurrentSubtitle(null), 300); // 等待动画完成后清除
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [subtitle]);

  if (!currentSubtitle) return null;

  // 根据类型确定样式
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'response':
        return 'bg-blue-500/90 text-white border-blue-400';
      case 'reaction':
        return 'bg-green-500/90 text-white border-green-400';
      case 'status':
        return 'bg-gray-500/90 text-white border-gray-400';
      default:
        return 'bg-blue-500/90 text-white border-blue-400';
    }
  };

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40 max-w-lg">
      <Card 
        className={`
          px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-300
          ${getTypeStyles(currentSubtitle.type)}
          ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        <div className="text-center">
          <p className="text-lg font-medium leading-relaxed">
            {currentSubtitle.text}
          </p>
          <div className="flex justify-between items-center mt-2 text-xs opacity-75">
            <span className="capitalize">{currentSubtitle.type}</span>
            <span>{new Date(currentSubtitle.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}