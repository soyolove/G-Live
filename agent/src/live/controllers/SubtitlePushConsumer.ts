import { ReactorController, ControllerEmitter } from 'wond-v3';
import { SubtitleReply, ActionExecuted } from '../events/actions.js';
import chalk from 'chalk';

// VTuber Backend API配置
const VTUBER_BACKEND_URL = process.env.VTUBER_BACKEND_URL || 'http://localhost:8011';

export function createSubtitlePushConsumer() {
  // Helper函数调用VTuber Backend API
  async function sendSubtitleToBackend(subtitle: {
    text: string;
    type: 'response' | 'reaction' | 'status';
    duration?: number;
  }): Promise<void> {
    try {
      const response = await fetch(`${VTUBER_BACKEND_URL}/api/control/subtitle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subtitle)
      });

      if (!response.ok) {
        throw new Error(`Backend API call failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(chalk.green('📺 Subtitle sent to VTuber backend:'), subtitle.text);
      console.log(chalk.gray(`   Delivered to ${result.clients} clients`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to send subtitle to VTuber backend:'), error);
      throw error;
    }
  }

  async function executeSubtitlePush(
    subtitleData: { text: string; type: 'response' | 'reaction' | 'status'; duration?: number; priority: string; timestamp: number },
    emitter: ControllerEmitter
  ): Promise<void> {
    const { text, type, duration } = subtitleData;
    
    try {
      // 发送字幕到VTuber Backend
      const startTime = Date.now();
      await sendSubtitleToBackend({ text, type, duration });
      const executionTime = Date.now() - startTime;

      // 记录执行成功
      console.log(
        chalk.green('✅ Subtitle push executed:'),
        `"${text}"`,
        chalk.gray(`(${executionTime}ms)`)
      );

      // 触发执行结果事件
      await emitter.event(ActionExecuted).emit({
        actionType: 'subtitle_push',
        success: true,
        executedAt: Date.now(),
        targetPlatform: 'vtuber-backend',
        response: { text, type, duration }
      });
    } catch (error) {
      console.error(
        chalk.red('❌ Subtitle push failed:'),
        `"${text}"`,
        error
      );

      // 触发执行失败事件
      await emitter.event(ActionExecuted).emit({
        actionType: 'subtitle_push',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedAt: Date.now(),
        targetPlatform: 'vtuber-backend'
      });
    }
  }

  const config = {
    type: 'reactor' as const,
    id: 'subtitle-push-consumer',
    name: 'Subtitle Push Consumer',
    description: 'Consumes subtitle reply events and pushes them to VTuber backend',
    inputEventTypes: [SubtitleReply],
    outputEventTypes: [ActionExecuted],
    isConsumer: true,
    processEvents: async (
      events: Array<{ type: string; payload: { text: string; type: 'response' | 'reaction' | 'status'; duration?: number; priority: 'low' | 'normal' | 'high'; timestamp: number } }>,
      emitter: ControllerEmitter
    ): Promise<void> => {
      for (const event of events) {
        if (event.type === SubtitleReply.type) {
          await executeSubtitlePush(event.payload, emitter);
        }
      }
    }
  };

  const controller = new ReactorController(
    config,
    { tag: ['subtitle', 'push'], autoActivate: true },
    {}
  );

  return {
    controller,
    sendSubtitleToBackend // 暴露测试用的函数
  };
}