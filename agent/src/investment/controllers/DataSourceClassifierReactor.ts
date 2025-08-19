import { ReactorController, ReactorControllerState, ReactorControllerConfig, ControllerEmitter, AgentEvent } from 'wond-v3';
import { DataSourceRecordReceived, DataSourceRecordClassified } from '@/investment/events';
import { generateObject } from 'ai';
import { getInvestmentAI } from '@/investment/lib/aiModelSelector';
import { getClassificationPrompt } from '@/investment/prompts';
import { z } from 'zod';
import type { InvestmentConfig } from '@/config/investment.config';

// ============================================================================
// INVESTMENT HANDLER TRACKING - START
// 用于监控和评估Investment域的事件流处理
// ============================================================================
import { generateControllerId } from '@/investment/handler';
import type { ControllerTrackingData, InvestmentHandler } from '@/investment/handler';
// ============================================================================
// INVESTMENT HANDLER TRACKING - END
// ============================================================================

import type { DataSourceRecord, ContentCategory } from '@/investment/types';

export function createDataSourceClassifierReactor(
  datasourceConfig: InvestmentConfig['datasource'],
  investmentHandler?: InvestmentHandler,
  enableTracking?: boolean
) {
  // 如果提供了handler，注册这个controller
  if (investmentHandler) {
    investmentHandler.registerController('DataSourceClassifierReactor');
  }
  const config: ReactorControllerConfig = {
    name: 'DataSource Classifier Reactor',
    description: 'Classifies data source records into categories',
    type: 'reactor',
    
    inputEventTypes: [DataSourceRecordReceived],
    outputEventTypes: [DataSourceRecordClassified],
    outputTaskTypes: [],
    
    processInterval: 5000, // 5秒处理间隔，快速分类
    isActive: true,
    
    async processEvents(events: AgentEvent[], emitter: ControllerEmitter, controller: ReactorController<ReactorControllerState>) {
      console.log(`[DataSource Classifier] 处理 ${events.length} 个数据源记录`);

      // ========================================================================
      // TRACKING - START: 初始化Controller追踪
      // ========================================================================
      const controllerId = generateControllerId();
      const trackingEnabled = enableTracking && investmentHandler;  // 只有提供handler时才追踪
      
      // 从事件提取flowId
      const flowId = events[0].flowId || 'no-flow';

      if (flowId !== 'no-flow') {
        console.log(`[DataSource Classifier] 监测到追踪流Flow ID: ${flowId}`);
      }
      
      // 准备追踪数据结构
      const trackingData: ControllerTrackingData = {
        controllerName: 'DataSourceClassifierReactor',
        flowId: flowId,
        inputEvents: events,
        outputEvents: [],
        aiCalls: [],
        internalState: {
        },
        processingTime: 0,
        timestamp: Date.now()
      };
      const processingStartTime = Date.now();
      // ========================================================================
      // TRACKING - END: 初始化完成
      // ========================================================================

      // 逐个分类每个记录
      for (const event of events) {
        if (event.type === DataSourceRecordReceived.type) {
          try {
            const rawRecord = DataSourceRecordReceived.schema.parse(event.payload);
            const startTime = Date.now();
            
            // 确保metadata存在且类型安全
            const record: DataSourceRecord = {
              ...rawRecord,
              metadata: rawRecord.metadata || null
            };
            
            console.log(`[DataSource Classifier] 分类记录 ${record.recordId.slice(0, 8)}... 来自 ${record.entityName}`);
            
            // ======================================================================
            // TRACKING - AI调用追踪
            // ======================================================================
            // 使用AI进行分类（修改为返回更多信息）
            const classificationResult = await classifyRecordWithTracking(record);
            
            if (!classificationResult.classification) {
              // AI分类失败
              console.log(`[DataSource Classifier] 记录 ${record.recordId.slice(0, 8)}... 分类失败，跳过`);
              trackingData.internalState.classificationsFailed = (trackingData.internalState.classificationsFailed || 0) + 1;
              continue;
            }
            
            // 记录AI调用信息
            if (trackingEnabled && classificationResult.aiCall) {
              trackingData.aiCalls.push(classificationResult.aiCall);
            }
            
            const classification = classificationResult.classification;
            trackingData.internalState.recordsClassified = (trackingData.internalState.recordsClassified || 0) + 1;
            
            console.log(`[DataSource Classifier] 分类结果: ${record.entityName} - ${classification.category} - ${classification.reason}`);
            
            // 只传递投资相关的记录到下游
            if (classification.category === 'investment') {
              // 发送分类后的事件
              const outputEvent = {
                ...record,
                category: classification.category,
                classificationReason: classification.reason,
                classifiedAt: new Date().toISOString(),
              };
              
              emitter.event(DataSourceRecordClassified).emit(outputEvent, { flowId });
              
              // 记录输出事件
              if (trackingEnabled) {
                trackingData.outputEvents.push({
                  type: DataSourceRecordClassified.type,
                  payload: outputEvent,
                  flowId: flowId
                } as AgentEvent);
              }
              
              trackingData.internalState.investmentRecords = (trackingData.internalState.investmentRecords || 0) + 1;
              console.log(`[DataSource Classifier] ✅ 投资相关记录已传递: ${record.entityName}`);
            } else {
              trackingData.internalState.nonInvestmentRecords = (trackingData.internalState.nonInvestmentRecords || 0) + 1;
              console.log(`[DataSource Classifier] 记录 ${record.recordId.slice(0, 8)}... 分类为 ${classification.category}，不传递`);
            }
            // ======================================================================
            // TRACKING - AI调用追踪结束
            // ======================================================================
            
            const processingTime = Date.now() - startTime;
            console.log(`[DataSource Classifier] 分类耗时: ${processingTime}ms`);
            
          } catch (error) {
            console.error(`[DataSource Classifier] 处理记录失败:`, error);
          }
        }
      }
      
      // ========================================================================
      // TRACKING - SAVE: 保存Controller追踪数据
      // ========================================================================
      if (trackingEnabled && investmentHandler) {
        trackingData.processingTime = Date.now() - processingStartTime;
        await investmentHandler.trackController(controllerId, flowId, trackingData);
        console.log(`[DataSource Classifier] 追踪数据已保存 - Flow: ${flowId}, Controller: ${controllerId}`);
      }
      // ========================================================================
      // TRACKING - SAVE END
      // ========================================================================
    }
  };

  const initialState: ReactorControllerState = {};
  
  return new ReactorController(
    config,
    { tag: ['datasource', 'ai', 'classifier'], autoActivate: true },
    initialState
  );
}

/**
 * 使用AI对记录进行分类（带追踪信息）
 */
async function classifyRecordWithTracking(record: DataSourceRecord): Promise<{
  classification: { category: ContentCategory; reason: string } | null;
  aiCall?:{
    prompt: string;
    response: string;
    model: string;
  }
}> {
  const { model, temperature } = getInvestmentAI('judge');
  
  try {
    const { system, prompt } = getClassificationPrompt(record);

    const result = await generateObject({
      model,
      system,
      prompt,
      schema: z.object({
        category: z.enum(['investment', 'entertainment', 'spam', 'other'])
          .describe('Content category'),
        reason: z.string().max(1000)
          .describe('Brief reason for classification'),
      }),
      temperature,
    });

    return {
      classification: {
        category: result.object.category as ContentCategory,
        reason: result.object.reason,
      },
      aiCall: {
        prompt: prompt.substring(0, 500), // 截取部分prompt
        response: JSON.stringify(result.object),
        model: (typeof model === 'string') ? model : model.modelId
      }
    };
  } catch (error) {
    console.error('[DataSource Classifier] AI分类失败:', error);
    return { classification: null };
  }
}
