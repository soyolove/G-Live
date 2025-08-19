import { Agent } from '@alice/wond-v3';
import { 
  createDanmakuPump,
  createActionPushConsumer,
  createSubtitlePushConsumer,
  createDanmakuAIReactor,
  createInvestmentCommentaryReactor
} from './live/controllers/index';
import { addInvestmentIntegration } from './investment/integration';
import { config, getRedisConfig } from './config/index';
import chalk from 'chalk';
import express from 'express';
import { createDanmakuRouter } from './live/danmaku/api';
import { MOTION_LIBRARY, getMotionById } from './live/actions/motionLibrary';
import {investmentConfig } from './config/investment.config';

async function main(): Promise<{ agent: Agent; danmakuPump: ReturnType<typeof createDanmakuPump>; subtitlePushConsumer: ReturnType<typeof createSubtitlePushConsumer>; customApp: express.Application }> {
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
  const danmakuAIReactor = createDanmakuAIReactor();
  const actionPushConsumer = createActionPushConsumer();
  const subtitlePushConsumer = createSubtitlePushConsumer();
  const investmentCommentaryReactor = createInvestmentCommentaryReactor();

  // Add controllers to agent
  agent.addController(danmakuPump.controller);
  agent.addController(danmakuAIReactor);
  agent.addController(actionPushConsumer.controller);
  agent.addController(subtitlePushConsumer.controller);
  agent.addController(investmentCommentaryReactor);
  

  
  const investmentIntegration = await addInvestmentIntegration(agent, {
    baseUrl: process.env.DATASOURCE_BASE_URL || 'https://djirai.onrender.com',
    apiKey: process.env.DATASOURCE_API_KEY,
    debug: config.logging.verbose,
    redisUrl: `redis://${config.redis.host}:${config.redis.port}/${config.redis.db}`,
    investmentConfig:investmentConfig,
    enableTracking: true,
  });
  
  // Start investment data subscriptions
  await investmentIntegration.startDataSourceSubscriptions();

  // Create a separate Express server for custom routes
  const customApp = express();
  
  // Enable CORS for all origins (for testing)
  customApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });
  
  customApp.use(express.json());
  
  // Add danmaku routes
  const danmakuRouter = createDanmakuRouter(danmakuPump);
  customApp.use('/api', danmakuRouter);
  
  // Get motion library
  customApp.get('/api/motion/library', async (req: express.Request, res: express.Response) => {
    try {
      res.json({ 
        success: true, 
        data: MOTION_LIBRARY,
        count: MOTION_LIBRARY.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get motion library'
      });
    }
  });
  
  // Get specific motion by ID
  customApp.get('/api/motion/:id', async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const motion = getMotionById(id as any);
      
      if (!motion) {
        res.status(404).json({ 
          success: false, 
          error: `Motion with ID '${id}' not found` 
        });
        return;
      }
      
      res.json({ 
        success: true, 
        data: motion
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get motion'
      });
    }
  });
  
  // Add motion control endpoints
  customApp.post('/api/motion/look', async (req: express.Request, res: express.Response) => {
    try {
      const { x, y, instant } = req.body;
      
      // 转发到 vtuber-backend
      const response = await fetch('http://localhost:8011/api/control/look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, instant })
      });
      
      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.statusText}`);
      }
      
      res.json({ 
        success: true, 
        message: 'Motion command sent',
        data: { x, y, instant }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send motion'
      });
    }
  });
  
  customApp.post('/api/motion/reset', async (req: express.Request, res: express.Response) => {
    try {
      // 转发到 vtuber-backend
      const response = await fetch('http://localhost:8011/api/control/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.statusText}`);
      }
      
      res.json({ 
        success: true, 
        message: 'Reset command sent'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset'
      });
    }
  });
  
  // Add subtitle test endpoint
  customApp.post('/api/subtitle/test', async (req: express.Request, res: express.Response) => {
    try {
      const { text, type = 'response', duration } = req.body;
      
      if (!text) {
        res.status(400).json({ success: false, error: 'Text is required' });
        return;
      }
      
      // 直接调用后端API发送字幕
      await subtitlePushConsumer.sendSubtitleToBackend({ text, type, duration });
      
      res.json({ 
        success: true, 
        message: 'Subtitle sent successfully',
        data: { text, type, duration }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send subtitle'
      });
    }
  });
  
  // Start custom API server
  const customPort = 8013; // Fixed port for custom API
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
  console.log(chalk.gray(`  - POST http://localhost:${customPort}/api/subtitle/test - Test subtitle push`));


  // Export for external use
  return { agent, danmakuPump, subtitlePushConsumer, customApp };
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