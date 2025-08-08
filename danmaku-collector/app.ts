import express from 'express';
import cors from 'cors';
import { TwitchChatService } from './TwitchChatService';

const app = express();
const PORT = process.env.PORT || 8015;

// 频道服务管理器
const channelServices = new Map<string, TwitchChatService>();

// 中间件
app.use(cors());
app.use(express.json());

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 获取或创建频道服务
function getChannelService(channel: string): TwitchChatService {
  if (!channelServices.has(channel)) {
    channelServices.set(channel, new TwitchChatService());
  }
  return channelServices.get(channel)!;
}

// API 路由

// 获取频道历史消息
app.get('/api/channels/:channel/messages', (req, res) => {
  const { channel } = req.params;
  const service = getChannelService(channel);
  
  res.json({
    channel,
    status: service.getConnectionStatus(),
    messages: service.getMessages(),
    error: service.getError()
  });
});

// SSE 实时消息流
app.get('/api/channels/:channel/stream', (req, res) => {
  const { channel } = req.params;
  
  // 设置 SSE 头部
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const service = getChannelService(channel);
  service.addSSEClient(res);

  // 客户端断开连接时清理
  req.on('close', () => {
    service.removeSSEClient(res);
  });
});

// 连接频道
app.post('/api/channels/:channel/connect', async (req, res) => {
  const { channel } = req.params;
  
  try {
    const service = getChannelService(channel);
    await service.connect(channel);
    
    res.json({
      success: true,
      channel,
      status: service.getConnectionStatus()
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 断开频道连接
app.delete('/api/channels/:channel/disconnect', (req, res) => {
  const { channel } = req.params;
  
  const service = channelServices.get(channel);
  if (service) {
    service.disconnect();
    channelServices.delete(channel);
  }
  
  res.json({
    success: true,
    channel,
    status: 'disconnected'
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取所有活跃频道
app.get('/api/channels', (req, res) => {
  const channels = Array.from(channelServices.entries()).map(([channel, service]) => ({
    channel,
    status: service.getConnectionStatus(),
    messageCount: service.getMessages().length
  }));
  
  res.json({ channels });
});

app.listen(PORT, () => {
  console.log(`🚀 Twitch Chat API Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API docs: http://localhost:${PORT}/api/channels`);
});