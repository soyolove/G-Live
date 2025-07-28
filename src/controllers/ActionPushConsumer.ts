import { ReactorController, ControllerEmitter } from '@alice/wond-v3';
import { ActionPush, ActionExecuted } from '../events/actions.js';
import chalk from 'chalk';

export function createActionPushConsumer() {
  const actionHandlers = new Map<string, (action: any) => Promise<any>>();
  
  // Initialize default action handlers
  registerDefaultHandlers();

  function registerDefaultHandlers(): void {
    // Speak action handler
    actionHandlers.set('speak', async (action) => {
      console.log(chalk.cyan('🎙️  Speaking:'), action.payload.text);
      // In real implementation, this would send to TTS service or avatar
      return { spoken: true, text: action.payload.text };
    });

    // Emotion action handler
    actionHandlers.set('emotion', async (action) => {
      const emotionEmojis: Record<string, string> = {
        happy: '😊',
        sad: '😢',
        angry: '😠',
        surprised: '😲',
        neutral: '😐'
      };
      const emoji = emotionEmojis[action.payload.emotion] || '🤔';
      console.log(chalk.yellow('🎭 Emotion:'), emoji, action.payload.emotion);
      // In real implementation, this would trigger avatar emotion change
      return { emotion: action.payload.emotion };
    });

    // Animation action handler
    actionHandlers.set('animation', async (action) => {
      console.log(chalk.magenta('💃 Animation:'), action.payload.animation);
      // In real implementation, this would trigger avatar animation
      return { animation: action.payload.animation, started: true };
    });

    // Effect action handler
    actionHandlers.set('effect', async (action) => {
      console.log(chalk.green('✨ Effect:'), JSON.stringify(action.payload));
      // In real implementation, this would trigger visual effects
      return { effect: action.payload };
    });

    // Custom action handler
    actionHandlers.set('custom', async (action) => {
      console.log(chalk.blue('🔧 Custom Action:'), JSON.stringify(action.payload));
      // In real implementation, this would handle custom actions
      return { custom: action.payload };
    });
  }

  async function executeAction(
    action: any,
    emitter: ControllerEmitter
  ): Promise<void> {
    const { actionType, payload, targetPlatform, targetId, priority } = action;
    
    try {
      const handler = actionHandlers.get(actionType);
      
      if (!handler) {
        throw new Error(`No handler registered for action type: ${actionType}`);
      }

      // Execute the action
      const startTime = Date.now();
      const response = await handler({ payload, targetPlatform, targetId, priority });
      const executionTime = Date.now() - startTime;

      // Log execution
      console.log(
        chalk.green('✅ Action executed:'),
        actionType,
        chalk.gray(`(${executionTime}ms)`)
      );

      // Emit execution result
      await emitter.event(ActionExecuted).emit({
        actionType,
        success: true,
        executedAt: Date.now(),
        targetPlatform,
        response
      });
    } catch (error) {
      console.error(
        chalk.red('❌ Action execution failed:'),
        actionType,
        error
      );

      // Emit failure result
      await emitter.event(ActionExecuted).emit({
        actionType,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedAt: Date.now(),
        targetPlatform
      });
    }
  }

  const config = {
    type: 'reactor' as const,
    id: 'action-push-consumer',
    name: 'Action Push Consumer',
    description: 'Executes actions by pushing them to the live avatar system',
    inputEventTypes: [ActionPush],
    outputEventTypes: [ActionExecuted],
    isConsumer: true,
    processEvents: async (
      events: Array<{ type: string; payload: any }>,
      emitter: ControllerEmitter
    ): Promise<void> => {
      for (const event of events) {
        if (event.type === ActionPush.type) {
          await executeAction(event.payload, emitter);
        }
      }
    }
  };

  const controller = new ReactorController(
    config,
    { tag: ['actions', 'output'], autoActivate: true },
    {}
  );

  // Return controller with additional methods for extensibility
  return {
    controller,
    registerActionHandler: (actionType: string, handler: (action: any) => Promise<any>) => {
      actionHandlers.set(actionType, handler);
    }
  };
}