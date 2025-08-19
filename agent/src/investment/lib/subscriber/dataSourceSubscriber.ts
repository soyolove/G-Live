/**
 * DJ API Platform - Data Source Subscriber
 * 
 * 用于订阅和查询数据记录的客户端工具
 * 支持实时数据订阅、分页查询、时间过滤等功能
 * 
 * 使用示例：
 * ```typescript
 * const subscriber = new DataSourceSubscriber({
 *   baseUrl: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 * 
 * // 获取实体列表
 * const entities = await subscriber.getEntities();
 * 
 * // 查询数据
 * const records = await subscriber.queryRecords({
 *   entityId: 'uuid',
 *   limit: 10
 * });
 * 
 * // 订阅实时数据
 * const subscription = subscriber.subscribe('entity-id', {
 *   onData: (records) => console.log('New data:', records),
 *   onError: (error) => console.error('Error:', error)
 * });
 * ```
 */


/**
 * 订阅配置
 */
export interface SubscriberConfig {
  /** API服务器地址 */
  baseUrl: string;
  /** API Key (可选，用于认证访问) */
  apiKey?: string;
  /** 请求超时时间 (毫秒) */
  timeout?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * API响应基础结构
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    count?: number;
    limit?: number;
    offset?: number;
    entityId?: string;
    afterTimestamp?: string;
    userPlan?: string;
    rateLimit?: number;
    isAuthenticated?: boolean;
    accessMode?: string;
  };
  message?: string;
}

/**
 * 数据记录元数据接口
 */
export interface DataRecordMetadata {
  [key: string]: unknown;
  source?: string;
  type?: string;
  tags?: string[];
  priority?: number;
  author?: string;
  category?: string;
}

/**
 * 数据记录接口 - 基于实际数据库schema
 */
export interface DataRecord {
  id: string;
  entityId: string;
  data: {
    content: string;
  };
  metadata: DataRecordMetadata;
  version: string;
  hash?: string;
  createdAt: string;
}

/**
 * 实体信息 - 基于API返回的实际结构
 */
export interface EntityInfo {
  /** 实体ID */
  entityId: string;
  /** 数据类型 */
  dataType: 'info' | 'strategy';
  /** 记录数量 */
  count: number;
  /** 显示名称 */
  displayName: string;
  /** 描述 */
  description: string;
  /** 状态 */
  status: 'active' | 'inactive' | 'suspended';
  /** 最后活跃时间 */
  lastActiveAt: string;
}

/**
 * 实体详细信息
 */
export interface EntityDetails {
  entityId: string;
  totalRecords: number;
  lastUpdated: string;
}

/**
 * 统计信息
 */
export interface DataSourceStats {
  totalRecords: number;
  lastUpdated: string;
  entityId?: string;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  /** 实体ID */
  entityId?: string;
  /** 每页数据量 (1-1000) */
  limit?: number;
  /** 分页偏移量 */
  offset?: number;
  /** 获取指定时间戳之后的数据 */
  afterTimestamp?: string | Date;
}

/**
 * 订阅选项
 */
export interface SubscriptionOptions {
  /** 轮询间隔 (毫秒)，默认 5000ms */
  interval?: number;
  /** 每次查询的数据量限制，默认 50 */
  limit?: number;
  /** 数据回调函数 */
  onData?: (records: DataRecord[]) => void;
  /** 错误回调函数 */
  onError?: (error: SubscriptionError) => void;
  /** 连接状态回调 */
  onStatusChange?: (connected: boolean) => void;
}

/**
 * 订阅统计信息
 */
export interface SubscriptionStats {
  totalRecords: number;
  lastUpdate: Date | null;
  errors: number;
}

/**
 * 订阅对象
 */
export interface Subscription {
  /** 停止订阅 */
  stop: () => void;
  /** 获取订阅状态 */
  isActive: () => boolean;
  /** 获取统计信息 */
  getStats: () => SubscriptionStats;
}

/**
 * 订阅错误类型
 */
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

/**
 * 数据源订阅器
 */
export class DataSourceSubscriber {
  private readonly config: Required<SubscriberConfig>;
  private subscriptions = new Map<string, Subscription>();

  constructor(config: SubscriberConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      debug: config.debug || false,
    };

    this.log('DataSourceSubscriber initialized', { baseUrl: this.config.baseUrl });
  }

  /**
   * 日志输出
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[DataSourceSubscriber] ${message}`, data || '');
    }
  }

  /**
   * 发送HTTP请求
   */
  private async request<T = unknown>(endpoint: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
  } = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'DJ-DataSourceSubscriber/1.0',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    this.log(`Request: ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      // 处理非JSON响应（如 "Too many requests" 文本响应）
      const contentType = response.headers.get('content-type');
      let data: ApiResponse<T>;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json() as ApiResponse<T>;
      } else {
        // 如果不是JSON，读取文本内容作为错误消息
        const text = await response.text();
        data = {
          success: false,
          data: null as any,
          message: text || `HTTP ${response.status} ${response.statusText}`
        };
      }

      if (!response.ok) {
        // 特殊处理429错误（Too Many Requests）
        if (response.status === 429) {
          throw new SubscriptionError(
            'Rate limit exceeded - Too many requests',
            'RATE_LIMIT',
            429
          );
        }
        
        throw new SubscriptionError(
          data.message || 'Request failed',
          'HTTP_ERROR',
          response.status
        );
      }

      if (!data.success) {
        throw new SubscriptionError(data.message || 'API request failed', 'API_ERROR');
      }

      // 只在有数据时才输出日志，避免频繁的空响应日志
      if (Array.isArray(data.data) && data.data.length > 0) {
        this.log(`Response: ${response.status}`, { 
          dataLength: data.data.length,
          meta: data.meta
        });
      }
      return data.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Request failed: ${errorMessage}`);
      
      if (error instanceof SubscriptionError) {
        throw error;
      }
      
      throw new SubscriptionError(
        errorMessage,
        'REQUEST_ERROR',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 获取可用的实体列表
   */
  async getEntities(): Promise<EntityInfo[]> {
    return await this.request<EntityInfo[]>('/public/data/entities');
  }

  /**
   * 获取实体详细信息
   */
  async getEntityInfo(entityId: string): Promise<EntityDetails> {
    return await this.request<EntityDetails>(`/public/data/entities/${entityId}`);
  }

  /**
   * 查询数据记录
   */
  async queryRecords(options: QueryOptions = {}): Promise<DataRecord[]> {
    const params = new URLSearchParams();
    
    if (options.entityId) params.append('entityId', options.entityId);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.afterTimestamp) {
      const timestamp = options.afterTimestamp instanceof Date 
        ? options.afterTimestamp.toISOString()
        : options.afterTimestamp;
      params.append('afterTimestamp', timestamp);
    }

    const queryString = params.toString();
    const endpoint = `/public/data/records${queryString ? `?${queryString}` : ''}`;
    
    return await this.request<DataRecord[]>(endpoint);
  }

  /**
   * 获取单个数据记录
   */
  async getRecord(recordId: string): Promise<DataRecord> {
    return await this.request<DataRecord>(`/public/data/records/${recordId}`);
  }

  /**
   * 获取统计信息
   */
  async getStats(entityId?: string): Promise<DataSourceStats> {
    const params = new URLSearchParams();
    if (entityId) params.append('entityId', entityId);
    
    const queryString = params.toString();
    const endpoint = `/public/data/stats${queryString ? `?${queryString}` : ''}`;
    
    return await this.request<DataSourceStats>(endpoint);
  }

  /**
   * 订阅实体数据变化
   */
  subscribe(
    entityIdOrOptions: string | QueryOptions,
    subscriptionOptions: SubscriptionOptions = {}
  ): Subscription {
    let queryOptions: QueryOptions;

    if (typeof entityIdOrOptions === 'string') {
      queryOptions = { entityId: entityIdOrOptions };
    } else {
      queryOptions = entityIdOrOptions;
    }

    const {
      interval = 5000,
      limit = 50,
      onData,
      onError,
      onStatusChange
    } = subscriptionOptions;

    const subscriptionKey = `${queryOptions.entityId || 'all'}-${Date.now()}`;
    let isActive = true;
    let lastTimestamp: Date | null = null;
    let totalRecords = 0;
    let errors = 0;

    const stats: SubscriptionStats = {
      totalRecords: 0,
      lastUpdate: null,
      errors: 0,
    };

    const poll = async (): Promise<void> => {
      if (!isActive) return;

      try {
        const records = await this.queryRecords({
          ...queryOptions,
          limit,
          afterTimestamp: lastTimestamp || undefined,
        });

        if (records.length > 0) {
          this.log(`Subscription ${subscriptionKey}: ${records.length} new records`);
          
          // 更新统计
          totalRecords += records.length;
          // 获取最新记录的时间戳（假设records已按时间降序排列）
          const newestRecord = records.reduce((newest, record) => 
            new Date(record.createdAt) > new Date(newest.createdAt) ? record : newest
          );
          // 加1毫秒，避免重复获取同一条记录（API使用>=而不是>）
          lastTimestamp = new Date(new Date(newestRecord.createdAt).getTime() + 1);
          stats.totalRecords = totalRecords;
          stats.lastUpdate = new Date();

          // 调用数据回调
          onData?.(records);
        }

        // 通知连接正常
        onStatusChange?.(true);

      } catch (error) {
        errors++;
        stats.errors = errors;
        
        const subscriptionError = error instanceof SubscriptionError
          ? error
          : new SubscriptionError(
              error instanceof Error ? error.message : 'Unknown error',
              'SUBSCRIPTION_ERROR',
              undefined,
              error instanceof Error ? error : undefined
            );
        
        this.log(`Subscription ${subscriptionKey} error:`, subscriptionError.message);
        
        onError?.(subscriptionError);
        onStatusChange?.(false);
      }

      // 继续下一次轮询
      if (isActive) {
        setTimeout(poll, interval);
      }
    };

    // 开始轮询
    poll();

    const subscription: Subscription = {
      stop: () => {
        isActive = false;
        this.subscriptions.delete(subscriptionKey);
        this.log(`Subscription ${subscriptionKey} stopped`);
      },
      isActive: () => isActive,
      getStats: () => ({ ...stats })
    };

    this.subscriptions.set(subscriptionKey, subscription);
    this.log(`Subscription ${subscriptionKey} started`, { queryOptions, interval });

    return subscription;
  }

  /**
   * 停止所有订阅
   */
  stopAllSubscriptions(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.stop();
    }
    this.subscriptions.clear();
    this.log('All subscriptions stopped');
  }

  /**
   * 获取活跃订阅数量
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

/**
 * 快速创建订阅器实例
 */
export function createSubscriber(config: SubscriberConfig): DataSourceSubscriber {
  return new DataSourceSubscriber(config);
}

/**
 * 批量订阅选项
 */
export interface MultipleSubscriptionOptions extends Omit<SubscriptionOptions, 'onError'> {
  onNewData?: (entityId: string, records: DataRecord[]) => void;
  onError?: (entityId: string, error: SubscriptionError) => void;
}

/**
 * 批量订阅多个实体
 */
export function subscribeMultiple(
  subscriber: DataSourceSubscriber,
  entityId: string,
  options: MultipleSubscriptionOptions
): Record<string, Subscription> {
  const subscriptions: Record<string, Subscription> = {};

  const subscription = subscriber.subscribe(entityId, {
    ...options,
    onData: (records) => options.onNewData?.(entityId, records),
    onError: (error) => options.onError?.(entityId, error),
  });

  subscriptions[entityId] = subscription;

  return subscriptions;
}

/**
 * 实用函数：等待特定条件的数据
 */
export async function waitForData(
  subscriber: DataSourceSubscriber,
  entityId: string,
  condition: (record: DataRecord) => boolean,
  timeout: number = 30000
): Promise<DataRecord> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.stop();
      reject(new SubscriptionError('Timeout waiting for data', 'TIMEOUT'));
    }, timeout);

    const subscription = subscriber.subscribe(entityId, {
      onData: (records) => {
        const matchingRecord = records.find(condition);
        if (matchingRecord) {
          clearTimeout(timer);
          subscription.stop();
          resolve(matchingRecord);
        }
      },
      onError: (error) => {
        clearTimeout(timer);
        subscription.stop();
        reject(error);
      }
    });
  });
} 