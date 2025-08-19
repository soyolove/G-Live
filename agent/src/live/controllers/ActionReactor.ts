import { ReactorController, ControllerEmitter } from 'wond-v3';
import { DanmakuBatch, DanmakuProcessed } from '../events/danmaku.js';
import { ActionGenerated, HeadActionPush, SubtitleReply } from '../events/actions.js';

export function createActionReactor() {
  const config = {
    type: 'reactor' as const,
    id: 'action-reactor',
    name: 'Action Reactor',
    description: 'Analyzes danmaku batches and generates appropriate actions',
    inputEventTypes: [DanmakuBatch],
    outputEventTypes: [ActionGenerated, HeadActionPush, SubtitleReply, DanmakuProcessed],
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
      
      // Head motion triggers
      // Affirmative expressions
      if (content.includes('对') || content.includes('是的') || content.includes('好的') || 
          content.includes('yes') || content.includes('ok') || content.includes('好') ||
          content.includes('👍') || content.includes('✓') || content.includes('赞')) {
        actions.push({
          type: 'head_motion',
          motion: 'nod',
          danmakuId: danmaku.id
        });
        highlights.push({ danmakuId: danmaku.id, reason: 'Affirmative expression detected' });
      }
      
      // Negative expressions
      if (content.includes('不') || content.includes('没有') || content.includes('不是') ||
          content.includes('no') || content.includes('nope') || content.includes('不行') ||
          content.includes('👎') || content.includes('✗') || content.includes('错')) {
        actions.push({
          type: 'head_motion',
          motion: 'shake',
          danmakuId: danmaku.id
        });
        highlights.push({ danmakuId: danmaku.id, reason: 'Negative expression detected' });
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

    // Generate head actions
    for (const action of actions) {
      const { type, motion, danmakuId } = action;
      
      // First emit ActionGenerated for tracking
      await emitter.event(ActionGenerated).emit({
        actionType: 'head_motion',
        payload: { motion },
        triggeredBy: {
          batchId,
          danmakuIds: [danmakuId],
          reason: `Triggered by danmaku content`
        },
        priority: 'normal',
        timestamp: Date.now()
      });

      // Then emit HeadActionPush for execution
      await emitter.event(HeadActionPush).emit({
        motion: motion as 'nod' | 'shake',
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

    // If many people say the same thing, generate excited nodding
    for (const [content, count] of contentFrequency) {
      if (count >= 5) { // At least 5 people saying the same thing
        await emitter.event(ActionGenerated).emit({
          actionType: 'head_motion',
          payload: {
            motion: 'nod',
            reason: `${count} people saying "${content}"`
          },
          triggeredBy: {
            batchId,
            reason: `High frequency message detected`
          },
          priority: 'high',
          timestamp: Date.now()
        });

        // Fast excited nodding for high frequency
        await emitter.event(HeadActionPush).emit({
          motion: 'nod',
          speed: 150, // Fast speed for excitement
          targetPlatform: 'live-avatar',
          priority: 'high',
          timestamp: Date.now()
        });

        // Also send subtitle reply for high frequency messages
        await emitter.event(SubtitleReply).emit({
          text: `哇！${count}个人都在说"${content}"！`,
          type: 'reaction',
          duration: 3000, // 3秒显示时长
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