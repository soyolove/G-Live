import { Agent } from '@alice/wond-v3';
import { 
  createDanmakuPump,
  createDanmakuBatchIterator,
  createActionReactor,
  createActionPushConsumer
} from './controllers/index.js';
import { config, getRedisConfig } from './config/index.js';
import chalk from 'chalk';
import express from 'express';
import { createDanmakuRouter } from './danmaku/api.js';

async function main(): Promise<{ agent: Agent; danmakuPump: any; customApp: express.Application }> {
  console.log(chalk.bold.blue('\n🎮 Starting JiLive Agent...\n'));

  // Create agent
  const agent = new Agent({
    name: config.agent.name,
    apiMode: config.agent.apiMode.enabled ? {
      port: config.agent.apiMode.port,
      host: config.agent.apiMode.host,
      enableCors: config.agent.apiMode.enableCors,
      apiPrefix: config.agent.apiMode.apiPrefix
    } : undefined,
    eventPoolOptions: {
      redisUrl: `redis://${config.redis.host}:${config.redis.port}/${config.redis.db}`,
      agentId: 'jilive',
      enablePersistence: true,
      persistInterval: 5 * 60 * 1000, // 5 minutes
    }
  });

  // Create controllers
  const danmakuPump = createDanmakuPump();
  const batchIterator = createDanmakuBatchIterator();
  const actionReactor = createActionReactor();
  const actionPushConsumer = createActionPushConsumer();

  // Add controllers to agent
  agent.addController(danmakuPump.controller);
  agent.addController(batchIterator);
  agent.addController(actionReactor);
  agent.addController(actionPushConsumer.controller);

  // Create a separate Express server for custom routes
  const customApp = express();
  customApp.use(express.json());
  
  // Add danmaku routes
  const danmakuRouter = createDanmakuRouter(danmakuPump);
  customApp.use('/api', danmakuRouter);
  
  // Start custom API server
  const customPort = config.agent.apiMode.port + 1; // Use next port
  customApp.listen(customPort, config.agent.apiMode.host, () => {
    console.log(chalk.cyan(`📡 Custom API available at: http://${config.agent.apiMode.host}:${customPort}/api`));
  });
  
  console.log(chalk.green('\n✅ JiLive Agent started successfully!'));
  console.log(chalk.cyan(`📡 Agent API available at: http://${config.agent.apiMode.host}:${config.agent.apiMode.port}${config.agent.apiMode.apiPrefix}`));
  console.log(chalk.yellow('\n📝 Available endpoints:'));
  console.log(chalk.gray('  Agent API:'));
  console.log(chalk.gray('  - GET  /api/overview           - Agent overview'));
  console.log(chalk.gray('  - GET  /api/controllers        - List all controllers'));
  console.log(chalk.gray('  - GET  /api/influence-paths    - Analyze influence paths'));
  console.log(chalk.gray('  Custom API:'));
  console.log(chalk.gray(`  - POST http://localhost:${customPort}/api/danmaku      - Submit danmaku`));
  console.log(chalk.gray(`  - POST http://localhost:${customPort}/api/danmaku/batch - Submit danmaku batch`));

  // Example: Simulate danmaku input (for testing)
  if (config.logging.verbose) {
    console.log(chalk.magenta('\n🧪 Running in verbose mode - simulating test danmaku...'));
    
    setTimeout(() => {
      danmakuPump.emitDanmaku({
        id: 'test-1',
        userId: 'user-1',
        username: 'TestUser',
        content: '说: Hello JiLive!',
        platform: 'test',
        roomId: 'test-room'
      });
    }, 2000);

    setTimeout(() => {
      danmakuPump.emitMultipleDanmakus([
        {
          id: 'test-2',
          userId: 'user-2',
          username: 'User2',
          content: '开心 😊',
          platform: 'test',
          roomId: 'test-room'
        },
        {
          id: 'test-3',
          userId: 'user-3',
          username: 'User3',
          content: '跳舞',
          platform: 'test',
          roomId: 'test-room'
        },
        {
          id: 'test-4',
          userId: 'user-4',
          username: 'User4',
          content: 'Amazing!',
          platform: 'test',
          roomId: 'test-room'
        },
        {
          id: 'test-5',
          userId: 'user-5',
          username: 'User5',
          content: 'Amazing!',
          platform: 'test',
          roomId: 'test-room'
        },
        {
          id: 'test-6',
          userId: 'user-6',
          username: 'User6',
          content: 'Amazing!',
          platform: 'test',
          roomId: 'test-room'
        },
        {
          id: 'test-7',
          userId: 'user-7',
          username: 'User7',
          content: 'Amazing!',
          platform: 'test',
          roomId: 'test-room'
        },
        {
          id: 'test-8',
          userId: 'user-8',
          username: 'User8',
          content: 'Amazing!',
          platform: 'test',
          roomId: 'test-room'
        }
      ]);
    }, 4000);
  }

  // Export for external use
  return { agent, danmakuPump, customApp };
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n🛑 Shutting down JiLive Agent...'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n\n🛑 Shutting down JiLive Agent...'));
  process.exit(0);
});

// Run the agent
main().catch((error) => {
  console.error(chalk.red('❌ Failed to start JiLive Agent:'), error);
  process.exit(1);
});

export { main };