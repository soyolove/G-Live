import { ReactorController, ReactorControllerState, ReactorControllerConfig, ControllerEmitter, AgentEvent } from '@alice/wond-v3';
import { DataSourceRecordDeduplicated, DataSourceSignalGenerated } from '@/investment/events';
import { generateText } from 'ai';
import { getInvestmentAI } from '@/investment/lib/aiModelSelector';
import type { InvestmentConfig } from '@/config/investment.config';
import { getSignalAnalysisPrompt } from '@/investment/prompts';

// ============================================================================
// INVESTMENT HANDLER TRACKING - START
// 用于监控和评估Investment域的事件流处理
// ============================================================================
import { generateControllerId } from '@/investment/handler';
import type { ControllerTrackingData, InvestmentHandler } from '@/investment/handler';
// ============================================================================
// INVESTMENT HANDLER TRACKING - END
// ============================================================================

export interface DataSourceSignalState extends ReactorControllerState {
  recordsProcessed: number;
  signalsGenerated: number;
  signalsFailed: number;
}

export function createDataSourceSignalReactor(
  datasourceConfig: InvestmentConfig['datasource'],
  investmentHandler?: InvestmentHandler,
  enableTracking?: boolean
) {
  // 如果提供了handler，注册这个controller
  if (investmentHandler) {
    investmentHandler.registerController('DataSourceSignalReactor');
  }
  const config: ReactorControllerConfig = {
    name: 'DataSource Signal Reactor',
    description: 'Generates investment signals from deduplicated records',
    type: 'reactor',
    
    inputEventTypes: [DataSourceRecordDeduplicated],
    outputEventTypes: [DataSourceSignalGenerated],
    outputTaskTypes: [],
    
    processInterval: 10000, // 10秒处理间隔
    isActive: true,
    
    async processEvents(events: AgentEvent[], emitter: ControllerEmitter, controller: ReactorController<DataSourceSignalState>) {
      console.log(`[DataSource Signal] 处理 ${events.length} 个去重后的记录`);

      // ========================================================================
      // TRACKING - START: 初始化Controller追踪
      // ========================================================================
      const controllerId = generateControllerId();
      const trackingEnabled = enableTracking && investmentHandler;
      
      // 从事件提取flowId
      const flowId = events[0].flowId || 'no-flow';
      
      if (flowId !== 'no-flow') {
        console.log(`[DataSource Signal] 监测到追踪流Flow ID: ${flowId}`);
      }
      
      // 准备追踪数据结构
      const trackingData: ControllerTrackingData = {
        controllerName: 'DataSourceSignalReactor',
        flowId: flowId,
        inputEvents: events,
        outputEvents: [],
        aiCalls: [],
        internalState: {},
        processingTime: 0,
        timestamp: Date.now()
      };
      const processingStartTime = Date.now();
      // ========================================================================
      // TRACKING - END: 初始化完成
      // ========================================================================

      // 逐个生成信号
      for (const event of events) {
        if (event.type === DataSourceRecordDeduplicated.type) {
          try {
            const deduplicatedRecord = DataSourceRecordDeduplicated.schema.parse(event.payload);
            const startTime = Date.now();
            
            console.log(`[DataSource Signal] 为记录 ${deduplicatedRecord.recordId.slice(0, 8)}... 生成投资信号`);
            controller.state.recordsProcessed++;

            // 准备用于信号生成的记录数据
            const record = {
              recordId: deduplicatedRecord.recordId,
              entityId: deduplicatedRecord.entityId,
              entityName: deduplicatedRecord.entityName,
              dataSourceType: deduplicatedRecord.dataSourceType,
              content: deduplicatedRecord.content, // 使用处理后的内容
              metadata: deduplicatedRecord.metadata,
              createdAt: deduplicatedRecord.createdAt,
            };

            // 生成投资信号分析
            const signalAnalysis = await generateInvestmentSignal(record, trackingData, !!trackingEnabled);
            
            if (signalAnalysis) {
              // 发送投资信号事件
              const outputEvent = {
                recordId: record.recordId,
                entityId: record.entityId,
                entityName: record.entityName,
                signalAnalysis: signalAnalysis,
                generatedAt: new Date().toISOString(),
                aiModel: `${getInvestmentAI('analysis').provider}-${getInvestmentAI('analysis').modelType}-analysis`,
              };
              
              emitter.event(DataSourceSignalGenerated).emit(outputEvent, { flowId });
              
              // 记录输出事件
              if (trackingEnabled) {
                trackingData.outputEvents.push({
                  type: DataSourceSignalGenerated.type,
                  payload: outputEvent,
                  flowId: flowId
                } as AgentEvent);
              }
              
              controller.state.signalsGenerated++;
              console.log(`[DataSource Signal] ✅ 生成投资信号: ${record.entityName}`);
            } else {
              controller.state.signalsFailed++;
              console.log(`[DataSource Signal] ⚠️ 信号生成失败: ${record.entityName}`);
            }
            
            const processingTime = Date.now() - startTime;
            console.log(`[DataSource Signal] 记录处理完成: ${record.entityName}, 耗时: ${processingTime}ms`);
            
          } catch (error) {
            console.error(`[DataSource Signal] 处理记录失败:`, error);
            controller.state.signalsFailed++;
          }
        }
      }
      
      console.log(`[DataSource Signal] 处理完成: ${controller.state.recordsProcessed} 个记录, ${controller.state.signalsGenerated} 个信号生成, ${controller.state.signalsFailed} 个失败`);
      
      // ========================================================================
      // TRACKING - SAVE: 保存Controller追踪数据
      // ========================================================================
      if (trackingEnabled && investmentHandler) {
        trackingData.processingTime = Date.now() - processingStartTime;
        await investmentHandler.trackController(controllerId, flowId, trackingData);
        console.log(`[DataSource Signal] 追踪数据已保存 - Flow: ${flowId}, Controller: ${controllerId}`);
      }
      // ========================================================================
      // TRACKING - SAVE END
      // ========================================================================
    }
  };

  const initialState: DataSourceSignalState = {
    recordsProcessed: 0,
    signalsGenerated: 0,
    signalsFailed: 0,
  };
  
  return new ReactorController(
    config,
    { tag: ['datasource', 'ai', 'signal'], autoActivate: true },
    initialState
  );
}

/**
 * 为有价值的记录生成投资信号分析
 */
async function generateInvestmentSignal(
  record: {
    recordId: string;
    entityId: string;
    entityName: string;
    dataSourceType: 'info' | 'strategy';
    content: string;
    metadata: any;
    createdAt: string;
  },
  trackingData?: ControllerTrackingData,
  trackingEnabled?: boolean
): Promise<string | null> {
  const { model, temperature } = getInvestmentAI('analysis');
  
  try {
    const { system, prompt } = getSignalAnalysisPrompt(record);
    const signalAnalysis = await generateText({
      model,
      system,
      prompt,
      temperature,
    });
    
    // 记录AI调用信息
    if (trackingEnabled && trackingData) {
      trackingData.aiCalls.push({
        prompt: prompt.substring(0, 500),
        response: signalAnalysis.text.substring(0, 500),
        model: (typeof model === 'string') ? model : model.modelId
      });
    }
    
    return signalAnalysis.text;
    
  } catch (error) {
    console.error('[DataSource Signal] 信号生成失败:', error);
    return null;
  }
}