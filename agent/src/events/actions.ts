import { defineEvent } from '@alice/wond-v3';
import { z } from 'zod';

export const ActionGenerated = defineEvent({
  type: 'ACTION_GENERATED',
  name: 'Action Generated',
  description: 'Action generated from danmaku analysis',
  schema: z.object({
    actionType: z.string(), // 改为自由的字符串类型
    payload: z.record(z.any()),
    triggeredBy: z.object({
      batchId: z.string().optional(),
      danmakuIds: z.array(z.string()).optional(),
      reason: z.string()
    }),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    timestamp: z.number()
  })
});

export const HeadActionPush = defineEvent({
  type: 'HEAD_ACTION_PUSH',
  name: 'Head Action Push',
  description: 'Head action ready to be pushed to live avatar',
  schema: z.object({
    motion: z.enum(['nod', 'shake']), // 只有点头和摇头两种
    speed: z.number().optional(), // 可选的速度参数
    targetPlatform: z.string(),
    targetId: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    timestamp: z.number()
  })
});

export const ActionExecuted = defineEvent({
  type: 'ACTION_EXECUTED',
  name: 'Action Executed',
  description: 'Action execution result',
  schema: z.object({
    actionType: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
    executedAt: z.number(),
    targetPlatform: z.string(),
    response: z.record(z.any()).optional()
  })
});

export const SubtitleReply = defineEvent({
  type: 'SUBTITLE_REPLY',
  name: 'Subtitle Reply',
  description: 'Reply message to be displayed as subtitle',
  schema: z.object({
    text: z.string(),
    type: z.enum(['response', 'reaction', 'status']).default('response'),
    duration: z.number().optional(), // 显示时长(毫秒)，可选
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    timestamp: z.number()
  })
});