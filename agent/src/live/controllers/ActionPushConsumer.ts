import { ReactorController, ControllerEmitter } from '@alice/wond-v3';
import { HeadActionPush, ActionExecuted } from '../events/actions.js';
import chalk from 'chalk';
import { nod, shake } from '../actions/headMotions.js';

export function createActionPushConsumer() {
  const actionHandlers = new Map<string, (motion: string, speed?: number) => Promise<{ motion: string; completed: boolean }>>();
  
  // Initialize default action handlers
  registerDefaultHandlers();

  function registerDefaultHandlers(): void {
    // Head motion handler (nod/shake)
    actionHandlers.set('head_motion', async (motion: string, speed?: number) => {
      console.log(chalk.green('🎭 Head Motion:'), motion);
      
      if (motion === 'nod') {
        nod(speed);
        console.log(chalk.gray('   Nodding (yes)'));
      } else if (motion === 'shake') {
        shake(speed);
        console.log(chalk.gray('   Shaking (no)'));
      }
      
      return { motion, completed: true };
    });
    
  }

  async function executeAction(
    headAction: { motion: string; speed?: number; targetPlatform: string; targetId?: string; priority: string; timestamp: number },
    emitter: ControllerEmitter
  ): Promise<void> {
    const { motion, speed, targetPlatform } = headAction;
    
    try {
      const handler = actionHandlers.get('head_motion');
      
      if (!handler) {
        throw new Error('No handler registered for head_motion');
      }

      // Execute the action
      const startTime = Date.now();
      const response = await handler(motion, speed);
      const executionTime = Date.now() - startTime;

      // Log execution
      console.log(
        chalk.green('✅ Head action executed:'),
        motion,
        chalk.gray(`(${executionTime}ms)`)
      );

      // Emit execution result
      await emitter.event(ActionExecuted).emit({
        actionType: 'head_motion',
        success: true,
        executedAt: Date.now(),
        targetPlatform,
        response
      });
    } catch (error) {
      console.error(
        chalk.red('❌ Head action execution failed:'),
        motion,
        error
      );

      // Emit failure result
      await emitter.event(ActionExecuted).emit({
        actionType: 'head_motion',
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
    inputEventTypes: [HeadActionPush],
    outputEventTypes: [ActionExecuted],
    isConsumer: true,
    processEvents: async (
      events: Array<{ type: string; payload: { motion: 'nod' | 'shake'; speed?: number; targetPlatform: string; targetId?: string; priority: 'low' | 'normal' | 'high'; timestamp: number } }>,
      emitter: ControllerEmitter
    ): Promise<void> => {
      for (const event of events) {
        if (event.type === HeadActionPush.type) {
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

  // Return controller
  return {
    controller
  };
}