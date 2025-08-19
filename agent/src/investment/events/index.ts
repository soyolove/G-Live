import { defineEvent } from 'wond-v3';
import { z } from 'zod';

/**
 * 数据源记录接收事件
 * 当从DataSource Platform获取到新记录时触发
 */
export const DataSourceRecordReceived = defineEvent({
  type: 'DATA_SOURCE_RECORD_RECEIVED',
  name: 'Data Source Record Received',
  description: '接收到新的数据源记录',
  schema: z.object({
    // 记录ID
    recordId: z.string(),
    
    // 实体信息
    entityId: z.string(),
    entityName: z.string(), // 实体名称，更语义化
    
    // 数据类型
    dataSourceType: z.enum(['info', 'strategy']),
    
    // 核心内容
    content: z.string(), // 原始内容字符串
    
    // 元数据（不知道里面有啥，先用any）
    metadata: z.any(),
    
    // 时间戳
    createdAt: z.string(),
  })
});

/**
 * 数据源每小时报告触发事件
 * 定时触发，用于生成过去一小时的投资信息汇总报告
 */
export const DataSourceHourlyReportTrigger = defineEvent({
  type: 'DATA_SOURCE_HOURLY_REPORT_TRIGGER',
  name: 'Data Source Hourly Report Trigger',
  description: '每小时触发一次数据源报告生成',
  schema: z.object({
    timestamp: z.number(),
    reason: z.string(),
  })
});

/**
 * 数据源报告生成完成事件
 * Reactor生成报告后发出，供分发Iterator消费
 */
export const DataSourceReportGenerated = defineEvent({
  type: 'DATA_SOURCE_REPORT_GENERATED',
  name: 'Data Source Report Generated',
  description: '数据源投资报告生成完成',
  schema: z.object({
    // 报告内容
    reportContent: z.string().describe('Formatted investment report content'),
    reportType: z.enum(['hourly', 'fallback']).describe('Report type'),
    
    // 分析元数据
    analysisMetadata: z.object({
      recordsAnalyzed: z.number().describe('Number of records analyzed'),
      intervalHours: z.number().describe('Report interval in hours'),
      dataSourceNames: z.array(z.string()).describe('List of data source names'),
      generatedAt: z.string().describe('Generation timestamp'),
    }).describe('Analysis metadata'),
    
    // 用于插话器的元数据
    interjectMetadata: z.object({
      title: z.string().describe('Report title'),
      category: z.string().describe('Report category'),
      aiModel: z.string().describe('AI model used'),
      priority: z.enum(['low', 'medium', 'high']).describe('Interjection priority'),
    }).describe('Interjector metadata'),
  })
});

/**
 * 数据源报告请求事件
 * Iterator决定需要生成报告时发出，供Reactor消费
 */
export const DataSourceReportRequest = defineEvent({
  type: 'DATA_SOURCE_REPORT_REQUEST',
  name: 'Data Source Report Request',
  description: '数据源报告生成请求（单用户）',
  schema: z.object({
    // 目标用户（单个用户）
    targetUser: z.object({
      userId: z.string().describe('User ID'),
      chatId: z.number().describe('Telegram chat ID'),
    }).describe('Target user'),
    
    // 报告参数
    reportParams: z.object({
      startTime: z.string().describe('Report start time'),
      endTime: z.string().describe('Report end time'),
      reportType: z.enum(['hourly', 'daily', 'weekly']).describe('Report type'),
      recordCount: z.number().describe('Number of data records'),
    }).describe('Report generation parameters'),
    
    // 完整的数据源记录内容
    records: z.array(z.object({
      recordId: z.string().describe('Record ID'),
      entityId: z.string().describe('Entity ID'),
      entityName: z.string().describe('Entity name'),
      dataSourceType: z.enum(['info', 'strategy']).describe('Data type'),
      content: z.string().describe('Record content'),
      metadata: z.any().describe('Metadata'),
      createdAt: z.string().describe('Creation time'),
    })).describe('Data source record list'),
    
    // 请求元数据
    requestMetadata: z.object({
      requestedAt: z.string().describe('Request timestamp'),
      source: z.string().describe('Request source'),
    }).describe('Request metadata'),
  })
});

/**
 * 数据源投资信号生成完成事件
 * Reactor分析完成后发出，供分发Iterator消费
 */
export const DataSourceSignalGenerated = defineEvent({
  type: 'DATA_SOURCE_SIGNAL_GENERATED',
  name: 'Data Source Signal Generated',
  description: '数据源投资信号生成完成',
  schema: z.object({
    // 源记录信息
    recordId: z.string().describe('Source record ID'),
    entityId: z.string().describe('Data source entity ID'),
    entityName: z.string().describe('Data source entity name'),
    
    // 信号内容（AI生成的完整分析文本）
    signalAnalysis: z.string().describe('AI generated investment signal analysis (including target discovery and timing suggestions)'),
    
    // 基础元数据
    generatedAt: z.string().describe('Generation timestamp'),
    aiModel: z.string().describe('AI model used'),
  })
});

/**
 * 投资报告生成完成事件
 * Investment域生成报告后发出，不关心谁会消费
 */
export const InvestmentReportGenerated = defineEvent({
  type: 'INVESTMENT_REPORT_GENERATED',
  name: 'Investment Report Generated',
  description: '投资报告生成完成',
  schema: z.object({
    // 报告内容
    reportContent: z.string().describe('完整的投资报告内容'),
    
    // 报告元数据
    metadata: z.object({
      reportType: z.string().describe('报告类型'),
      targetCount: z.number().describe('包含的标的数量'),
      generatedAt: z.string().describe('生成时间'),
      aiModel: z.string().describe('使用的AI模型'),
    }),
  })
});

/**
 * 择时报告生成完成事件
 * Investment域生成择时报告后发出
 */
export const TimingReportGenerated = defineEvent({
  type: 'TIMING_REPORT_GENERATED',
  name: 'Timing Report Generated',
  description: '择时报告生成完成',
  schema: z.object({
    // 报告内容
    reportContent: z.string().describe('完整的择时报告内容'),
    
    // 报告元数据
    metadata: z.object({
      reportType: z.string().describe('报告类型'),
      signalCount: z.number().describe('包含的信号数量'),
      generatedAt: z.string().describe('生成时间'),
      aiModel: z.string().describe('使用的AI模型'),
    }),
  })
});

/**
 * 数据源记录去重完成事件
 * 经过去重处理后的记录，准备进行信号生成
 */
export const DataSourceRecordDeduplicated = defineEvent({
  type: 'DATA_SOURCE_RECORD_DEDUPLICATED',
  name: 'Data Source Record Deduplicated',
  description: '数据源记录去重处理完成',
  schema: z.object({
    // 记录基本信息
    recordId: z.string(),
    entityId: z.string(),
    entityName: z.string(),
    dataSourceType: z.enum(['info', 'strategy']),
    
    // 处理后的内容
    content: z.string().describe('原始或处理后的内容'),
    processedContent: z.string().optional().describe('AI提取的增量内容（如果有）'),
    
    // 去重元数据
    deduplicationMetadata: z.object({
      action: z.enum(['new', 'update', 'processed']).describe('去重动作类型'),
      relationship: z.enum(['identical', 'new_contains_existing', 'existing_contains_new', 'unrelated', 'partial_overlap']).optional(),
      similarityScore: z.number().optional().describe('与最相似记录的相似度'),
      matchedRecordId: z.string().optional().describe('匹配到的已存在记录ID'),
      isTimeEffective: z.boolean().optional().describe('是否为时效性信息'),
    }),
    
    // 分类信息（从上游继承）
    category: z.enum(['investment', 'entertainment', 'spam', 'other']),
    classificationReason: z.string(),
    
    // 原始元数据
    metadata: z.any(),
    createdAt: z.string(),
    deduplicatedAt: z.string(),
  })
});

// 核心事件导出
export { DataSourceRecordClassified } from './DataSourceRecordClassified';