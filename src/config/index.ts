import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const ConfigSchema = z.object({
  agent: z.object({
    name: z.string().default('jilive-agent'),
    description: z.string().default('Live streaming agent with danmaku processing'),
    apiMode: z.object({
      enabled: z.boolean().default(true),
      port: z.number().default(3002),
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
    platforms: z.array(z.string()).default(['bilibili', 'douyu', 'huya'])
  }),
  actions: z.object({
    defaultPriority: z.enum(['low', 'normal', 'high']).default('normal'),
    executionTimeout: z.number().default(30000), // 30 seconds
    retryAttempts: z.number().default(3)
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    verbose: z.boolean().default(false)
  })
});

type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const rawConfig = {
    agent: {
      name: process.env.JILIVE_AGENT_NAME || 'jilive-agent',
      description: process.env.JILIVE_AGENT_DESCRIPTION || 'Live streaming agent with danmaku processing',
      apiMode: {
        enabled: process.env.JILIVE_API_ENABLED !== 'false',
        port: parseInt(process.env.JILIVE_API_PORT || '3002'),
        host: process.env.JILIVE_API_HOST || 'localhost',
        enableCors: process.env.JILIVE_API_CORS !== 'false',
        apiPrefix: process.env.JILIVE_API_PREFIX || '/api'
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.JILIVE_REDIS_PREFIX || 'jilive:'
    },
    danmaku: {
      batchInterval: parseInt(process.env.JILIVE_BATCH_INTERVAL || '5000'),
      maxBatchSize: parseInt(process.env.JILIVE_MAX_BATCH_SIZE || '100'),
      platforms: process.env.JILIVE_PLATFORMS?.split(',') || ['bilibili', 'douyu', 'huya']
    },
    actions: {
      defaultPriority: (process.env.JILIVE_DEFAULT_PRIORITY || 'normal') as any,
      executionTimeout: parseInt(process.env.JILIVE_EXECUTION_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.JILIVE_RETRY_ATTEMPTS || '3')
    },
    logging: {
      level: (process.env.JILIVE_LOG_LEVEL || 'info') as any,
      verbose: process.env.JILIVE_VERBOSE === 'true'
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