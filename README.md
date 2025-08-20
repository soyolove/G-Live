# G-Live - The First AI-Powered Web3 Investment Streamer

<div align="center">
  <img src="glive.png" alt="G-Live Logo" width="200"/>
  <h3>Revolutionizing Web3 Investment with AI-Driven Live Streaming</h3>
</div>

## 🌟 What is G-Live?

G-Live is the world's first AI-powered Web3 investment streamer, combining cutting-edge AI technology with Live2D VTuber avatars to deliver real-time market insights and interactive investment content. Built on the Alice v3 (Wonderland v3) framework, G-Live transforms how investors consume and interact with market information.

### Core Capabilities

- **🤖 AI Market Analysis**: Real-time analysis of market information with AI-generated insights and investment signals
- **💬 Interactive Streaming**: Live interaction with audience through chat, delivering personalized responses
- **📈 Future Content Expansion**: Live trading demonstrations, memecoin reviews, portfolio analysis

## 🎯 Key Features

### Real-Time Information Tracking

G-Live subscribes to mainstream information sources including:
- Twitter KOL posts and trends
- CoinGecko trending charts
- News from Foresight, PANews, and other crypto media

Users simply open the live stream to stay informed about all important market developments. Thanks to our modular analysis system, G-Live's analytical capabilities continuously improve.

### Multi-Platform Streaming

Access G-Live through Twitch and YouTube with:
- Real-time investment analysis with live chat interaction
- Concurrent processing of multiple information streams
- Simultaneous management of investment data, chat messages, and Telegram DMs
- Synchronized responses including voice, body movements, and text

G-Live often delivers more engaging interactions than human streamers.

### 🚀 Future Upgrades

1. **Live Trading**: Watch fully autonomous Agent trading with real-time market monitoring
2. **Project Reviews**: Request in-depth project analysis through chat and DMs, with live research presentations
3. **Portfolio Reviews**: Get personalized portfolio and trading style assessments, share your investment strategy with the community

## 🏗️ Technical Architecture

G-Live's architecture consists of three core modules:

### 1. Live Kit
Provides agents with packaged Live2D models and TTS voice interfaces for instant streaming capabilities

### 2. Investment Kit
Core structure for investment analysis, processing market data and extracting actionable insights

### 3. Collection Kit
Gathers chat messages from Twitch/YouTube and DMs from Telegram, easily extensible to new platforms

Future expansions will include Trading Kit and Long-Task Analysis Kit for enhanced functionality.

## 🛠️ System Components

### Core Components

#### 1. Agent (`agent/`)
- **Function**: Core AI agent for market analysis and response generation
- **Ports**: 8012 (Agent API), 8013 (Custom API)
- **Features**:
  - Real-time market data processing
  - AI-powered investment signal generation
  - Multi-source information aggregation
  - Automated response generation

#### 2. VTuber Frontend (`vtuber/`)
- **Function**: Live2D VTuber display and control
- **Port**: 8010 (Next.js)
- **Features**:
  - Live2D model rendering
  - Real-time motion control
  - Expression management
  - Interactive streaming interface

#### 3. VTuber Backend (`vtuber-backend/`)
- **Function**: Real-time streaming control service
- **Port**: 8011
- **Features**:
  - SSE real-time communication
  - TTS voice synthesis
  - Stream management
  - Subtitle generation

#### 4. Danmaku Collector (`danmaku-collector/`)
- **Function**: Multi-platform chat collection
- **Port**: 8015
- **Supported Platforms**: Twitch, YouTube (extensible)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/soyolove/G-Live.git
cd G-Live

# Install dependencies
pnpm install
```

### Starting Services

#### Method 1: One-Click Start
```bash
cd apps/jilive
./start-all.sh  # Start all services
./status.sh     # Check service status
./stop-all.sh   # Stop all services
```

#### Method 2: Manual Start
```bash
# Terminal 1: Start Agent
cd agent && pnpm dev

# Terminal 2: Start VTuber Frontend
cd vtuber && pnpm dev

# Terminal 3: Start VTuber Backend
cd vtuber-backend && pnpm dev

# Terminal 4: Start Chat Collector
cd danmaku-collector && pnpm dev
```

## 📡 API Reference

### Port Allocation

| Service | Port | Description |
|---------|------|-------------|
| VTuber Frontend | 8010 | Live streaming interface |
| VTuber Backend | 8011 | TTS and control service |
| Agent API | 8012 | Agent monitoring |
| Custom API | 8013 | Chat/subtitle API |
| Chat Collector | 8015 | Multi-platform chat collection |

### Key Endpoints

#### Agent Custom API (8013)
- `POST /api/danmaku` - Submit chat message
- `POST /api/danmaku/batch` - Batch message processing
- `POST /api/subtitle/test` - Test subtitle streaming

#### VTuber Backend API (8011)
- `POST /api/subtitle-with-tts` - Generate subtitle with TTS
- `GET /api/sse` - SSE event stream

## 🔄 Data Flow

```
Market Data → Investment Kit → AI Analysis →
                                          ├→ Investment Signals
                                          └→ Content Generation

User Chat → Collection Kit → Agent Processing → 
                                          ├→ Action Events → VTuber Motion
                                          └→ Voice Response → TTS → Stream
```

## ⚙️ Configuration

### Agent Configuration
Edit `agent/src/config/index.ts`:
- AI model selection
- Market data sources
- Analysis intervals
- Redis connection

### VTuber Configuration
- Live2D models: `vtuber/public/models/`
- TTS settings: Backend environment variables

## 🛣️ Roadmap

### Phase 1 - Foundation
- [x] Core streaming infrastructure
- [x] Basic AI analysis
- [x] Twitch integration
- [ ] YouTube integration

### Phase 2 - Enhanced Analytics
- [ ] Advanced market analysis algorithms
- [ ] Multi-source data aggregation
- [ ] Real-time trading signals

### Phase 3 - Interactive Features
- [ ] Live trading demonstrations
- [ ] Memecoin analysis
- [ ] Portfolio reviews
- [ ] Community investment strategies

### Phase 4 - Ecosystem Expansion
- [ ] Multi-language support
- [ ] Mobile app
- [ ] API for third-party integrations
- [ ] DAO governance

## 📝 License

MIT License - See [LICENSE](LICENSE) for details

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📧 Contact

- GitHub: [@soyolove](https://github.com/soyolove)
- Project Link: [https://github.com/soyolove/G-Live](https://github.com/soyolove/G-Live)

---

<div align="center">
  <b>G-Live - Where AI Meets Web3 Investment</b>
  <br>
  The future of investment streaming is here
</div>