import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const ConfigSchema = z.object({
  agent: z.object({
    name: z.string().default('jilive-agent'),
    description: z.string().default('Live streaming agent with danmaku processing'),
    apiMode: z.object({
      enabled: z.boolean().default(true),
      port: z.number().default(8012),
      host: z.string().default('localhost'),
      enableCors: z.boolean().default(true),
      apiPrefix: z.string().default('/api')
    })
  }),
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
    keyPrefix: z.string().default('jilive:')
  }),
  danmaku: z.object({
    batchInterval: z.number().default(5000), // Process danmaku every 5 seconds
    maxBatchSize: z.number().default(100),   // Max danmakus per batch
    platforms: z.array(z.string()).default(['bilibili', 'douyu', 'huya']),
    batchProcessInterval: z.number().default(20000), // AI batch processing interval (20 seconds)
    maxAIBatchSize: z.number().default(20) // Max danmakus for AI processing
  }),
  actions: z.object({
    defaultPriority: z.enum(['low', 'normal', 'high']).default('normal'),
    executionTimeout: z.number().default(30000), // 30 seconds
    retryAttempts: z.number().default(3)
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    verbose: z.boolean().default(false)
  }),
  ai: z.object({
    defaults: z.object({
      maxTokens: z.number().default(500),
      temperature: z.number().default(0.7)
    }),
    personality: z.string().default('你是一个可爱的AI虚拟主播助手。'),
    scenarios: z.object({
      chat: z.object({
        provider: z.literal('google'),
        model: z.enum(['small', 'medium', 'large']).default('medium'),
        temperature: z.number().default(0.8)
      }),
      compress: z.object({
        provider: z.literal('google'),
        model: z.enum(['small', 'medium', 'large']).default('small'),
        temperature: z.number().default(0.2)
      }),
      judge: z.object({
        provider: z.literal('google'),
        model: z.enum(['small', 'medium', 'large']).default('medium'),
        temperature: z.number().default(0.1)
      }),
      analysis: z.object({
        provider: z.literal('google'),
        model: z.enum(['small', 'medium', 'large']).default('medium'),
        temperature: z.number().default(0.3)
      }),
      choice: z.object({
        provider: z.literal('google'),
        model: z.enum(['small', 'medium', 'large']).default('medium'),
        temperature: z.number().default(0.2)
      })
    }),
    compression: z.object({
      skipCompressionThreshold: z.number().default(10000),
      chunkSize: z.number().default(8000),
      targetLength: z.number().default(4000),
      errorThreshold: z.number().default(50000)
    })
  })
});

type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const rawConfig = {
    agent: {
      name: 'jilive-agent',
      description: 'Live streaming agent with danmaku processing',
      apiMode: {
        enabled: true,
        port: 8012,
        host: 'localhost',
        enableCors: true,
        apiPrefix: '/api'
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      keyPrefix: 'jilive:'
    },
    danmaku: {
      batchInterval: 5000,
      maxBatchSize: 100,
      platforms: ['bilibili', 'douyu', 'huya'],
      batchProcessInterval: 10000, // AI 批处理间隔 10秒
      maxAIBatchSize: 20
    },
    actions: {
      defaultPriority: 'normal' as const,
      executionTimeout: 30000,
      retryAttempts: 3
    },
    logging: {
      level: 'info' as const,
      verbose: process.env.JILIVE_VERBOSE === 'true' // 调试标志可以保留
    },
    ai: {
      defaults: {
        maxTokens: 500,
        temperature: 0.7
      },
      personality: '你是一个可爱的AI虚拟主播助手。说话风格要亲切、有趣、偶尔调皮。可以使用颜文字和表情符号。用对话的语气对弹幕和观众进行回复。',
      scenarios: {
        chat: {
          provider: 'google' as const,
          model: 'medium' as const,
          temperature: 0.8
        },
        compress: {
          provider: 'google' as const,
          model: 'small' as const,
          temperature: 0.2
        },
        judge: {
          provider: 'google' as const,
          model: 'medium' as const,
          temperature: 0.1
        },
        analysis: {
          provider: 'google' as const,
          model: 'medium' as const,
          temperature: 0.3
        },
        choice: {
          provider: 'google' as const,
          model: 'medium' as const,
          temperature: 0.2
        }
      },
      compression: {
        skipCompressionThreshold: 10000,
        chunkSize: 8000,
        targetLength: 4000,
        errorThreshold: 50000
      }
    }
  };

  return ConfigSchema.parse(rawConfig);
}

export const config = loadConfig();

export function getRedisConfig() {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    keyPrefix: config.redis.keyPrefix
  };
}