import { ReactorController, ReactorControllerState, ControllerEmitter, AgentEvent } from '@alice/wond-v3';
import { DanmakuReceived, DanmakuBatch, DanmakuProcessed } from '@/events/danmaku';
import { SubtitleReply, HeadActionPush, ActionGenerated } from '@/events/actions';
import { generateText, stepCountIs, tool } from 'ai';
import { getChatAI } from '@/lib/chatModelSelector';
import { config } from '@/config';
import { z } from 'zod';

interface DanmakuAIBatchState extends ReactorControllerState {
  processedMessages: number;
  totalProcessingTime: number;
  processedBatches: number;
}

export function createDanmakuAIReactor() {
  const batchConfig = config.danmaku;
  
  const reactorConfig = {
    name: 'Danmaku AI Reactor (Batch)',
    description: 'Processes danmaku messages in batches with AI and generates intelligent replies',
    type: 'reactor' as const,
    
    inputEventTypes: [DanmakuReceived],
    outputEventTypes: [SubtitleReply, DanmakuBatch, DanmakuProcessed, HeadActionPush, ActionGenerated],
    outputTaskTypes: [],

    processInterval: batchConfig.batchProcessInterval, // 可配置的批处理间隔
    isActive: true,
    
    async processEvents(events: AgentEvent[], emitter: ControllerEmitter, controller: ReactorController<DanmakuAIBatchState>) {
      
      console.log(`[Danmaku AI Reactor] Processing ${events.length} events`);

      if (events.length === 0) return;

      const startTime = Date.now();
      
      try {
        // 解析所有弹幕消息
        const danmakus = events
          .filter(event => event.type === DanmakuReceived.type)
          .map(event => {
            const parsed = DanmakuReceived.schema.parse(event.payload);
            return {
              ...parsed,
              timestamp: event.timestamp
            };
          })
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // 限制批处理大小
        const processedDanmakus = danmakus.slice(0, batchConfig.maxAIBatchSize);
        
        if (processedDanmakus.length === 0) return;

        // 生成批次ID
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 首先发出 DanmakuBatch 事件用于其他处理（如动作生成）
        await emitter.event(DanmakuBatch).emit({
          batchId,
          danmakus: processedDanmakus,
          startTime: processedDanmakus[0].timestamp,
          endTime: processedDanmakus[processedDanmakus.length - 1].timestamp,
          count: processedDanmakus.length
        });

        // 准备弹幕内容用于AI处理
        const danmakuSummary = processedDanmakus.map(d => {
          return `${d.username}: ${d.content}`;
        }).join('\n');

        // 分析弹幕内容特征
        const contentFrequency = new Map<string, number>();
        const userMessages = new Map<string, string[]>();
        
        for (const danmaku of processedDanmakus) {
          // 统计内容频率
          const key = danmaku.content.toLowerCase().trim();
          contentFrequency.set(key, (contentFrequency.get(key) || 0) + 1);
          
          // 统计用户消息
          if (!userMessages.has(danmaku.username)) {
            userMessages.set(danmaku.username, []);
          }
          userMessages.get(danmaku.username)!.push(danmaku.content);
        }

        // 找出高频内容
        const popularMessages = Array.from(contentFrequency.entries())
          .filter(([_, count]) => count >= 3)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        // 构建系统提示
        let systemPrompt = `${config.ai.personality}

你正在看直播间的弹幕，需要对弹幕做出有趣的回应。

回复要求：
1. 回复必须在30字以内
2. 优先回应多人讨论的热门话题
3. 可以对特定用户的有趣弹幕做出反应
4. 保持积极正面的氛围
5. 不要重复弹幕内容，要有自己的想法

你可以使用工具来控制虚拟形象的动作：
- 当看到肯定、赞同、开心的内容时，可以点头
- 当看到否定、不同意、疑惑的内容时，可以摇头
- 当看到特别兴奋的内容（比如很多人说同样的话）时，可以快速点头表示兴奋`;

        if (popularMessages.length > 0) {
          systemPrompt += `\n\n注意：有${popularMessages[0][1]}个人都在说"${popularMessages[0][0]}"，这可能是当前的热点话题。`;
        }

        // 获取AI模型
        const { model, temperature } = getChatAI('chat');

        // 构建用户消息
        let userPrompt = `以下是最近${processedDanmakus.length}条弹幕：\n\n${danmakuSummary}`;
        
        if (popularMessages.length > 0) {
          userPrompt += `\n\n热门话题：\n`;
          popularMessages.forEach(([msg, count]) => {
            userPrompt += `- "${msg}" (${count}人)\n`;
          });
        }

        userPrompt += `\n\n请根据这些弹幕生成一条有趣的回复。记住要简短、有趣、不超过30字。如果弹幕内容适合做动作反应，请使用工具。`;

        // 定义动作工具
        const tools = {
          nod: tool({
            description: '让虚拟形象点头，表示赞同、肯定或开心',
            inputSchema: z.object({
              speed: z.number().optional().describe('点头速度，默认100，兴奋时可以设置150'),
              reason: z.string().describe('为什么要点头')
            }),
            execute: async ({ speed = 100, reason }) => {
              console.log(`[AI Tool] Nodding - reason: ${reason}, speed: ${speed}`);
              emitter.event(HeadActionPush).emit({
                motion: 'nod',
                speed,
                targetPlatform: 'live-avatar',
                priority: 'normal',
                timestamp: Date.now()
              });
              return `已点头 (速度: ${speed})`;
            }
          }),
          shake: tool({
            description: '让虚拟形象摇头，表示否定、不同意或疑惑',
            inputSchema: z.object({
              speed: z.number().optional().describe('摇头速度，默认100'),
              reason: z.string().describe('为什么要摇头')
            }),
            execute: async ({ speed = 100, reason }) => {
              console.log(`[AI Tool] Shaking head - reason: ${reason}, speed: ${speed}`);
              emitter.event(HeadActionPush).emit({
                motion: 'shake',
                speed,
                targetPlatform: 'live-avatar',
                priority: 'normal',
                timestamp: Date.now()
              });
              return `已摇头 (速度: ${speed})`;
            }
          })
        };

        // 生成AI回复
        const result = await generateText({
          model,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: userPrompt
          }],
          temperature,
          tools,
          stopWhen: stepCountIs(5),

        });

        const processingTime = Date.now() - startTime;
        
        // 更新reactor状态
        controller.state.processedMessages += processedDanmakus.length;
        controller.state.totalProcessingTime += processingTime;
        controller.state.processedBatches++;
        
        // 发出字幕回复事件
        emitter.event(SubtitleReply).emit({
          text: result.text,
          type: 'response',
          duration: 5000, // 显示5秒
          priority: 'normal',
          timestamp: Date.now()
        });
        
        console.log(`[Danmaku AI Reactor] Generated reply for ${processedDanmakus.length} messages in ${processingTime}ms`);
        console.log(`[Danmaku AI Reactor] Reply: ${result.text}`);
        
        // 发出处理完成事件
        emitter.event(DanmakuProcessed).emit({
          batchId,
          danmakuIds: processedDanmakus.map(d => d.id),
          summary: `AI processed ${processedDanmakus.length} danmakus`,
          highlights: [],
          processedAt: Date.now()
        });
        
      } catch (error) {
        console.error(`[Danmaku AI Reactor] Failed to generate reply:`, error);
        
        // 错误时的备用回复
        const fallbackReplies = [
          '哇，大家好热情啊！(｡♥‿♥｡)',
          '弹幕刷得好快，我都看不过来了～',
          '大家在聊什么有趣的话题呀？',
          '嘿嘿，被你们发现了～(◕‿◕)',
          '让我想想该怎么回复你们...',
        ];
        
        const randomReply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        
        emitter.event(SubtitleReply).emit({
          text: randomReply,
          type: 'response',
          duration: 5000,
          priority: 'normal',
          timestamp: Date.now()
        });
      }
    }
  };

  const initialState: DanmakuAIBatchState = {
    processedMessages: 0,
    totalProcessingTime: 0,
    processedBatches: 0,
  };
  
  return new ReactorController(
    reactorConfig,
    { tag: ['danmaku', 'ai', 'batch'], autoActivate: true },
    initialState
  );
}