import { ReactorController, ReactorControllerState, ControllerEmitter, AgentEvent } from '@alice/wond-v3';
import { DataSourceSignalGenerated } from '../../investment/events/index.js';
import { SubtitleReply, HeadActionPush } from '../events/actions.js';
import { generateText, stepCountIs, tool } from 'ai';
import { getChatAI } from '@/lib/chatModelSelector';
import { z } from 'zod';

interface InvestmentCommentaryState extends ReactorControllerState {

}

export function createInvestmentCommentaryReactor() {
  const reactorConfig = {
    name: 'Investment Commentary Reactor',
    description: 'Converts investment signals into entertaining VTuber commentary',
    type: 'reactor' as const,
    
    inputEventTypes: [DataSourceSignalGenerated],  // 只处理信号，不处理原始记录
    outputEventTypes: [SubtitleReply, HeadActionPush],
    outputTaskTypes: [],

    processInterval: 5000, // 每5秒处理一次
    isActive: true,
    
    async processEvents(events: AgentEvent[], emitter: ControllerEmitter, controller: ReactorController<InvestmentCommentaryState>) {
      
      if (events.length === 0) return;

      try {
        // 只处理投资信号
        const signals = events.filter(e => e.type === DataSourceSignalGenerated.type);
        
        console.log(`[Investment Commentary] Processing ${signals.length} investment signals`);

        for (const signalEvent of signals) {
          const signal = DataSourceSignalGenerated.schema.parse(signalEvent.payload);
          
          // 检查信号内容是否有效
          const content = signal.signalAnalysis
          if (!content || content.trim().length === 0) {
            console.log(`[Investment Commentary] Skipping signal with empty content from ${signal.entityName}`);
            controller.state.skippedEmpty++;
            continue;
          }
          
          console.log(`[Investment Commentary] Processing signal from ${signal.entityName}: ${content.slice(0, 50)}...`);
          
          await processInvestmentSignal(signal.signalAnalysis, emitter);
          controller.state.generatedCommentaries++;
        }
        
      } catch (error) {
        console.error(`[Investment Commentary] Failed to process:`, error);
      }
    }
  };

  async function processInvestmentSignal(signalText:string , emitter: ControllerEmitter) {
    const systemPrompt = `你是一个正在直播的VTuber，你看到了一条重要的投资信号。
你需要用轻松幽默的方式对这个信号进行吐槽或评论。

要求：
1. 保持轻松娱乐的氛围，不要太严肃
2. 可以用一些网络流行语或表情
3. 回复控制在40字以内
4. 不要给出具体的投资建议
5. 可以表达惊讶、兴奋、疑惑等情绪

你可以使用工具控制动作：
- 看到利好消息时可以兴奋地点头
- 看到利空消息时可以摇头表示担心`;

    const userPrompt = `投资信号：
  ${signalText}

请用VTuber的风格对这个投资信号进行吐槽评论。`;

    const { model, temperature } = getChatAI('commentary');

    const tools = {
      nod: tool({
        description: '点头表示兴奋或赞同',
        inputSchema: z.object({
          speed: z.number().optional().describe('点头速度，150表示兴奋'),
        }),
        execute: async ({ speed = 150 }) => {
          emitter.event(HeadActionPush).emit({
            motion: 'nod',
            speed,
            targetPlatform: 'live-avatar',
            priority: 'high',
            timestamp: Date.now()
          });
          return `已点头`;
        }
      }),
      shake: tool({
        description: '摇头表示担心或不确定',
        inputSchema: z.object({
          speed: z.number().optional(),
        }),
        execute: async ({ speed = 100 }) => {
          emitter.event(HeadActionPush).emit({
            motion: 'shake',
            speed,
            targetPlatform: 'live-avatar',
            priority: 'high',
            timestamp: Date.now()
          });
          return `已摇头`;
        }
      })
    };

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }],
      temperature, // 使用从getChatAI获取的温度
      tools,
      stopWhen: stepCountIs(5), // 连续使用工具
    });

    // 发出字幕
    emitter.event(SubtitleReply).emit({
      text: `💹 ${result.text}`,
      type: 'response', // 使用有效的类型
      duration: 8000, // 投资信息显示更久
      priority: 'high',
      timestamp: Date.now()
    });

    console.log(`[Investment Commentary] Signal comment: ${result.text}`);
  }

  const initialState: InvestmentCommentaryState = {
  
  };
  
  return new ReactorController(
    reactorConfig,
    { tag: ['investment', 'commentary', 'ai'], autoActivate: true },
    initialState
  );
}