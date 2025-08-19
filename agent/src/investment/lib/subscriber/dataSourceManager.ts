import { PersistentDataSourceSubscriber } from './persistentDataSourceSubscriber'
import type { DataRecord, EntityInfo, Subscription } from './dataSourceSubscriber';
import type { InvestmentConfig } from '../../../config/investment.config';

type RecordCallback = (record: DataRecord, entity: EntityInfo) => void;

/**
 * 数据源管理器
 * 负责管理数据源订阅的状态和方法
 * 支持Redis持久化，重启后从上次位置继续
 */
export class DataSourceManager {
  private subscriber: PersistentDataSourceSubscriber;
  private entities: EntityInfo[] = [];
  private subscriptions = new Map<string, Subscription>();
  private datasourceConfig?: InvestmentConfig['datasource'];

  constructor(config: {
    baseUrl: string;
    apiKey?: string;
    debug?: boolean;
    redisUrl?: string;
    datasourceConfig?: InvestmentConfig['datasource'];
  }) {
    
    // 根据配置决定是否启用持久化
    // 注意：disableTimestampCache = true 表示禁用缓存，所以 enablePersistence 应该是反的
    const enablePersistence = !config.datasourceConfig?.disableTimestampCache;

    console.log(`[DataSourceManager] 初始化数据源管理器，启用持久化: ${enablePersistence ? '是' : '否'}`);
    
    this.subscriber = new PersistentDataSourceSubscriber({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      timeout: 30000,
      debug: config.debug || false,
      redisUrl: config.redisUrl,
      redisKeyPrefix: 'jirai:datasource:',
      enablePersistence,
    });
    
    if (config.datasourceConfig?.disableTimestampCache) {
      console.log('[DataSourceManager] ⚠️  已禁用时间戳缓存，将使用内存模式（每次重启拉取所有数据）');
    } else {
      console.log('[DataSourceManager] 📦 已启用时间戳缓存，重启后将从上次位置继续');
    }
    this.datasourceConfig = config.datasourceConfig;
  }

  /**
   * 初始化 - 获取所有可用实体
   */
  async initialize() {
    try {
      console.log('[DataSourceManager] 初始化，获取实体列表...');
      this.entities = await this.subscriber.getEntities();
      console.log(`[DataSourceManager] 找到 ${this.entities.length} 个实体`);
      return this.entities;
    } catch (error) {
      console.error('[DataSourceManager] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 开始订阅所有实体
   */
  async startAllSubscriptions(onDataCallback: (record: DataRecord, entity: EntityInfo) => void) {
    console.log('[DataSourceManager] 开始订阅所有实体...');

    // 使用配置的订阅间隔，如果没有配置则使用默认值
    const baseInterval = this.datasourceConfig?.subscriptionInterval || 180000; // 默认3分钟
    const startDelay = this.datasourceConfig?.subscriptionStartDelay || 5000; // 默认5秒
    
    console.log(`[DataSourceManager] 订阅配置: 基础间隔=${baseInterval}ms, 启动延迟=${startDelay}ms`);
    
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      
      // 为每个实体添加延迟，避免同时发起请求
      const initialDelay = i * startDelay;
      
      setTimeout(() => {
        const subscription = this.subscriber.subscribe(entity.entityId, {
          interval: baseInterval + (Math.random() * 120000), // 基础间隔 + 0-2分钟随机偏移
          limit: 40,
          onData: (records) => {
            const timestamp = new Date().toLocaleTimeString('zh-CN');
            console.log(`[${timestamp}] [DataSourceManager] ${entity.displayName} 收到 ${records.length} 条新记录`);
            
            // 调用回调处理每条记录
            for (const record of records) {
              onDataCallback(record, entity);
            }
          },
          onError: (error) => {
            // 处理速率限制错误
            if (error.message?.includes('Too many requests')) {
              const timestamp = new Date().toLocaleTimeString('zh-CN');
              console.warn(`[${timestamp}] [DataSourceManager] ${entity.displayName} 触发速率限制，将在下次轮询时重试`);
            } else {
              const timestamp = new Date().toLocaleTimeString('zh-CN');
              console.error(`[${timestamp}] [DataSourceManager] ${entity.displayName} 订阅错误:`, error.message);
            }
          },
          onStatusChange: (connected) => {
            const timestamp = new Date().toLocaleTimeString('zh-CN');
            console.log(`[${timestamp}] [DataSourceManager] ${entity.displayName} 连接状态: ${connected ? '已连接' : '已断开'}`);
          }
        });

        this.subscriptions.set(entity.entityId, subscription);
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        console.log(`[${timestamp}] [DataSourceManager] 启动订阅 ${i + 1}/${this.entities.length}: ${entity.displayName}`);
      }, initialDelay);
    }

    // 等待所有订阅启动完成
    await new Promise(resolve => setTimeout(resolve, this.entities.length * startDelay + 1000));
    console.log(`[DataSourceManager] 已启动 ${this.subscriptions.size} 个订阅`);
  }

  /**
   * 启动单个实体的订阅（使用持久化订阅器）
   */
  startSubscription(entityId: string, callback: RecordCallback) {
    const entity = this.entities.find(e => e.entityId === entityId);
    if (!entity) {
      console.error(`[DataSourceManager] 实体 ${entityId} 不存在`);
      return;
    }

    if (this.subscriptions.has(entityId)) {
      console.warn(`[DataSourceManager] 实体 ${entity.displayName} 已经在订阅中`);
      return;
    }

    // 使用持久化订阅器（persistence功能已内置在subscribe方法中）
    const subscription = this.subscriber.subscribe(entityId, {
      interval: 180000, // 3分钟间隔
      limit: 40,
      onData: (records: DataRecord[]) => {
        // 调用回调处理每条记录
        for (const record of records) {
          callback(record, entity);
        }
      },
      onError: (error) => {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        if (error.message?.includes('Too many requests')) {
          console.warn(`[${timestamp}] [DataSourceManager] ${entity.displayName} 触发速率限制，将在下次轮询时重试`);
        } else {
          console.error(`[${timestamp}] [DataSourceManager] ${entity.displayName} 订阅错误:`, error.message);
        }
      },
      onStatusChange: (connected) => {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        console.log(`[${timestamp}] [DataSourceManager] ${entity.displayName} 连接状态: ${connected ? '已连接' : '已断开'}`);
      }
    });

    this.subscriptions.set(entityId, subscription);
    console.log(`[DataSourceManager] 已启动持久化订阅: ${entity.displayName}`);
  }

  /**
   * 停止所有订阅
   */
  stopAllSubscriptions() {
    for (const subscription of this.subscriptions.values()) {
      subscription.stop();
    }
    this.subscriptions.clear();
    console.log('[DataSourceManager] 所有订阅已停止');
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      totalEntities: this.entities.length,
      activeSubscriptions: this.subscriptions.size,
      entities: this.entities.map(e => ({
        id: e.entityId,
        name: e.displayName,
        type: e.dataType,
        count: e.count,
      })),
    };
  }

  /**
   * 获取实体信息
   */
  getEntity(entityId: string) {
    return this.entities.find(e => e.entityId === entityId);
  }

  /**
   * 获取所有可用实体
   */
  getAvailableEntities(): EntityInfo[] {
    return this.entities;
  }
}