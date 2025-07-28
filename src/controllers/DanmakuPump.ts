import { createManualPump, ControllerEmitter } from '@alice/wond-v3';
import { DanmakuReceived } from '../events/danmaku.js';

export function createDanmakuPump() {
  const { pump, emitter } = createManualPump(
    {
      type: 'pump',
      pumpType: 'manual',
      name: 'Danmaku Pump',
      description: 'Receives danmaku messages from live streaming platforms',
      outputEventTypes: [DanmakuReceived]
    },
    { tag: ['danmaku', 'input'] }, // ControllerOptions
    {} // Initial state
  );

  // Create wrapper with convenience methods
  const danmakuPump = {
    controller: pump,
    
    emitDanmaku(danmaku: {
      id: string;
      userId: string;
      username: string;
      content: string;
      platform: string;
      roomId: string;
      metadata?: Record<string, any>;
    }): void {
      emitter.event(DanmakuReceived).emit({
        ...danmaku,
        timestamp: Date.now()
      });
    },

    emitMultipleDanmakus(danmakus: Array<{
      id: string;
      userId: string;
      username: string;
      content: string;
      platform: string;
      roomId: string;
      metadata?: Record<string, any>;
    }>): void {
      const timestamp = Date.now();
      for (const danmaku of danmakus) {
        emitter.event(DanmakuReceived).emit({
          ...danmaku,
          timestamp
        });
      }
    }
  };

  return danmakuPump;
}