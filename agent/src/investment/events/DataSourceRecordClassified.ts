import { defineEvent } from 'wond-v3';
import { z } from 'zod';

/**
 * 数据源记录分类完成事件
 * 在DataSourceClassifierReactor分析并分类记录后发出
 * 只有投资相关的记录会发出此事件
 */
export const DataSourceRecordClassified = defineEvent({
  type: 'DATA_SOURCE_RECORD_CLASSIFIED',
  name: 'DataSource Record Classified',
  description: 'Record classified as investment-related by the classifier',
  schema: z.object({
    // 原始记录信息
    recordId: z.string(),
    entityId: z.string(),
    entityName: z.string(),
    dataSourceType: z.enum(['info', 'strategy']),
    content: z.string(),
    metadata: z.record(z.union([
      z.string(),
      z.number(), 
      z.boolean(),
      z.null()
    ])).nullable(),
    createdAt: z.string(),
    
    // 分类信息
    category: z.enum(['investment', 'entertainment', 'spam', 'other']),
    classificationReason: z.string(),
    classifiedAt: z.string(),
  }),
});