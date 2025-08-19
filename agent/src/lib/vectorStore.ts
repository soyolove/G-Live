import { getRedisClient } from './storage/redisConnection';
import { cosineSimilarity } from 'ai';
import type { Redis } from 'ioredis';

/**
 * 分区类型定义
 */
export type PartitionType = 'info' | 'strategy' | `memory-${string}`;

/**
 * 向量存储条目接口
 */
export interface VectorStoreEntry {
  id: string;
  type: 'info' | 'strategy' | 'memory';
  embedding: number[];
  dimensions: number;
  content: string;
  metadata?: Record<string, any>;
  timestamp: number;
  updatedAt: number; // 更新时间戳
}

/**
 * 相似度搜索结果
 */
export interface SimilarityResult {
  entry: VectorStoreEntry;
  similarity: number;
}

/**
 * 向量存储配置
 */
export interface VectorStoreConfig {
  redisUrl?: string;
  keyPrefix?: string;
  defaultDimensions?: number;
}

/**
 * 简单的基于 Redis 的向量存储实现
 * 
 * 存储结构：
 * - vector:{partition}:{id} -> JSON 序列化的 VectorStoreEntry
 * - vector:{partition}:ids -> Set 存储所有 ID
 * - vector:{partition}:metadata -> Hash 存储分区元数据
 */
export class SimpleVectorStore {
  private redis: Redis | null = null;
  private keyPrefix: string;
  private defaultDimensions: number;
  private redisUrl?: string;

  constructor(config: VectorStoreConfig = {}) {
    this.keyPrefix = config.keyPrefix || 'vector';
    this.defaultDimensions = config.defaultDimensions || 1536;
    this.redisUrl = config.redisUrl;
  }

  /**
   * 验证分区名称是否有效
   */
  private validatePartition(partition: string): void {
    const validPartitions = /^(info|strategy|memory-.+)$/;
    if (!validPartitions.test(partition)) {
      throw new Error(`Invalid partition: ${partition}. Must be 'info', 'strategy', or 'memory-{userId}'`);
    }
  }

  /**
   * 初始化 Redis 连接
   */
  private async ensureRedisConnection(): Promise<void> {
    if (!this.redis) {
      const { client } = await getRedisClient(this.redisUrl);
      this.redis = client;
    }
  }

  /**
   * 生成 Redis key
   */
  private getKey(partition: string, id?: string): string {
    if (id) {
      return `${this.keyPrefix}:${partition}:${id}`;
    }
    return `${this.keyPrefix}:${partition}`;
  }

  /**
   * 保存向量条目
   */
  async save(partition: PartitionType, entry: VectorStoreEntry): Promise<void> {
    this.validatePartition(partition);
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const key = this.getKey(partition, entry.id);
    const idsKey = `${this.getKey(partition)}:ids`;
    const metadataKey = `${this.getKey(partition)}:metadata`;

    // 自动设置正确的 type
    if (partition.startsWith('memory-')) {
      entry.type = 'memory';
    } else {
      entry.type = partition as 'info' | 'strategy';
    }

    // 确保设置 updatedAt
    if (!entry.updatedAt) {
      entry.updatedAt = entry.timestamp;
    }

    // 保存条目数据
    await this.redis.set(key, JSON.stringify(entry));
    
    // 添加到 ID 集合
    await this.redis.sadd(idsKey, entry.id);
    
    // 更新分区元数据
    await this.redis.hset(metadataKey, {
      lastUpdate: Date.now(),
      type: partition,
      dimensions: entry.dimensions
    });

    console.log(`[VectorStore] 保存向量条目 ${entry.id} 到分区 ${partition}`);
  }

  /**
   * 更新向量条目
   */
  async update(partition: PartitionType, id: string, updates: Partial<VectorStoreEntry>): Promise<boolean> {
    this.validatePartition(partition);
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const key = this.getKey(partition, id);
    const existing = await this.get(partition, id);
    
    if (!existing) {
      console.warn(`[VectorStore] 无法更新不存在的条目 ${id} 在分区 ${partition}`);
      return false;
    }

    // 合并更新
    const updated: VectorStoreEntry = {
      ...existing,
      ...updates,
      id: existing.id, // ID 不能更改
      timestamp: existing.timestamp, // 创建时间不能更改
      updatedAt: Date.now()
    };

    // 自动设置正确的 type
    if (partition.startsWith('memory-')) {
      updated.type = 'memory';
    } else {
      updated.type = partition as 'info' | 'strategy';
    }

    // 保存更新后的条目
    await this.redis.set(key, JSON.stringify(updated));

    // 更新分区元数据
    const metadataKey = `${this.getKey(partition)}:metadata`;
    await this.redis.hset(metadataKey, 'lastUpdate', Date.now());

    console.log(`[VectorStore] 更新向量条目 ${id} 在分区 ${partition}`);
    return true;
  }

  /**
   * 批量保存向量条目
   */
  async saveBatch(partition: PartitionType, entries: VectorStoreEntry[]): Promise<void> {
    this.validatePartition(partition);
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const pipeline = this.redis.pipeline();
    const idsKey = `${this.getKey(partition)}:ids`;
    const metadataKey = `${this.getKey(partition)}:metadata`;

    // 批量保存条目
    for (const entry of entries) {
      // 自动设置正确的 type
      if (partition.startsWith('memory-')) {
        entry.type = 'memory';
      } else {
        entry.type = partition as 'info' | 'strategy';
      }

      // 确保设置 updatedAt
      if (!entry.updatedAt) {
        entry.updatedAt = entry.timestamp;
      }

      const key = this.getKey(partition, entry.id);
      pipeline.set(key, JSON.stringify(entry));
      pipeline.sadd(idsKey, entry.id);
    }

    // 更新分区元数据
    pipeline.hset(metadataKey, {
      lastUpdate: Date.now(),
      type: partition,
      dimensions: entries[0]?.dimensions || this.defaultDimensions
    });

    await pipeline.exec();
    console.log(`[VectorStore] 批量保存 ${entries.length} 个向量条目到分区 ${partition}`);
  }

  /**
   * 根据 ID 获取向量条目
   */
  async get(partition: PartitionType, id: string): Promise<VectorStoreEntry | null> {
    this.validatePartition(partition);
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const key = this.getKey(partition, id);
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as VectorStoreEntry;
    } catch (error) {
      console.error(`[VectorStore] 解析向量条目失败 ${id}:`, error);
      return null;
    }
  }

  /**
   * 获取分区中的所有向量条目
   */
  async getAll(partition: PartitionType): Promise<VectorStoreEntry[]> {
    this.validatePartition(partition);
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const idsKey = `${this.getKey(partition)}:ids`;
    const ids = await this.redis.smembers(idsKey);
    
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const id of ids) {
      const key = this.getKey(partition, id);
      pipeline.get(key);
    }

    const results = await pipeline.exec();
    const entries: VectorStoreEntry[] = [];

    for (const result of results || []) {
      if (result && result[1]) {
        try {
          const entry = JSON.parse(result[1] as string) as VectorStoreEntry;
          entries.push(entry);
        } catch (error) {
          console.error('[VectorStore] 解析向量条目失败:', error);
        }
      }
    }

    return entries;
  }

  /**
   * 根据向量相似度搜索
   */
  async search(
    partition: PartitionType, 
    queryEmbedding: number[], 
    options: {
      limit?: number;
      threshold?: number;
      type?: 'info' | 'strategy' | 'memory';
    } = {}
  ): Promise<SimilarityResult[]> {
    this.validatePartition(partition);
    const { limit = 10, threshold = 0.0, type } = options;
    
    // 获取所有向量条目
    const allEntries = await this.getAll(partition);
    
    // 过滤类型
    const filteredEntries = type ? allEntries.filter(entry => entry.type === type) : allEntries;
    
    // 计算相似度
    const similarities: SimilarityResult[] = [];
    
    for (const entry of filteredEntries) {
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      
      if (similarity >= threshold) {
        similarities.push({
          entry,
          similarity
        });
      }
    }

    // 按相似度排序并限制结果数量
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * 删除向量条目
   */
  async delete(partition: PartitionType, id: string): Promise<boolean> {
    this.validatePartition(partition);
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const key = this.getKey(partition, id);
    const idsKey = `${this.getKey(partition)}:ids`;

    const pipeline = this.redis.pipeline();
    pipeline.del(key);
    pipeline.srem(idsKey, id);

    const results = await pipeline.exec();
    const deleted = results?.[0]?.[1] === 1;

    if (deleted) {
      console.log(`[VectorStore] 删除向量条目 ${id} 从分区 ${partition}`);
    }

    return deleted;
  }

  /**
   * 清空分区
   */
  async clearPartition(partition: PartitionType): Promise<void> {
    this.validatePartition(partition);
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const idsKey = `${this.getKey(partition)}:ids`;
    const metadataKey = `${this.getKey(partition)}:metadata`;
    const ids = await this.redis.smembers(idsKey);

    if (ids.length > 0) {
      const pipeline = this.redis.pipeline();
      
      // 删除所有条目
      for (const id of ids) {
        const key = this.getKey(partition, id);
        pipeline.del(key);
      }
      
      // 删除索引和元数据
      pipeline.del(idsKey);
      pipeline.del(metadataKey);

      await pipeline.exec();
    }

    console.log(`[VectorStore] 清空分区 ${partition}，删除 ${ids.length} 个条目`);
  }

  /**
   * 获取分区统计信息
   */
  async getPartitionStats(partition: PartitionType): Promise<{
    count: number;
    lastUpdate: number | null;
    dimensions: number | null;
  }> {
    this.validatePartition(partition);
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const idsKey = `${this.getKey(partition)}:ids`;
    const metadataKey = `${this.getKey(partition)}:metadata`;

    const count = await this.redis.scard(idsKey);
    const metadata = await this.redis.hgetall(metadataKey);

    return {
      count,
      lastUpdate: metadata.lastUpdate ? parseInt(metadata.lastUpdate) : null,
      dimensions: metadata.dimensions ? parseInt(metadata.dimensions) : null
    };
  }

  /**
   * 列出所有分区
   */
  async listPartitions(): Promise<string[]> {
    await this.ensureRedisConnection();
    if (!this.redis) throw new Error('Redis connection not available');

    const pattern = `${this.keyPrefix}:*:metadata`;
    const keys = await this.redis.keys(pattern);
    
    return keys.map(key => {
      const parts = key.split(':');
      return parts[1]; // 提取分区名
    });
  }

  /**
   * 去重功能 - 查找相似的条目
   */
  async findDuplicates(
    partition: PartitionType, 
    threshold: number = 0.95
  ): Promise<Array<{ original: VectorStoreEntry; duplicates: VectorStoreEntry[] }>> {
    this.validatePartition(partition);
    const allEntries = await this.getAll(partition);
    const duplicateGroups: Array<{ original: VectorStoreEntry; duplicates: VectorStoreEntry[] }> = [];

    for (let i = 0; i < allEntries.length; i++) {
      const original = allEntries[i];
      const duplicates: VectorStoreEntry[] = [];

      for (let j = i + 1; j < allEntries.length; j++) {
        const candidate = allEntries[j];
        const similarity = cosineSimilarity(original.embedding, candidate.embedding);

        if (similarity >= threshold) {
          duplicates.push(candidate);
        }
      }

      if (duplicates.length > 0) {
        duplicateGroups.push({ original, duplicates });
      }
    }

    return duplicateGroups;
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    // Redis 连接由 getRedisClient 管理，这里不需要手动关闭
    this.redis = null;
  }
}

/**
 * 创建向量存储实例
 */
export function createVectorStore(config: VectorStoreConfig = {}): SimpleVectorStore {
  return new SimpleVectorStore(config);
}