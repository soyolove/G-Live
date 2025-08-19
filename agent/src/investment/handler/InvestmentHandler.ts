import { AgentEvent } from 'wond-v3';
import Redis from 'ioredis';

export interface ControllerTrackingData {
  controllerName: string;
  flowId: string;  // 添加flowId字段
  inputEvents: AgentEvent[];
  outputEvents: AgentEvent[];
  aiCalls: Array<{
    prompt: string;
    response: string;
    model: string;
    tokens?: number;
  }>;
  internalState: Record<string, any>;
  processingTime: number;
  timestamp: number;
  batchNumber?: number;  // 批次号
}

// Controller在某个Flow中的完整执行记录
export interface ControllerFlowExecution {
  controllerName: string;
  flowId: string;
  totalBatches: number;  // 总批次数
  totalInputEvents: number;  // 总输入事件数
  totalOutputEvents: number;  // 总输出事件数
  totalProcessingTime: number;  // 总处理时间
  batches: ControllerTrackingData[];  // 每个批次的详细数据
  firstBatchTime: number;  // 第一批次时间
  lastBatchTime: number;  // 最后一批次时间
}

export interface FlowData {
  flowId: string;
  inputEvents: AgentEvent[];
  outputEvents: AgentEvent[];
  controllers: string[];
  startTime: number;
  endTime?: number;
  status: 'processing' | 'completed' | 'error';
}

export interface InvestmentHandlerConfig {
  redisUrl?: string;
  traceTTL?: number;
  metricsTTL?: number;
}

export class InvestmentHandler {
  private redis: Redis;
  private readonly traceTTL: number;
  private readonly metricsTTL: number;
  private activeControllers: Set<string>;  // 使用Set存储活跃的controller名称
  
  constructor(config?: InvestmentHandlerConfig) {
    const redisUrl = config?.redisUrl || 'redis://localhost:6380';
    this.redis = new Redis(redisUrl);
    this.traceTTL = config?.traceTTL || 3600; // 默认1小时
    this.metricsTTL = config?.metricsTTL || 86400; // 默认24小时
    this.activeControllers = new Set<string>();  // 初始化空集合
    
    console.log(`[InvestmentHandler] Connected to Redis at ${redisUrl}`);
  }
  
  /**
   * 开始追踪一个新的Flow
   */
  async trackFlowStart(flowId: string, inputEvents: AgentEvent[]): Promise<void> {
    const flowData: FlowData = {
      flowId,
      inputEvents,
      outputEvents: [],
      controllers: [],
      startTime: Date.now(),
      status: 'processing'
    };
    
    await this.redis.setex(
      `flow:${flowId}`,
      this.traceTTL,
      JSON.stringify(flowData)
    );
    
    await this.redis.setex(
      `flow:${flowId}:input`,
      this.traceTTL,
      JSON.stringify(inputEvents)
    );
    
    console.log(`[InvestmentHandler] Started tracking flow ${flowId} with ${inputEvents.length} input events`);
  }
  
  /**
   * 追踪Controller的处理过程（支持批次）
   */
  async trackController(
    controllerId: string,
    flowId: string,
    data: ControllerTrackingData
  ): Promise<void> {
    const controllerFlowKey = `controller:${data.controllerName}:flow:${flowId}`;
    
    // 获取当前批次号
    const currentBatchNumber = await this.redis.incr(`${controllerFlowKey}:batch`);
    await this.redis.expire(`${controllerFlowKey}:batch`, this.traceTTL);
    
    // 为数据添加批次号
    const batchData = {
      ...data,
      flowId,
      batchNumber: currentBatchNumber
    };
    
    // 存储Controller实例数据
    await this.redis.setex(
      `controller:instance:${controllerId}`,
      this.traceTTL,
      JSON.stringify({
        ...batchData,
        controllerId
      })
    );
    
    // 更新Flow的Controller列表
    await this.redis.sadd(`flow:${flowId}:controllers`, data.controllerName);
    
    // 存储每个批次的详细数据
    await this.redis.lpush(
      `${controllerFlowKey}:batches`,
      JSON.stringify(batchData)
    );
    await this.redis.expire(`${controllerFlowKey}:batches`, this.traceTTL);
    
    // 更新汇总数据
    const existingSummaryStr = await this.redis.get(`${controllerFlowKey}:summary`);
    const existingSummary = existingSummaryStr ? JSON.parse(existingSummaryStr) : {
      controllerName: data.controllerName,
      flowId,
      totalBatches: 0,
      totalInputEvents: 0,
      totalOutputEvents: 0,
      totalProcessingTime: 0,
      firstBatchTime: data.timestamp,
      lastBatchTime: data.timestamp
    };
    
    const updatedSummary = {
      ...existingSummary,
      totalBatches: currentBatchNumber,
      totalInputEvents: existingSummary.totalInputEvents + data.inputEvents.length,
      totalOutputEvents: existingSummary.totalOutputEvents + data.outputEvents.length,
      totalProcessingTime: existingSummary.totalProcessingTime + data.processingTime,
      lastBatchTime: data.timestamp
    };
    
    await this.redis.setex(
      `${controllerFlowKey}:summary`,
      this.traceTTL,
      JSON.stringify(updatedSummary)
    );
    
    // 只在第一批次时添加到Flow历史
    if (currentBatchNumber === 1) {
      await this.redis.lpush(
        `controller:${data.controllerName}:flows`,
        flowId
      );
      await this.redis.ltrim(`controller:${data.controllerName}:flows`, 0, 99);
    }
    
    // 更新最新处理记录
    await this.redis.set(
      `controller:${data.controllerName}:latest`,
      JSON.stringify(batchData)
    );
    
    console.log(
      `[InvestmentHandler] Tracked ${data.controllerName} in flow ${flowId} (batch ${currentBatchNumber}): ` +
      `${data.inputEvents.length} in → ${data.outputEvents.length} out`
    );
  }
  
  /**
   * 完成Flow追踪
   */
  async trackFlowEnd(flowId: string, outputEvents: AgentEvent[]): Promise<void> {
    const flowKey = `flow:${flowId}`;
    const flowData = await this.redis.get(flowKey);
    
    if (flowData) {
      const flow: FlowData = JSON.parse(flowData);
      flow.outputEvents = outputEvents;
      flow.endTime = Date.now();
      flow.status = 'completed';
      
      await this.redis.setex(
        flowKey,
        this.traceTTL,
        JSON.stringify(flow)
      );
      
      await this.redis.setex(
        `flow:${flowId}:output`,
        this.traceTTL,
        JSON.stringify(outputEvents)
      );
      
      console.log(
        `[InvestmentHandler] Completed flow ${flowId}: ` +
        `${flow.inputEvents.length} in → ${outputEvents.length} out, ` +
        `took ${flow.endTime - flow.startTime}ms`
      );
    }
  }
  
  /**
   * 获取Controller的执行历史（返回汇总数据）
   */
  async getControllerHistory(
    controllerName: string,
    limit: number = 10
  ): Promise<ControllerFlowExecution[]> {
    const flowIds = await this.redis.lrange(
      `controller:${controllerName}:flows`,
      0,
      limit - 1
    );
    
    const history: ControllerFlowExecution[] = [];
    for (const flowId of flowIds) {
      // 获取汇总数据
      const summaryStr = await this.redis.get(
        `controller:${controllerName}:flow:${flowId}:summary`
      );
      
      if (summaryStr) {
        const summary = JSON.parse(summaryStr);
        
        // 获取所有批次的详细数据
        const batchesStr = await this.redis.lrange(
          `controller:${controllerName}:flow:${flowId}:batches`,
          0,
          -1
        );
        
        const batches = batchesStr.map(str => JSON.parse(str)).reverse(); // 按时间顺序
        
        history.push({
          ...summary,
          batches
        });
      }
    }
    
    return history;
  }
  
  /**
   * 获取Flow的完整追踪数据
   */
  async getFlowTrace(flowId: string): Promise<FlowData | null> {
    const flowData = await this.redis.get(`flow:${flowId}`);
    if (!flowData) return null;
    
    const flow: FlowData = JSON.parse(flowData);
    
    // 获取所有Controller的处理数据
    const controllers = await this.redis.smembers(`flow:${flowId}:controllers`);
    const controllerData: Record<string, ControllerTrackingData> = {};
    
    for (const controllerName of controllers) {
      const data = await this.redis.get(
        `controller:${controllerName}:flow:${flowId}`
      );
      if (data) {
        controllerData[controllerName] = JSON.parse(data);
      }
    }
    
    return {
      ...flow,
      controllerData
    } as any;
  }
  
  /**
   * 获取所有Flows列表
   */
  async getAllFlows(limit: number = 50): Promise<string[]> {
    const keys = await this.redis.keys('flow:*');
    const flowIds = keys
      .filter(key => !key.includes(':'))
      .map(key => key.replace('flow:', ''))
      .slice(0, limit);
    
    return flowIds;
  }
  
  /**
   * 注册一个活跃的Controller
   */
  registerController(controllerName: string): void {
    this.activeControllers.add(controllerName);
    console.log(`[InvestmentHandler] Registered controller: ${controllerName}`);
  }
  
  /**
   * 获取所有可用的Controller
   * 优先返回内存中的活跃controller列表，如果没有则从Redis查询历史记录
   */
  async getAvailableControllers(): Promise<string[]> {
    // 如果有注册的活跃controller，直接返回
    if (this.activeControllers.size > 0) {
      const controllers = Array.from(this.activeControllers).sort();
      console.log(`[InvestmentHandler] Returning ${controllers.length} active controllers from memory:`, controllers);
      return controllers;
    }
    
    // 否则从Redis查询历史记录（降级方案）
    try {
      console.log(`[InvestmentHandler] No active controllers in memory, querying from Redis...`);
      // 查找所有 controller:*:flows 的 keys
      const keys = await this.redis.keys('controller:*:flows');
      
      // 提取 Controller 名称并去重
      const controllers = [...new Set(
        keys.map(key => {
          // controller:DataSourceClassifierReactor:flows -> DataSourceClassifierReactor
          const match = key.match(/^controller:(.+):flows$/);
          return match ? match[1] : null;
        }).filter(Boolean) as string[]
      )];
      
      // 按字母顺序排序
      controllers.sort();
      
      console.log(`[InvestmentHandler] Found ${controllers.length} controllers from Redis:`, controllers);
      return controllers;
      
    } catch (error) {
      console.error('[InvestmentHandler] Error getting available controllers:', error);
      return [];
    }
  }
  
  /**
   * 清理所有Handler缓存数据
   */
  async clearAllHandlerData(): Promise<void> {
    // 获取所有相关的key
    const patterns = [
      'controller:*',
      'flow:*'
    ];
    
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`[InvestmentHandler] Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    }
    
    console.log('[InvestmentHandler] All handler data cleared');
  }
  
  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
    console.log('[InvestmentHandler] Cleaned up Redis connection');
  }
  
  /**
   * 生成唯一的Controller ID
   */
  static generateControllerId(): string {
    return `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 生成唯一的Flow ID
   */
  static generateFlowId(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const random = Math.random().toString(36).substr(2, 9);
    return `flow-${dateStr}-${random}`;
  }
}