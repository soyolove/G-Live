import { defineEvent } from '@alice/wond-v3';
import { z } from 'zod';

export const DanmakuReceived = defineEvent({
  type: 'DANMAKU_RECEIVED',
  name: 'Danmaku Received',
  description: 'Individual danmaku message received from live stream',
  schema: z.object({
    id: z.string(),
    userId: z.string(),
    username: z.string(),
    content: z.string(),
    timestamp: z.number(),
    platform: z.string(),
    roomId: z.string(),
    metadata: z.record(z.any()).optional()
  })
});

export const DanmakuBatch = defineEvent({
  type: 'DANMAKU_BATCH',
  name: 'Danmaku Batch',
  description: 'Batch of danmaku messages ready for processing',
  schema: z.object({
    danmakus: z.array(z.object({
      id: z.string(),
      userId: z.string(),
      username: z.string(),
      content: z.string(),
      timestamp: z.number(),
      platform: z.string(),
      roomId: z.string(),
      metadata: z.record(z.any()).optional()
    })),
    batchId: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    count: z.number()
  })
});

export const DanmakuProcessed = defineEvent({
  type: 'DANMAKU_PROCESSED',
  name: 'Danmaku Processed',
  description: 'Danmaku batch has been processed and analyzed',
  schema: z.object({
    batchId: z.string(),
    danmakuIds: z.array(z.string()),
    summary: z.string().optional(),
    highlights: z.array(z.object({
      danmakuId: z.string(),
      reason: z.string()
    })).optional(),
    processedAt: z.number()
  })
});