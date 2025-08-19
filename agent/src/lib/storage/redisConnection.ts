import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

// 全局 Redis 管理器
class RedisManager {
  private client: Redis | InstanceType<typeof RedisMock> | null = null;
  private isUsingMock = false;
  private initialized = false;
  private preferredRedisUrl: string | null = null;

  /**
   * 设置首选的 Redis URL（通常从环境变量或配置文件读取）
   */
  setPreferredRedisUrl(redisUrl: string | undefined) {
    if (redisUrl && !this.preferredRedisUrl) {
      this.preferredRedisUrl = redisUrl;
      console.log(`[RedisManager] 设置首选 Redis URL: ${redisUrl}`);
    }
  }

  /**
   * 获取或创建 Redis 客户端
   */
  async getClient(requestedRedisUrl?: string): Promise<{ client: Redis | InstanceType<typeof RedisMock>, isUsingMock: boolean }> {
    // 如果已经初始化，直接返回
    if (this.initialized && this.client) {
      return { client: this.client, isUsingMock: this.isUsingMock };
    }

    // 确定要使用的 Redis URL：请求的 > 首选的 > undefined
    const redisUrl = requestedRedisUrl || this.preferredRedisUrl;
    
    console.log(`[RedisManager] 初始化 Redis 连接，URL: ${redisUrl || '未设置'}`);

    if (redisUrl) {
      try {
        console.log(`[RedisManager] 尝试连接到 Redis: ${redisUrl}`);
        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },
          connectTimeout: 5000,
        });

        // 测试连接
        await client.ping();
        
        this.client = client;
        this.isUsingMock = false;
        this.initialized = true;
        console.log(`[RedisManager] ✅ 成功连接到真实 Redis`);
        
        return { client: this.client, isUsingMock: this.isUsingMock };
      } catch (error) {
        console.log(`[RedisManager] ❌ Redis 连接失败:`, error);
        console.log(`[RedisManager] 回退到 Mock Redis`);
      }
    } else {
      console.log(`[RedisManager] 无 Redis URL，使用 Mock Redis`);
    }

    // 回退到 Mock
    this.client = new RedisMock();
    this.isUsingMock = true;
    this.initialized = true;
    console.log(`[RedisManager] ✅ 使用 Mock Redis 进行存储`);
    
    return { client: this.client, isUsingMock: this.isUsingMock };
  }

  /**
   * 重置连接（用于测试或重新配置）
   */
  async reset() {
    if (this.client && !this.isUsingMock) {
      await (this.client as Redis).quit();
    }
    this.client = null;
    this.initialized = false;
    this.isUsingMock = false;
    console.log(`[RedisManager] Redis 连接已重置`);
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return {
      initialized: this.initialized,
      isUsingMock: this.isUsingMock,
      preferredRedisUrl: this.preferredRedisUrl,
      hasClient: !!this.client
    };
  }
}

// 创建全局单例
const redisManager = new RedisManager();

// 兼容的导出函数
export async function getRedisClient(redisUrl?: string): Promise<{ client: Redis | InstanceType<typeof RedisMock>, isUsingMock: boolean }> {
  return redisManager.getClient(redisUrl);
}

// 新的管理函数
export function setPreferredRedisUrl(redisUrl: string | undefined) {
  redisManager.setPreferredRedisUrl(redisUrl);
}

export async function resetRedisConnection() {
  await redisManager.reset();
}

export function getRedisStatus() {
  return redisManager.getStatus();
}

// 导出获取 Mock Redis 客户端的函数
export function getMockRedisClient(): InstanceType<typeof RedisMock> {
  console.log(`[RedisManager] 创建独立的 Mock Redis 客户端`);
  return new RedisMock();
}