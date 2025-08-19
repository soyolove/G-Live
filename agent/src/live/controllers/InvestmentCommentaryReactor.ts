import { ReactorController, ReactorControllerState, ControllerEmitter, AgentEvent } from '@alice/wond-v3';
import { DataSourceRecordReceived, DataSourceSignalGenerated } from '../../investment/events/index.js';
import { SubtitleReply, HeadActionPush } from '../events/actions.js';
import { generateText, tool } from 'ai';
import { getChatAI } from '@/lib/chatModelSelector';
import { z } from 'zod';

interface InvestmentCommentaryState extends ReactorControllerState {
  processedRecords: number;
  generatedCommentaries: number;
}

export function createInvestmentCommentaryReactor() {
  const reactorConfig = {
    name: 'Investment Commentary Reactor',
    description: 'Converts investment information into entertaining VTuber commentary',
    type: 'reactor' as const,
    
    inputEventTypes: [DataSourceRecordReceived, DataSourceSignalGenerated],
    outputEventTypes: [SubtitleReply, HeadActionPush],
    outputTaskTypes: [],

    processInterval: 10000, // 每10秒处理一次投资信息
    isActive: true,
    
    async processEvents(events: AgentEvent[], emitter: ControllerEmitter, controller: ReactorController<InvestmentCommentaryState>) {
      
      console.log(`[Investment Commentary] Processing ${events.length} investment events`);

      if (events.length === 0) return;

      try {
        // 分别处理不同类型的投资事件
        const records = events.filter(e => e.type === DataSourceRecordReceived.type);
        const signals = events.filter(e => e.type === DataSourceSignalGenerated.type);

        // 优先处理投资信号（更重要）
        if (signals.length > 0) {
          const signal = DataSourceSignalGenerated.schema.parse(signals[0].payload);
          await processInvestmentSignal(signal, emitter);
          controller.state.generatedCommentaries++;
        }
        // 否则处理普通记录
        else if (records.length > 0) {
          // 随机选择一条记录进行评论（避免太频繁）
          const randomRecord = records[Math.floor(Math.random() * records.length)];
          const record = DataSourceRecordReceived.schema.parse(randomRecord.payload);
          await processInvestmentRecord(record, emitter);
          controller.state.processedRecords++;
        }
        
      } catch (error) {
        console.error(`[Investment Commentary] Failed to process:`, error);
      }
    }
  };

  async function processInvestmentSignal(signal: any, emitter: ControllerEmitter) {
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
实体：${signal.entityName}
类型：${signal.signalType === 'BUY' ? '买入信号' : signal.signalType === 'SELL' ? '卖出信号' : signal.signalType}
内容摘要：${signal.summary || signal.content?.slice(0, 100)}

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

  async function processInvestmentRecord(record: any, emitter: ControllerEmitter) {
    // 简单记录只有30%概率评论（避免太吵）
    if (Math.random() > 0.3) return;

    const systemPrompt = `你是一个正在直播的VTuber，你看到了一条投资资讯。
像在闲聊一样随口吐槽一下这条资讯。

要求：
1. 非常简短，10-20字
2. 像是自言自语的吐槽
3. 可以用"诶？""哦~""嗯..."这类语气词
4. 保持轻松，不要分析`;

    const userPrompt = `资讯：${record.content?.slice(0, 100)}
来源：${record.entityName}

用一句话随口吐槽一下。`;

    const { model, temperature } = getChatAI('reaction');

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }],
      temperature,
    });

    // 只有50%概率真的说出来（模拟偶尔的自言自语）
    if (Math.random() < 0.5) {
      emitter.event(SubtitleReply).emit({
        text: result.text,
        type: 'reaction', // 使用有效的类型
        duration: 3000, // 短暂显示
        priority: 'low',
        timestamp: Date.now()
      });

      console.log(`[Investment Commentary] Casual comment: ${result.text}`);
    }
  }

  const initialState: InvestmentCommentaryState = {
    processedRecords: 0,
    generatedCommentaries: 0,
  };
  
  return new ReactorController(
    reactorConfig,
    { tag: ['investment', 'commentary', 'ai'], autoActivate: true },
    initialState
  );
}