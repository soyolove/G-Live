import { DataSourceSubscriber, SubscriberConfig, QueryOptions, SubscriptionOptions, Subscription, DataRecord } from './dataSourceSubscriber';
import { getRedisClient, getMockRedisClient } from '../../../lib/storage/redisConnection';
import type { Redis } from 'ioredis';

/**
 * 持久化订阅配置
 */
export interface PersistentSubscriberConfig extends SubscriberConfig {
  /** Redis URL (可选，不提供则使用mock) */
  redisUrl?: string;
  /** Redis key前缀 */
  redisKeyPrefix?: string;
  /** 是否启用持久化 */
  enablePersistence?: boolean;
}

/**
 * 订阅状态数据
 */
export interface SubscriptionState {
  entityId: string;
  lastTimestamp: string | null;
  totalRecords: number;
  lastUpdate: string | null;
  createdAt: string;
}

/**
 * 支持Redis持久化的数据源订阅器
 */
export class PersistentDataSourceSubscriber extends DataSourceSubscriber {
  private redis: Redis | null = null;
  private redisKeyPrefix: string;
  private enablePersistence: boolean;
  private isUsingMockRedis: boolean = false;

  constructor(config: PersistentSubscriberConfig) {
    super(config);
    this.redisKeyPrefix = config.redisKeyPrefix || 'datasource:subscription:';
    // 注意：这里不能用 || 操作符，因为 false || true = true 会导致布尔值 false 被当作 falsy 覆盖
    // 必须用 ?? (nullish coalescing) 来处理 null/undefined，保留明确的 false 值
    this.enablePersistence = config.enablePersistence ?? true;
    this.redisUrl = config.redisUrl;
    
    // Redis 初始化将在第一次使用时进行
  }
  
  private redisUrl?: string;
  private redisInitialized = false;
  
  /**
   * 确保 Redis 已初始化
   */
  private async ensureRedisInitialized(): Promise<void> {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    console.log(`[${timestamp}] [PersistentSubscriber] 检查 Redis 初始化状态: redisInitialized=${this.redisInitialized}, enablePersistence=${this.enablePersistence}`);
    
    if (!this.redisInitialized && this.enablePersistence) {
      console.log(`[${timestamp}] [PersistentSubscriber] 开始初始化 Redis...`);
      await this.initializeRedis(this.redisUrl);
      this.redisInitialized = true;
      console.log(`[${timestamp}] [PersistentSubscriber] Redis 初始化完成，redis 对象: ${this.redis ? '已创建' : '为 null'}`);
    } else if (!this.enablePersistence) {
      console.log(`[${timestamp}] [PersistentSubscriber] 持久化已禁用，跳过 Redis 初始化`);
    } else {
      console.log(`[${timestamp}] [PersistentSubscriber] Redis 已初始化，跳过重复初始化`);
    }
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(redisUrl?: string): Promise<void> {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    console.log(`[${timestamp}] [PersistentSubscriber] 初始化 Redis 连接...`);
    
    // 如果明确禁用了持久化，直接使用 Mock Redis
    if (!this.enablePersistence) {
      console.log(`[${timestamp}] [PersistentSubscriber] 持久化已禁用，使用 Mock Redis`);
      this.redis = getMockRedisClient();
      this.isUsingMockRedis = true;
      console.log(`[${timestamp}] [PersistentSubscriber] Redis 连接状态: ⚠️  使用 Mock Redis (数据不会持久化)`);
      return;
    }
    
    // 如果启用了持久化，尝试连接真实 Redis
    console.log(`[${timestamp}] [PersistentSubscriber] Redis URL: ${redisUrl || '未设置 (将使用 Mock)'}`);
    
    const { client, isUsingMock } = await getRedisClient(redisUrl);
    this.redis = client;
    this.isUsingMockRedis = isUsingMock;
    
    console.log(`[${timestamp}] [PersistentSubscriber] Redis 连接状态: ${this.isUsingMockRedis ? '⚠️  使用 Mock Redis (数据不会持久化)' : '✅ 连接到真实 Redis'}`);
    
    if (!this.isUsingMockRedis && this.enablePersistence) {
      // 检查 Redis 中现有的订阅状态
      try {
        const pattern = `${this.redisKeyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        console.log(`[${timestamp}] [PersistentSubscriber] Redis 中找到 ${keys.length} 个已保存的订阅状态`);
        if (keys.length > 0) {
          console.log(`[${timestamp}] [PersistentSubscriber] Key 前缀: ${this.redisKeyPrefix}`);
        }
      } catch (error) {
        console.error(`[${timestamp}] [PersistentSubscriber] 检查 Redis 状态失败:`, error);
      }
    }
  }

  /**
   * 获取Redis key
   */
  private getRedisKey(entityId: string): string {
    return `${this.redisKeyPrefix}${entityId}`;
  }

  /**
   * 保存订阅状态到Redis
   */
  private async saveSubscriptionState(entityId: string, state: SubscriptionState): Promise<void> {
    if (!this.enablePersistence) return;
    
    // 确保 Redis 已初始化
    await this.ensureRedisInitialized();
    
    if (!this.redis) return;

    try {
      const key = this.getRedisKey(entityId);
      await this.redis.set(key, JSON.stringify(state));
      const timestamp = new Date().toLocaleTimeString('zh-CN');
      console.log(`[${timestamp}] [PersistentSubscriber] 保存状态 ${entityId.slice(0, 8)}... 到Redis: lastTimestamp=${state.lastTimestamp}`);
    } catch (error) {
      console.error('[PersistentSubscriber] Failed to save state:', error);
    }
  }

  /**
   * 从Redis加载订阅状态
   */
  private async loadSubscriptionState(entityId: string): Promise<SubscriptionState | null> {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    
    if (!this.enablePersistence) {
      console.log(`[${timestamp}] [PersistentSubscriber] ⚠️  持久化已禁用，跳过加载状态`);
      return null;
    }
    
    // 确保 Redis 已初始化
    await this.ensureRedisInitialized();
    
    if (!this.redis) {
      console.log(`[${timestamp}] [PersistentSubscriber] ❌ Redis 初始化失败，无法加载状态`);
      return null;
    }

    try {
      const key = this.getRedisKey(entityId);
      console.log(`[${timestamp}] [PersistentSubscriber] 尝试从 Redis 加载: ${key}`);
      
      const data = await this.redis.get(key);
      
      if (data) {
        const state = JSON.parse(data) as SubscriptionState;
        console.log(`[${timestamp}] [PersistentSubscriber] ✅ 成功加载实体状态 ${entityId.slice(0, 8)}...:`);
        console.log(`  - 上次时间戳: ${state.lastTimestamp}`);
        console.log(`  - 总记录数: ${state.totalRecords}`);
        console.log(`  - 上次更新: ${state.lastUpdate}`);
        return state;
      } else {
        console.log(`[${timestamp}] [PersistentSubscriber] ⚠️  未找到实体 ${entityId.slice(0, 8)}... 的保存状态 (key: ${key})`);
      }
    } catch (error) {
      console.error(`[${timestamp}] [PersistentSubscriber] ❌ 加载状态失败:`, error);
    }

    return null;
  }

  /**
   * 删除订阅状态
   */
  private async deleteSubscriptionState(entityId: string): Promise<void> {
    if (!this.redis || !this.enablePersistence) return;

    try {
      const key = this.getRedisKey(entityId);
      await this.redis.del(key);
      console.log(`[PersistentSubscriber] Deleted state for entity ${entityId}`);
    } catch (error) {
      console.error('[PersistentSubscriber] Failed to delete state:', error);
    }
  }

  /**
   * 获取所有订阅状态
   */
  async getAllSubscriptionStates(): Promise<Record<string, SubscriptionState>> {
    if (!this.redis || !this.enablePersistence) return {};

    try {
      const pattern = `${this.redisKeyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      const states: Record<string, SubscriptionState> = {};

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const entityId = key.replace(this.redisKeyPrefix, '');
          states[entityId] = JSON.parse(data);
        }
      }

      return states;
    } catch (error) {
      console.error('[PersistentSubscriber] Failed to get all states:', error);
      return {};
    }
  }

  /**
   * 订阅实体数据变化（支持持久化）
   */
  subscribe(
    entityIdOrOptions: string | QueryOptions,
    subscriptionOptions: SubscriptionOptions = {}
  ): Subscription {
    let queryOptions: QueryOptions;
    let entityId: string;

    if (typeof entityIdOrOptions === 'string') {
      queryOptions = { entityId: entityIdOrOptions };
      entityId = entityIdOrOptions;
    } else {
      queryOptions = entityIdOrOptions;
      entityId = queryOptions.entityId || 'all';
    }

    const {
      interval = 5000,
      limit = 50,
      onData,
      onError,
      onStatusChange
    } = subscriptionOptions;

    const subscriptionKey = `${entityId}-${Date.now()}`;
    let isActive = true;
    let lastTimestamp: Date | null = null;
    let totalRecords = 0;
    let errors = 0;

    // 尝试从Redis加载之前的状态
    const initializeSubscription = async () => {
      const savedState = await this.loadSubscriptionState(entityId);
      
      if (savedState && savedState.lastTimestamp) {
        lastTimestamp = new Date(savedState.lastTimestamp);
        totalRecords = savedState.totalRecords || 0;
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        console.log(`[${timestamp}] [PersistentSubscriber] 恢复订阅 ${entityId.slice(0, 8)}... 从时间戳: ${savedState.lastTimestamp}`);
      } else {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        console.log(`[${timestamp}] [PersistentSubscriber] 全新订阅 ${entityId.slice(0, 8)}... (无历史记录)`);
      }

      // 开始轮询
      poll();
    };

    const poll = async (): Promise<void> => {
      if (!isActive) return;

      try {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        const queryParams = {
          ...queryOptions,
          limit,
          afterTimestamp: lastTimestamp || undefined,
        };
        
        console.log(`[${timestamp}] [PersistentSubscriber] 查询参数 ${entityId.slice(0, 8)}...: afterTimestamp=${queryParams.afterTimestamp ? new Date(queryParams.afterTimestamp).toLocaleString('zh-CN') : 'undefined'}, limit=${queryParams.limit}`);
        
        const records = await this.queryRecords(queryParams);

        if (records.length > 0) {
          const timestamp = new Date().toLocaleTimeString('zh-CN');
          const oldestRecord = records.reduce((oldest, record) => 
            new Date(record.createdAt) < new Date(oldest.createdAt) ? record : oldest
          );
          const newestRecord = records.reduce((newest, record) => 
            new Date(record.createdAt) > new Date(newest.createdAt) ? record : newest
          );
          
          console.log(`[${timestamp}] [PersistentSubscriber] ${entityId.slice(0, 8)}... 收到 ${records.length} 条新记录`);
          console.log(`  时间范围: ${new Date(oldestRecord.createdAt).toLocaleString('zh-CN')} ~ ${new Date(newestRecord.createdAt).toLocaleString('zh-CN')}`);
          
          // 更新统计
          totalRecords += records.length;
          lastTimestamp = new Date(new Date(newestRecord.createdAt).getTime() + 1);

          // 保存状态到Redis
          await this.saveSubscriptionState(entityId, {
            entityId,
            lastTimestamp: lastTimestamp.toISOString(),
            totalRecords,
            lastUpdate: new Date().toISOString(),
            createdAt: savedState?.createdAt || new Date().toISOString()
          });

          // 调用数据回调
          onData?.(records);
        }

        // 通知连接正常
        onStatusChange?.(true);

      } catch (error) {
        errors++;
        console.error(`[PersistentSubscriber] ${entityId} error:`, error);
        onError?.(error as any);
        onStatusChange?.(false);
      }

      // 继续下一次轮询
      if (isActive) {
        setTimeout(poll, interval);
      }
    };

    // 保存的状态供异步初始化使用
    let savedState: SubscriptionState | null = null;

    // 启动订阅
    initializeSubscription();

    const subscription: Subscription = {
      stop: () => {
        isActive = false;
        console.log(`[PersistentSubscriber] Subscription ${subscriptionKey} stopped`);
      },
      isActive: () => isActive,
      getStats: () => ({
        totalRecords,
        lastUpdate: lastTimestamp,
        errors
      })
    };

    return subscription;
  }

  /**
   * 清除所有持久化数据
   */
  async clearAllPersistenceData(): Promise<void> {
    if (!this.redis || !this.enablePersistence) return;

    try {
      const pattern = `${this.redisKeyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`[PersistentSubscriber] Cleared ${keys.length} subscription states`);
      }
    } catch (error) {
      console.error('[PersistentSubscriber] Failed to clear persistence data:', error);
    }
  }

  /**
   * 获取订阅统计信息
   */
  async getSubscriptionStats(): Promise<{
    totalEntities: number;
    totalRecords: number;
    oldestTimestamp: string | null;
    newestTimestamp: string | null;
  }> {
    const states = await this.getAllSubscriptionStates();
    const stateValues = Object.values(states);

    if (stateValues.length === 0) {
      return {
        totalEntities: 0,
        totalRecords: 0,
        oldestTimestamp: null,
        newestTimestamp: null
      };
    }

    const totalRecords = stateValues.reduce((sum, state) => sum + (state.totalRecords || 0), 0);
    const timestamps = stateValues
      .map(state => state.lastTimestamp)
      .filter(ts => ts !== null) as string[];

    return {
      totalEntities: stateValues.length,
      totalRecords,
      oldestTimestamp: timestamps.length > 0 ? timestamps.sort()[0] : null,
      newestTimestamp: timestamps.length > 0 ? timestamps.sort()[timestamps.length - 1] : null
    };
  }
}

/**
 * 创建持久化订阅器实例
 */
export function createPersistentSubscriber(config: PersistentSubscriberConfig): PersistentDataSourceSubscriber {
  return new PersistentDataSourceSubscriber(config);
}