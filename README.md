# JiLive Agent

A live streaming agent built with Wonderland v3 framework that processes danmaku (弹幕) and generates corresponding actions for live avatars.

## Features

- **Danmaku Processing**: Batch processing of live stream comments
- **Action Generation**: Converts danmaku into avatar actions (speech, emotions, animations)
- **Real-time Response**: Processes and responds to viewer interactions
- **Multi-platform Support**: Designed for various live streaming platforms
- **RESTful API**: Easy integration with external systems

## Architecture

```
DanmakuPump → DanmakuBatchIterator → ActionReactor → ActionPushConsumer
```

- **DanmakuPump**: Receives danmaku from streaming platforms
- **DanmakuBatchIterator**: Groups danmaku for efficient batch processing
- **ActionReactor**: Analyzes danmaku and generates appropriate actions
- **ActionPushConsumer**: Executes actions on the live avatar

## Quick Start

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Start the agent:
```bash
pnpm dev  # Development mode with watch
pnpm start  # Production mode
```

## API Endpoints

- `GET /api/overview` - Agent status and overview
- `GET /api/controllers` - List all controllers
- `GET /api/influence-paths` - Analyze event flow paths
- `POST /api/danmaku` - Submit single danmaku
- `POST /api/danmaku/batch` - Submit multiple danmaku

### Example: Submit Danmaku

```bash
curl -X POST http://localhost:3002/api/danmaku \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "username": "TestUser",
    "content": "说: Hello JiLive!",
    "roomId": "room456"
  }'
```

## Supported Actions

- **Speech**: `说:` or `say:` prefix triggers speech
- **Emotions**: Keywords like "开心", "happy", "难过", "sad"
- **Animations**: Keywords like "跳舞", "dance"
- **High-frequency Detection**: Special responses for repeated messages

## Configuration

See `.env.example` for all configuration options:

- `JILIVE_API_PORT`: API server port (default: 3002)
- `JILIVE_BATCH_INTERVAL`: Danmaku batch processing interval
- `JILIVE_VERBOSE`: Enable verbose logging for testing

## Development

```bash
# Type checking
pnpm typecheck

# Build
pnpm build

# Clean build artifacts
pnpm clean
```

## Integration

JiLive can be integrated with:
- Live streaming platforms (Bilibili, Douyu, Huya, etc.)
- Virtual avatar systems
- OBS Studio plugins
- Custom live streaming applications

## License

Private