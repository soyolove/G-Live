import express, { Request, Response } from 'express';
import cors from 'cors';
import * as os from 'os';
import { ttsService } from './services/tts-service';

const app = express();
const PORT = parseInt(process.env.PORT || '8011', 10);

// Store active SSE connections with metadata
interface SSEClient {
  id: string;
  response: Response;
  ip: string;
  connectedAt: Date;
}

const clients = new Map<string, SSEClient>();

// Middleware
app.use(cors());
app.use(express.json());
// 提供静态文件访问（音频文件）
app.use('/audio', express.static('public/audio'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeClients: clients.size,
    uptime: process.uptime()
  });
});

// SSE endpoint
app.get('/sse', (req: Request, res: Response) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clientIP = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  
  console.log(`\n✅ [SSE] New client connected:`);
  console.log(`   ID: ${clientId}`);
  console.log(`   IP: ${clientIP}`);
  console.log(`   Time: ${new Date().toISOString()}`);
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial connection message
  const welcomeMessage = JSON.stringify({
    type: 'connected',
    message: 'Backend SSE connected successfully',
    clientId,
    timestamp: new Date().toISOString()
  });
  
  res.write(`data: ${welcomeMessage}\n\n`);
  res.flushHeaders(); // Flush headers to establish SSE connection
  
  // Create client object
  const client: SSEClient = {
    id: clientId,
    response: res,
    ip: clientIP,
    connectedAt: new Date()
  };
  
  // Add client to active connections
  clients.set(clientId, client);
  console.log(`   Total active clients: ${clients.size}`);
  
  // Keep-alive ping every 20 seconds
  const keepAlive = setInterval(() => {
    try {
      res.write(':ping\n\n');
    } catch (error) {
      console.error(`Failed to send ping to ${clientId}`);
      clearInterval(keepAlive);
    }
  }, 20000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(clientId);
    console.log(`\n❌ [SSE] Client disconnected:`);
    console.log(`   ID: ${clientId}`);
    console.log(`   Duration: ${Math.round((Date.now() - client.connectedAt.getTime()) / 1000)}s`);
    console.log(`   Remaining clients: ${clients.size}`);
  });
  
  req.on('error', (error) => {
    console.error(`[SSE] Client error (${clientId}):`, error.message);
  });
});

// Command interfaces
interface LookCommand {
  x: number;
  y: number;
  instant?: boolean;
}

interface ExpressionCommand {
  id: string | number;
}

interface MotionCommand {
  group: string;
  index: number;
  priority?: number;
}

interface TapCommand {
  x: number;
  y: number;
}

interface SubtitleCommand {
  text: string;
  type?: 'response' | 'reaction' | 'status';
  duration?: number; // 显示时长(毫秒)
  enableTTS?: boolean; // 是否生成语音
}

// Broadcast to all connected clients
function broadcast(command: any): void {
  const message = `data: ${JSON.stringify(command)}\n\n`;
  let successCount = 0;
  let failCount = 0;
  
  clients.forEach((client, clientId) => {
    try {
      client.response.write(message);
      successCount++;
    } catch (error) {
      console.error(`Failed to send to client ${clientId}:`, error);
      clients.delete(clientId);
      failCount++;
    }
  });
  
  console.log(`📡 Broadcast: ${command.type} to ${successCount} clients (${failCount} failed)`);
}

// API endpoints to control Live2D
app.post('/api/control/look', (req: Request<{}, {}, LookCommand>, res: Response) => {
  const { x, y, instant = false } = req.body;
  
  console.log(`🎯 Look command: x=${x}, y=${y}, instant=${instant}`);
  
  const command = {
    type: 'lookAt',
    data: { x, y, instant },
    timestamp: new Date().toISOString()
  };
  
  broadcast(command);
  res.json({ success: true, command, clients: clients.size });
});

app.post('/api/control/reset', (req: Request, res: Response) => {
  console.log('🔄 Reset focus command');
  
  const command = {
    type: 'resetFocus',
    data: {},
    timestamp: new Date().toISOString()
  };
  
  broadcast(command);
  res.json({ success: true, command, clients: clients.size });
});

// Head direction control endpoint (9 directions)
app.post('/api/control/head/:direction', (req: Request<{ direction: string }>, res: Response) => {
  const { direction } = req.params;
  
  // Map 9 directions to x,y coordinates
  const directionMap: Record<string, LookCommand> = {
    'top-left':     { x: -0.8, y:  0.8 },
    'top':          { x:  0.0, y:  0.8 },
    'top-right':    { x:  0.8, y:  0.8 },
    'left':         { x: -0.8, y:  0.0 },
    'center':       { x:  0.0, y:  0.0 },
    'right':        { x:  0.8, y:  0.0 },
    'bottom-left':  { x: -0.8, y: -0.8 },
    'bottom':       { x:  0.0, y: -0.8 },
    'bottom-right': { x:  0.8, y: -0.8 }
  };
  
  const coords = directionMap[direction];
  if (!coords) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid direction. Use: top-left, top, top-right, left, center, right, bottom-left, bottom, bottom-right' 
    });
  }
  
  console.log(`🎯 Head direction command: ${direction} (x=${coords.x}, y=${coords.y})`);
  
  const command = {
    type: 'lookAt',
    data: { ...coords, instant: false },
    timestamp: new Date().toISOString()
  };
  
  broadcast(command);
  res.json({ success: true, command, direction, clients: clients.size });
});

app.post('/api/control/expression', (req: Request<{}, {}, ExpressionCommand>, res: Response) => {
  const { id } = req.body;
  
  console.log(`😊 Expression command: id=${id}`);
  
  const command = {
    type: 'expression',
    data: { id },
    timestamp: new Date().toISOString()
  };
  
  broadcast(command);
  res.json({ success: true, command, clients: clients.size });
});

app.post('/api/control/motion', (req: Request<{}, {}, MotionCommand>, res: Response) => {
  const { group, index, priority = 3 } = req.body;
  
  console.log(`🎭 Motion command: group=${group}, index=${index}, priority=${priority}`);
  
  const command = {
    type: 'motion',
    data: { group, index, priority },
    timestamp: new Date().toISOString()
  };
  
  broadcast(command);
  res.json({ success: true, command, clients: clients.size });
});

app.post('/api/control/tap', (req: Request<{}, {}, TapCommand>, res: Response) => {
  const { x, y } = req.body;
  
  console.log(`👆 Tap command: x=${x}, y=${y}`);
  
  const command = {
    type: 'tap',
    data: { x, y },
    timestamp: new Date().toISOString()
  };
  
  broadcast(command);
  res.json({ success: true, command, clients: clients.size });
});

app.post('/api/control/subtitle', async (req: Request<{}, {}, SubtitleCommand>, res: Response) => {
  const { text, type = 'response', duration, enableTTS = true } = req.body;
  
  if (!text || text.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      error: 'Subtitle text is required' 
    });
  }
  
  console.log(`💬 Subtitle command: "${text}" (type: ${type}${duration ? `, duration: ${duration}ms` : ''}${enableTTS ? ', with TTS' : ''})`);
  
  let audioInfo = null;
  
  // 生成语音（如果启用）
  if (enableTTS) {
    try {
      audioInfo = await ttsService.generateSpeech(text);
      console.log(`🔊 TTS generated: ${audioInfo.filename}`);
    } catch (error: any) {
      console.error(`❌ TTS failed: ${error.message}`);
      // TTS 失败不影响字幕显示
    }
  }
  
  const command = {
    type: 'subtitle',
    data: { 
      text, 
      type, 
      duration,
      audio: audioInfo ? {
        url: audioInfo.url,
        duration: audioInfo.duration,
        filename: audioInfo.filename
      } : null
    },
    timestamp: new Date().toISOString()
  };
  
  broadcast(command);
  res.json({ 
    success: true, 
    command, 
    clients: clients.size,
    audio: audioInfo ? {
      url: audioInfo.url,
      duration: audioInfo.duration,
      size: audioInfo.size,
      filename: audioInfo.filename
    } : null
  });
});

// TTS 管理端点
app.get('/api/tts/info', async (_req: Request, res: Response) => {
  try {
    const info = await ttsService.getStorageInfo();
    res.json({ success: true, ...info });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tts/cleanup', async (req: Request, res: Response) => {
  const { maxAge } = req.body;
  try {
    const deletedCount = await ttsService.cleanupOldFiles(maxAge);
    res.json({ success: true, deletedCount });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get local network address
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return 'localhost';
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  
  console.log('\n🚀 ========================================');
  console.log('🚀 Live2D Control Backend Started');
  console.log('🚀 ========================================');
  console.log('📍 Server listening on:');
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://${localIP}:${PORT}`);
  console.log('\n🔌 SSE Endpoints:');
  console.log(`   Local:    http://localhost:${PORT}/sse`);
  console.log(`   Network:  http://${localIP}:${PORT}/sse`);
  console.log('\n💡 Health Check:');
  console.log(`   http://localhost:${PORT}/health`);
  console.log('\n📱 Frontend Configuration:');
  console.log('   1. Open frontend (http://localhost:3000)');
  console.log('   2. In Manual Controls panel, set Backend URL:');
  console.log(`      http://localhost:${PORT}/sse`);
  console.log('   3. Enable SSE Control');
  console.log('\n📡 API Endpoints:');
  console.log(`   POST ${PORT}/api/control/look`);
  console.log(`   POST ${PORT}/api/control/head/:direction`);
  console.log(`        Directions: top-left, top, top-right,`);
  console.log(`                   left, center, right,`);
  console.log(`                   bottom-left, bottom, bottom-right`);
  console.log(`   POST ${PORT}/api/control/expression`);
  console.log(`   POST ${PORT}/api/control/motion`);
  console.log(`   POST ${PORT}/api/control/tap`);
  console.log(`   POST ${PORT}/api/control/subtitle`);
  console.log(`   POST ${PORT}/api/control/reset`);
  console.log('🚀 ========================================\n');
});