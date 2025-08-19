import { createVectorStore, type SimpleVectorStore } from './vectorStore';

/**
 * 全局向量存储实例
 */
let globalVectorStore: SimpleVectorStore | null = null;

/**
 * 向量存储配置
 */
interface VectorStoreConnectionConfig {
  redisUrl?: string;
  keyPrefix?: string;
  defaultDimensions?: number;
}

/**
 * 获取全局向量存储实例
 * 类似于 Redis 连接的管理方式
 */
export function getVectorStore(config?: VectorStoreConnectionConfig): SimpleVectorStore {
  if (!globalVectorStore) {
    console.log('[VectorStore] 初始化全局向量存储实例');
    globalVectorStore = createVectorStore({
      redisUrl: config?.redisUrl,
      keyPrefix: config?.keyPrefix || 'jirai_vector',
      defaultDimensions: config?.defaultDimensions || 1536
    });
  }
  return globalVectorStore;
}

/**
 * 设置首选的向量存储配置
 */
export function setVectorStoreConfig(config: VectorStoreConnectionConfig): void {
  // 如果已经有实例，不重新创建，保持兼容性
  if (!globalVectorStore) {
    getVectorStore(config);
  }
}

/**
 * 重置向量存储实例（主要用于测试）
 */
export function resetVectorStore(): void {
  globalVectorStore = null;
}