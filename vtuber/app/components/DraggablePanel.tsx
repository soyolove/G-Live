"use client";

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggablePanelProps {
  children: ReactNode;
  initialX?: number;
  initialY?: number;
  className?: string;
  handleClassName?: string;
  title?: string;
}

export function DraggablePanel({
  children,
  initialX = 0,
  initialY = 0,
  className,
  handleClassName,
  title
}: DraggablePanelProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute",
        isDragging && "cursor-grabbing select-none",
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none'
      }}
    >
      {/* Drag Handle */}
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-t-lg bg-muted/50 cursor-grab hover:bg-muted/70 transition-colors",
          isDragging && "cursor-grabbing bg-muted/70",
          handleClassName
        )}
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        {title && (
          <span className="text-sm font-medium text-muted-foreground select-none">
            {title}
          </span>
        )}
      </div>
      
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}