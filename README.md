# G-Live - AI Trading Live Streaming Suite

G-Live is an AI-powered VTuber streaming system built on the Alice v3 (Wonderland v3) framework, specifically designed for trading live streaming scenarios. It combines VTuber technology, chat interaction, and intelligent AI responses.

## System Architecture

### Core Components

#### 1. Agent (`jilive/agent`)
- **Function**: Core AI agent that processes chat messages and generates responses
- **Ports**: 8012 (Agent API), 8013 (Custom API)
- **Features**:
  - Real-time and batch processing of chat messages
  - AI-powered analysis and response generation
  - Action command generation (VTuber control)
  - Subtitle streaming with TTS support

#### 2. VTuber Frontend (`jilive/vtuber`)
- **Function**: Live2D VTuber display frontend
- **Port**: 8010 (Next.js)
- **Features**:
  - Live2D model rendering and control
  - Motion triggering (manual/automatic)
  - Expression management
  - Real-time control interface

#### 3. VTuber Backend (`jilive/vtuber-backend`)
- **Function**: VTuber real-time control service
- **Port**: 8011
- **Features**:
  - SSE real-time communication
  - TTS voice synthesis
  - Client connection management
  - Subtitle streaming

#### 4. Danmaku Collector (`jilive/danmaku-collector`)
- **Function**: Collects chat messages from streaming platforms
- **Port**: 8015
- **Supported Platforms**: Twitch (extensible)

## Quick Start

### 1. Install Dependencies
```bash
cd /path/to/alice-v3
pnpm install
```

### 2. Start Services

#### Method 1: Using Startup Scripts
```bash
cd apps/jilive
./start-all.sh  # Start all services
./status.sh     # Check service status
./stop-all.sh   # Stop all services
```

#### Method 2: Start Services Individually
```bash
# Terminal 1: Start Agent
cd apps/jilive/agent
pnpm dev

# Terminal 2: Start VTuber Frontend
cd apps/jilive/vtuber
pnpm dev

# Terminal 3: Start VTuber Backend
cd apps/jilive/vtuber-backend
pnpm dev

# Terminal 4: Start Chat Collector
cd apps/jilive/danmaku-collector
pnpm dev
```

## Port Allocation

| Service | Port | Description |
|---------|------|-------------|
| VTuber Frontend | 8010 | Next.js frontend |
| VTuber Backend | 8011 | TTS and subtitle service |
| Agent API | 8012 | Agent monitoring API |
| Agent Custom API | 8013 | Chat/subtitle API |
| Chat Collector | 8015 | Chat collection service |

## API Endpoints

### Agent Custom API (8013)
- `POST /api/danmaku` - Submit single chat message
- `POST /api/danmaku/batch` - Submit batch chat messages
- `POST /api/subtitle/test` - Test subtitle streaming

### VTuber Backend API (8011)
- `POST /api/subtitle-with-tts` - Send subtitle with TTS generation
- `GET /api/sse` - SSE event stream

### Chat Collector API (8015)
- `POST /api/connect` - Connect to live stream
- `POST /api/disconnect` - Disconnect from stream
- `GET /api/status` - Get connection status

## Event Flow

```
User Chat → Chat Collector → Agent (AI Processing) → 
  ├→ Action Events → VTuber (Motion Control)
  └→ Subtitle Events → VTuber Backend (TTS) → VTuber Frontend (Display)
```

## Configuration

### Agent Configuration
Edit `apps/jilive/agent/src/config/index.ts`:
- AI model selection
- Redis connection
- Batch processing intervals

### VTuber Configuration
- Place Live2D models in `apps/jilive/vtuber/public/models/`
- Configure TTS in backend environment variables

## Trading System Integration

G-Live can integrate with trading systems like Jirai-Alpha to enable:
- Real-time trading signal announcements
- Market analysis commentary
- Audience trading Q&A
- Automated trading demonstrations

Integration approach:
1. Agent monitors trading events from external systems
2. Convert trading signals into subtitles and actions
3. VTuber displays trading operations and commentary

## Development Guide

### Tech Stack
- **Framework**: Alice v3 (Wonderland v3)
- **Frontend**: Next.js, React, Live2D
- **Backend**: Express, TypeScript
- **AI**: Vercel AI SDK
- **Real-time Communication**: SSE, WebSocket
- **TTS**: Multiple TTS service support

### Directory Structure
```
apps/jilive/
├── agent/              # Core AI agent
├── vtuber/             # VTuber frontend (Next.js)
├── vtuber-backend/     # VTuber backend (Express)
├── danmaku-collector/  # Chat collector
└── *.sh               # Management scripts
```

## Important Notes

1. **Redis Dependency**: Agent requires Redis to be running
2. **Live2D License**: Using Live2D models requires appropriate licensing
3. **TTS Quotas**: Monitor TTS service usage quotas
4. **Performance**: Batch process chat messages for better performance

## Roadmap

- [ ] Support more streaming platforms (Bilibili, YouTube)
- [ ] Enhanced trading signal visualization
- [ ] More VTuber actions and expressions
- [ ] Optimized AI response speed
- [ ] Enhanced audience interaction features