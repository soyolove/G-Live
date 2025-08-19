import { ReactorController, ReactorControllerState, ReactorControllerConfig, ControllerEmitter, AgentEvent } from 'wond-v3';
import { DataSourceRecordClassified, DataSourceRecordDeduplicated } from '@/investment/events';
import { generateObject, embed } from 'ai';
import { getInvestmentAI } from '@/investment/lib/aiModelSelector';
import { qwen } from '@/lib/ai';
import { type VectorStoreEntry } from '@/lib/vectorStore';
import { getVectorStore } from '@/lib/vectorStoreConnection';
import { z } from 'zod';
import type { InvestmentConfig } from '@/config/investment.config';
import { getDuplicationAnalysisPrompt } from '@/investment/prompts';

// ============================================================================
// INVESTMENT HANDLER TRACKING - START
// 用于监控和评估Investment域的事件流处理
// ============================================================================
import { generateControllerId } from '@/investment/handler';
import type { ControllerTrackingData, InvestmentHandler } from '@/investment/handler';
// ============================================================================
// INVESTMENT HANDLER TRACKING - END
// ============================================================================

import type { ClassifiedDataSourceRecord as DataSourceRecord } from '@/investment/types';

export interface DataSourceDeduplicationState extends ReactorControllerState {
  recordsProcessed: number;
  duplicatesSkipped: number;
  recordsUpdated: number;
  newRecordsCreated: number;
  aiFailed: number;
}

/**
 * 内容关系类型
 * 
 * 【设计思路】
 * 两个info比较相似性，有5种情况（假设A是新来的，B是最相似的）：
 * 1. A包含B - 过滤掉A里面包含B的部分，评估多出来的信息是否值得推送
 * 2. B包含A - B已经先推送过了，所以A没必要
 * 3. A和B一样 - 不要A了
 * 4. A和B完全没关系 - 保持A原样
 * 5. A和B有重叠的地方 - 把重叠的地方去掉，只留下剩下的部分
 */
type ContentRelationship = 'identical' | 'new_contains_existing' | 'existing_contains_new' | 'unrelated' | 'partial_overlap';

interface DeduplicationResult {
  action: 'proceed' | 'skip' | 'update_existing' | 'create_new_processed' | 'ai_failed';
  updatedContent?: string;
  similarityScore?: number;
  matchedRecordId?: string;
  relationship?: ContentRelationship;
  isTimeEffective?: boolean;
}

export function createDataSourceDeduplicationReactor(
  datasourceConfig: InvestmentConfig['datasource'],
  investmentHandler?: InvestmentHandler,
  enableTracking?: boolean
) {
  // 如果提供了handler，注册这个controller
  if (investmentHandler) {
    investmentHandler.registerController('DataSourceDeduplicationReactor');
  }
  const config: ReactorControllerConfig = {
    name: 'DataSource Deduplication Reactor',
    description: 'Performs deduplication on classified investment records',
    type: 'reactor',
    
    inputEventTypes: [DataSourceRecordClassified],
    outputEventTypes: [DataSourceRecordDeduplicated],
    outputTaskTypes: [],
    
    processInterval: 8000, // 8秒处理间隔
    isActive: true,
    
    async processEvents(events: AgentEvent[], emitter: ControllerEmitter, controller: ReactorController<DataSourceDeduplicationState>) {
      console.log(`[DataSource Deduplication] 处理 ${events.length} 个已分类记录`);

      // ========================================================================
      // TRACKING - START: 初始化Controller追踪
      // ========================================================================
      const controllerId = generateControllerId();
      const trackingEnabled = enableTracking && investmentHandler;
      
      // 从事件提取flowId
      const flowId = events[0].flowId || 'no-flow';
      
      if (flowId !== 'no-flow') {
        console.log(`[DataSource Deduplication] 监测到追踪流Flow ID: ${flowId}`);
      }
      
      // 准备追踪数据结构
      const trackingData: ControllerTrackingData = {
        controllerName: 'DataSourceDeduplicationReactor',
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

      // 逐个分析每个记录
      for (const event of events) {
        if (event.type === DataSourceRecordClassified.type) {
          try {
            const classifiedRecord = DataSourceRecordClassified.schema.parse(event.payload);
            const startTime = Date.now();
            
            // 只处理investment类型的记录
            if (classifiedRecord.category !== 'investment') {
              console.log(`[DataSource Deduplication] 跳过非投资类型记录: ${classifiedRecord.category}`);
              continue;
            }
            
            // 构建记录对象
            const record: DataSourceRecord = {
              recordId: classifiedRecord.recordId,
              entityId: classifiedRecord.entityId,
              entityName: classifiedRecord.entityName,
              dataSourceType: classifiedRecord.dataSourceType,
              content: classifiedRecord.content,
              metadata: classifiedRecord.metadata || null,
              createdAt: classifiedRecord.createdAt,
              category: classifiedRecord.category,
              classificationReason: classifiedRecord.classificationReason,
            };
            
            console.log(`[DataSource Deduplication] 处理记录 ${record.recordId.slice(0, 8)}... 来自 ${record.entityName}`);
            controller.state.recordsProcessed++;

            // 进行去重检查和处理
            const deduplicationResult = await handleDeduplication(record, trackingData, !!trackingEnabled);
            
            // 根据去重结果决定是否发送事件
            if (deduplicationResult.action === 'skip') {
              controller.state.duplicatesSkipped++;
              console.log(`[DataSource Deduplication] 记录被跳过（${deduplicationResult.relationship || '重复'}）`);
              continue;
            } else if (deduplicationResult.action === 'ai_failed') {
              controller.state.aiFailed++;
              console.log(`[DataSource Deduplication] AI分析失败，跳过记录`);
              continue;
            }
            
            // 准备输出内容
            let finalContent = record.content;
            let processedContent: string | undefined;
            let deduplicationAction: 'new' | 'update' | 'processed' = 'new';
            
            if (deduplicationResult.action === 'update_existing') {
              controller.state.recordsUpdated++;
              finalContent = deduplicationResult.updatedContent!;
              processedContent = deduplicationResult.updatedContent;
              deduplicationAction = 'update';
              
              // 更新向量存储中的记录
              await updateExistingVectorRecord(deduplicationResult.matchedRecordId!, record, finalContent);
              console.log(`[DataSource Deduplication] 更新已存在记录`);
              
            } else if (deduplicationResult.action === 'create_new_processed') {
              controller.state.newRecordsCreated++;
              finalContent = deduplicationResult.updatedContent!;
              processedContent = deduplicationResult.updatedContent;
              deduplicationAction = 'processed';
              
              // 保存处理后的内容到向量存储
              const embedding = await generateEmbeddingForContent(finalContent);
              await saveRecordToVectorStore(record, finalContent, embedding);
              console.log(`[DataSource Deduplication] 创建处理后的新记录`);
              
            } else {
              // proceed - 新记录
              controller.state.newRecordsCreated++;
              deduplicationAction = 'new';
              console.log(`[DataSource Deduplication] 创建新记录`);
            }
            
            // 发送去重完成事件
            const outputEvent = {
              recordId: record.recordId,
              entityId: record.entityId,
              entityName: record.entityName,
              dataSourceType: record.dataSourceType,
              content: finalContent,
              processedContent: processedContent,
              deduplicationMetadata: {
                action: deduplicationAction,
                relationship: deduplicationResult.relationship,
                similarityScore: deduplicationResult.similarityScore,
                matchedRecordId: deduplicationResult.matchedRecordId,
                isTimeEffective: deduplicationResult.isTimeEffective,
              },
              category: record.category,
              classificationReason: record.classificationReason,
              metadata: record.metadata,
              createdAt: record.createdAt,
              deduplicatedAt: new Date().toISOString(),
            };
            
            emitter.event(DataSourceRecordDeduplicated).emit(outputEvent, { flowId });
            
            // 记录输出事件
            if (trackingEnabled) {
              trackingData.outputEvents.push({
                type: DataSourceRecordDeduplicated.type,
                payload: outputEvent,
                flowId: flowId
              } as AgentEvent);
            }
            
            const processingTime = Date.now() - startTime;
            console.log(`[DataSource Deduplication] 记录处理完成: ${record.entityName}, 耗时: ${processingTime}ms`);
            
          } catch (error) {
            console.error(`[DataSource Deduplication] 处理记录失败:`, error);
          }
        }
      }
      
      console.log(`[DataSource Deduplication] 处理完成: ${controller.state.recordsProcessed} 个记录, ${controller.state.newRecordsCreated} 个新建, ${controller.state.recordsUpdated} 个更新, ${controller.state.duplicatesSkipped} 个跳过`);
      
      // ========================================================================
      // TRACKING - SAVE: 保存Controller追踪数据
      // ========================================================================
      if (trackingEnabled && investmentHandler) {
        trackingData.processingTime = Date.now() - processingStartTime;
        await investmentHandler.trackController(controllerId, flowId, trackingData);
        console.log(`[DataSource Deduplication] 追踪数据已保存 - Flow: ${flowId}, Controller: ${controllerId}`);
      }
      // ========================================================================
      // TRACKING - SAVE END
      // ========================================================================
    }
  };

  const initialState: DataSourceDeduplicationState = {
    recordsProcessed: 0,
    duplicatesSkipped: 0,
    recordsUpdated: 0,
    newRecordsCreated: 0,
    aiFailed: 0,
  };
  
  return new ReactorController(
    config,
    { tag: ['datasource', 'ai', 'deduplication'], autoActivate: true },
    initialState
  );
}

/**
 * 处理去重逻辑
 */
async function handleDeduplication(
  record: DataSourceRecord,
  trackingData?: ControllerTrackingData,
  trackingEnabled?: boolean
): Promise<DeduplicationResult> {
  try {
    // 获取全局向量存储实例
    const vectorStore = getVectorStore();
    
    // 1. 生成当前内容的嵌入向量
    const embedding = await embed({
      model: qwen.textEmbeddingModel('text-embedding-v4'),
      value: record.content,
      providerOptions: {
        openai: { dimensions: 1536 }
      }
    });

    // 2. 在 info 分区搜索相似内容
    const similarRecords = await vectorStore.search('info', embedding.embedding, {
      limit: 3,
      threshold: 0.6,
      type: 'info'
    });

    // 3. 监控日志
    console.log(`[Deduplication] 记录: ${record.recordId.slice(0, 8)}... 内容: "${record.content.slice(0, 50)}..."`);
    if (similarRecords.length > 0) {
      console.log(`[Deduplication] 找到 ${similarRecords.length} 个相似记录`);
    } else {
      console.log(`[Deduplication] 未找到相似记录`);
    }

    if (similarRecords.length === 0) {
      // 没有相似内容，保存新记录并继续处理
      await saveRecordToVectorStore(record, record.content, embedding.embedding);
      console.log(`[Deduplication] 新内容 -> PROCEED`);
      return { action: 'proceed' };
    }

    // 4. 使用 AI 分析与所有相似记录的关系
    console.log(`[Deduplication] 使用AI分析与 ${similarRecords.length} 条相似记录的关系`);
    const comparisonResult = await compareWithMultipleRecords(record.content, similarRecords, trackingData, trackingEnabled);
    
    // 检查 AI 分析是否失败
    if (comparisonResult.aiFailed) {
      console.log(`[Deduplication] AI分析失败 -> AI_FAILED`);
      return { action: 'ai_failed' };
    }

    // 根据AI分析结果进行处理
    if (comparisonResult.shouldSkip) {
      console.log(`[Deduplication] AI判断跳过 -> SKIP | 关系: ${comparisonResult.relationship}`);
      return { 
        action: 'skip', 
        similarityScore: comparisonResult.similarityScore,
        matchedRecordId: comparisonResult.matchedRecordId,
        relationship: comparisonResult.relationship
      };
    }

    // 如果有处理后的内容
    if (comparisonResult.processedContent) {
      // 根据是否为时效性信息决定更新还是创建新记录
      if (comparisonResult.shouldUpdate && comparisonResult.isTimeEffective) {
        console.log(`[Deduplication] 时效性信息更新 -> UPDATE_EXISTING`);
        return { 
          action: 'update_existing',
          updatedContent: comparisonResult.processedContent,
          similarityScore: comparisonResult.similarityScore,
          matchedRecordId: comparisonResult.matchedRecordId,
          relationship: comparisonResult.relationship,
          isTimeEffective: comparisonResult.isTimeEffective
        };
      } else {
        console.log(`[Deduplication] 创建处理后的新记录 -> CREATE_NEW_PROCESSED`);
        return { 
          action: 'create_new_processed',
          updatedContent: comparisonResult.processedContent,
          similarityScore: comparisonResult.similarityScore,
          matchedRecordId: comparisonResult.matchedRecordId,
          relationship: comparisonResult.relationship,
          isTimeEffective: comparisonResult.isTimeEffective
        };
      }
    }

    // 默认情况：保存新记录并继续处理
    console.log(`[Deduplication] AI判断继续 -> PROCEED`);
    await saveRecordToVectorStore(record, record.content, embedding.embedding);
    return { 
      action: 'proceed',
      relationship: comparisonResult.relationship
    };

  } catch (error) {
    console.error('[Deduplication] 去重处理失败:', error);
    return { action: 'ai_failed' };
  }
}

/**
 * 使用 AI 分析新内容与多个相似记录的关系
 */
async function compareWithMultipleRecords(
  newContent: string,
  similarRecords: Array<{
    entry: { id: string; content: string; };
    similarity: number;
  }>,
  trackingData?: ControllerTrackingData,
  trackingEnabled?: boolean
): Promise<{
  relationship: ContentRelationship;
  shouldSkip: boolean;
  processedContent?: string;
  reasoning: string;
  matchedRecordId?: string;
  similarityScore?: number;
  isTimeEffective?: boolean;
  shouldUpdate?: boolean;
  aiFailed?: boolean;
}> {
  const { model, temperature } = getInvestmentAI('analysis');
  
  try {
    // 构建已存在内容的描述
    const existingContents = similarRecords.map((record, index) => 
      `【已存在内容${index + 1}】(相似度: ${record.similarity.toFixed(4)}, ID: ${record.entry.id.slice(0, 8)})\n${record.entry.content}`
    ).join('\n\n');

    const { system, prompt } = getDuplicationAnalysisPrompt(newContent, existingContents);

    const result = await generateObject({
      model,
      system,
      prompt: prompt,
      schema: z.object({
        relationship: z.enum(['identical', 'new_contains_existing', 'existing_contains_new', 'unrelated', 'partial_overlap'])
          .describe('Content relationship type'),
        shouldSkip: z.boolean()
          .describe('Whether to skip the new content'),
        processedContent: z.string().optional()
          .describe('Extracted incremental content'),
        isTimeEffective: z.boolean()
          .describe('Whether this is time-sensitive information'),
        shouldUpdate: z.boolean()
          .describe('Whether to update existing record'),
        reasoning: z.string().max(500)
          .describe('Concise reasoning for the decision')
      }),
      temperature,
    });
    
    // 记录AI调用信息
    if (trackingEnabled && trackingData) {
      trackingData.aiCalls.push({
        prompt: prompt.substring(0, 500),
        response: JSON.stringify(result.object),
        model: (typeof model === 'string') ? model : model.modelId
      });
    }

    // 验证processedContent长度
    if (result.object.processedContent && result.object.processedContent.length > 8000) {
      console.warn(`[Deduplication AI] processedContent过长，截断至8000字符`);
      result.object.processedContent = result.object.processedContent.slice(0, 8000);
    }

    console.log(`[Deduplication AI] 关系: ${result.object.relationship}, 跳过: ${result.object.shouldSkip}`);
    
    return {
      ...result.object,
      matchedRecordId: similarRecords[0].entry.id,
      similarityScore: similarRecords[0].similarity
    };
    
  } catch (error) {
    console.error('[Deduplication AI] AI比较失败:', error);
    return {
      relationship: 'unrelated',
      shouldSkip: false,
      reasoning: 'AI分析失败',
      aiFailed: true
    };
  }
}

/**
 * 保存记录到向量存储
 */
async function saveRecordToVectorStore(record: DataSourceRecord, content: string, embedding: number[]): Promise<void> {
  const vectorStore = getVectorStore();
  
  const vectorEntry: VectorStoreEntry = {
    id: record.recordId,
    type: 'info',
    embedding,
    dimensions: 1536,
    content: content,
    metadata: {
      entityId: record.entityId,
      entityName: record.entityName,
      dataSourceType: record.dataSourceType,
      originalMetadata: record.metadata,
      updateCount: 0
    },
    timestamp: new Date(record.createdAt).getTime(),
    updatedAt: Date.now()
  };

  await vectorStore.save('info', vectorEntry);
}

/**
 * 为内容生成嵌入向量
 */
async function generateEmbeddingForContent(content: string): Promise<number[]> {
  const embedding = await embed({
    model: qwen.textEmbeddingModel('text-embedding-v4'),
    value: content,
    providerOptions: {
      openai: { dimensions: 1536 }
    }
  });
  return embedding.embedding;
}

/**
 * 更新已存在的向量记录
 */
async function updateExistingVectorRecord(matchedRecordId: string, record: DataSourceRecord, newContent: string): Promise<void> {
  const vectorStore = getVectorStore();
  
  // 重新生成嵌入向量
  const newEmbedding = await generateEmbeddingForContent(newContent);
  
  // 更新向量存储中的记录
  await vectorStore.update('info', matchedRecordId, {
    content: newContent,
    embedding: newEmbedding,
    metadata: {
      entityId: record.entityId,
      entityName: record.entityName,
      dataSourceType: record.dataSourceType,
      originalMetadata: record.metadata,
      lastUpdateFromRecord: record.recordId,
      lastUpdateAt: Date.now()
    }
  });
  
  console.log(`[VectorStore] 更新已存在记录 ${matchedRecordId.slice(0, 8)}...`);
}