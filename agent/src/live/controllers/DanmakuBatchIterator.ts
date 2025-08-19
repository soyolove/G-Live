import { IteratorController, ControllerEmitter } from '@alice/wond-v3';
import { DanmakuReceived, DanmakuBatch } from '../events/danmaku.js';
import { randomUUID } from 'crypto';

export function createDanmakuBatchIterator() {
  const config = {
    type: 'iterator' as const,
    id: 'danmaku-batch-iterator',
    name: 'Danmaku Batch Iterator',
    description: 'Groups danmaku messages into batches for efficient processing',
    inputEventTypes: [DanmakuReceived],
    outputEventTypes: [DanmakuBatch],
    triggerEvents: [DanmakuReceived],
    timeWindow: 5000, // Process every 5 seconds
    batchSize: 100, // Maximum danmakus per batch
    processEvents: async (
      events: Array<{ type: string; payload: any }>,
      emitter: ControllerEmitter
    ): Promise<void> => {
      if (events.length === 0) {
        return;
      }

      const danmakuEvents = events.filter(e => e.type === DanmakuReceived.type);
      if (danmakuEvents.length === 0) {
        return;
      }

      const danmakus = danmakuEvents.map(e => e.payload);
      const timestamps = danmakus.map(d => d.timestamp);
      const startTime = Math.min(...timestamps);
      const endTime = Math.max(...timestamps);

      await emitter.event(DanmakuBatch).emit({
        danmakus,
        batchId: randomUUID(),
        startTime,
        endTime,
        count: danmakus.length
      });
    }
  };

  return new IteratorController(
    config,
    { tag: ['danmaku', 'batch-processing'], autoActivate: true },
    {}
  );
}