import { ReactorController, ControllerEmitter } from '@alice/wond-v3';
import { DanmakuBatch, DanmakuProcessed } from '../events/danmaku.js';
import { ActionGenerated, ActionPush } from '../events/actions.js';

export function createActionReactor() {
  const config = {
    type: 'reactor' as const,
    id: 'action-reactor',
    name: 'Action Reactor',
    description: 'Analyzes danmaku batches and generates appropriate actions',
    inputEventTypes: [DanmakuBatch],
    outputEventTypes: [ActionGenerated, ActionPush, DanmakuProcessed],
    processEvents: async (
      events: Array<{ type: string; payload: any }>,
      emitter: ControllerEmitter
    ): Promise<void> => {
      for (const event of events) {
        if (event.type === DanmakuBatch.type) {
          await processDanmakuBatch(event.payload, emitter);
        }
      }
    }
  };

  async function processDanmakuBatch(
    batch: any,
    emitter: ControllerEmitter
  ): Promise<void> {
    const { danmakus, batchId } = batch;
    
    // Analyze danmaku content for actions
    const highlights: Array<{ danmakuId: string; reason: string }> = [];
    const actions: Array<any> = [];

    for (const danmaku of danmakus) {
      // Check for specific patterns that trigger actions
      const content = danmaku.content.toLowerCase();
      
      // Emotion triggers
      if (content.includes('开心') || content.includes('happy') || content.includes('😊')) {
        actions.push({
          type: 'emotion',
          emotion: 'happy',
          danmakuId: danmaku.id
        });
        highlights.push({ danmakuId: danmaku.id, reason: 'Positive emotion detected' });
      }
      
      if (content.includes('难过') || content.includes('sad') || content.includes('😢')) {
        actions.push({
          type: 'emotion',
          emotion: 'sad',
          danmakuId: danmaku.id
        });
        highlights.push({ danmakuId: danmaku.id, reason: 'Negative emotion detected' });
      }

      // Animation triggers
      if (content.includes('跳舞') || content.includes('dance')) {
        actions.push({
          type: 'animation',
          animation: 'dance',
          danmakuId: danmaku.id
        });
        highlights.push({ danmakuId: danmaku.id, reason: 'Dance request' });
      }

      // Speech triggers
      if (content.startsWith('说:') || content.startsWith('say:')) {
        const text = content.replace(/^(说:|say:)/, '').trim();
        if (text) {
          actions.push({
            type: 'speak',
            text,
            danmakuId: danmaku.id
          });
          highlights.push({ danmakuId: danmaku.id, reason: 'Speech request' });
        }
      }
    }

    // Batch summary analysis
    const summary = `Processed ${danmakus.length} danmakus, generated ${actions.length} actions`;

    // Emit processed event
    await emitter.event(DanmakuProcessed).emit({
      batchId,
      danmakuIds: danmakus.map((d: any) => d.id),
      summary,
      highlights,
      processedAt: Date.now()
    });

    // Generate actions
    for (const action of actions) {
      const { type, danmakuId, ...payload } = action;
      
      // First emit ActionGenerated
      await emitter.event(ActionGenerated).emit({
        actionType: type as any,
        payload,
        triggeredBy: {
          batchId,
          danmakuIds: [danmakuId],
          reason: `Triggered by danmaku content`
        },
        priority: 'normal',
        timestamp: Date.now()
      });

      // Then emit ActionPush for immediate execution
      await emitter.event(ActionPush).emit({
        actionType: type as any,
        payload,
        targetPlatform: 'live-avatar',
        priority: 'normal',
        timestamp: Date.now()
      });
    }

    // Handle high-frequency patterns (e.g., many people saying the same thing)
    const contentFrequency = new Map<string, number>();
    for (const danmaku of danmakus) {
      const key = danmaku.content.toLowerCase();
      contentFrequency.set(key, (contentFrequency.get(key) || 0) + 1);
    }

    // If many people say the same thing, generate a special action
    for (const [content, count] of contentFrequency) {
      if (count >= 5) { // At least 5 people saying the same thing
        await emitter.event(ActionGenerated).emit({
          actionType: 'speak',
          payload: {
            text: `Wow, ${count} people are saying "${content}"!`
          },
          triggeredBy: {
            batchId,
            reason: `High frequency message detected`
          },
          priority: 'high',
          timestamp: Date.now()
        });

        await emitter.event(ActionPush).emit({
          actionType: 'speak',
          payload: {
            text: `Wow, ${count} people are saying "${content}"!`
          },
          targetPlatform: 'live-avatar',
          priority: 'high',
          timestamp: Date.now()
        });
      }
    }
  }

  return new ReactorController(
    config,
    { tag: ['actions', 'danmaku-processing'], autoActivate: true },
    {}
  );
}