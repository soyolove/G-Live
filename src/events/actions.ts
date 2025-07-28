import { defineEvent } from '@alice/wond-v3';
import { z } from 'zod';

export const ActionGenerated = defineEvent({
  type: 'ACTION_GENERATED',
  name: 'Action Generated',
  description: 'Action generated from danmaku analysis',
  schema: z.object({
    actionType: z.enum(['speak', 'emotion', 'animation', 'effect', 'custom']),
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

export const ActionPush = defineEvent({
  type: 'ACTION_PUSH',
  name: 'Action Push',
  description: 'Action ready to be pushed to live avatar',
  schema: z.object({
    actionType: z.enum(['speak', 'emotion', 'animation', 'effect', 'custom']),
    payload: z.record(z.any()),
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