"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const os = __importStar(require("os"));
const tts_service_1 = require("./services/tts-service");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '8011', 10);
const clients = new Map();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 提供静态文件访问（音频文件）
app.use('/audio', express_1.default.static('public/audio'));
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
app.get('/sse', (req, res) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
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
    const client = {
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
        }
        catch (error) {
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
// Broadcast to all connected clients
function broadcast(command) {
    const message = `data: ${JSON.stringify(command)}\n\n`;
    let successCount = 0;
    let failCount = 0;
    clients.forEach((client, clientId) => {
        try {
            client.response.write(message);
            successCount++;
        }
        catch (error) {
            console.error(`Failed to send to client ${clientId}:`, error);
            clients.delete(clientId);
            failCount++;
        }
    });
    console.log(`📡 Broadcast: ${command.type} to ${successCount} clients (${failCount} failed)`);
}
// API endpoints to control Live2D
app.post('/api/control/look', (req, res) => {
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
app.post('/api/control/reset', (req, res) => {
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
app.post('/api/control/head/:direction', (req, res) => {
    const { direction } = req.params;
    // Map 9 directions to x,y coordinates
    const directionMap = {
        'top-left': { x: -0.8, y: 0.8 },
        'top': { x: 0.0, y: 0.8 },
        'top-right': { x: 0.8, y: 0.8 },
        'left': { x: -0.8, y: 0.0 },
        'center': { x: 0.0, y: 0.0 },
        'right': { x: 0.8, y: 0.0 },
        'bottom-left': { x: -0.8, y: -0.8 },
        'bottom': { x: 0.0, y: -0.8 },
        'bottom-right': { x: 0.8, y: -0.8 }
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
app.post('/api/control/expression', (req, res) => {
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
app.post('/api/control/motion', (req, res) => {
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
app.post('/api/control/tap', (req, res) => {
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
app.post('/api/control/subtitle', async (req, res) => {
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
            audioInfo = await tts_service_1.ttsService.generateSpeech(text);
            console.log(`🔊 TTS generated: ${audioInfo.filename}`);
        }
        catch (error) {
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
app.get('/api/tts/info', async (_req, res) => {
    try {
        const info = await tts_service_1.ttsService.getStorageInfo();
        res.json({ success: true, ...info });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/tts/cleanup', async (req, res) => {
    const { maxAge } = req.body;
    try {
        const deletedCount = await tts_service_1.ttsService.cleanupOldFiles(maxAge);
        res.json({ success: true, deletedCount });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get local network address
function getLocalIP() {
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
