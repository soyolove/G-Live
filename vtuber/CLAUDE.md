# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Live2D model viewer application built with Next.js, TypeScript, and Pixi.js. It consists of:
- **Frontend**: Next.js app for viewing and controlling Live2D models (port 8010)
- **Backend**: Express server providing SSE endpoints for remote control (port 8011)

## Development Commands

### Frontend (pixi-learn/)
```bash
pnpm dev      # Start development server on http://localhost:8010
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

### Backend (pixi-learn/backend/)
```bash
npm run dev      # Start with nodemon on http://localhost:8011
npm run build    # Compile TypeScript to dist/
npm run start    # Run compiled server
npm run start:ts # Run with ts-node (development)
```

## Architecture Overview

### Core Live2D Integration
The app uses `pixi-live2d-display` to render Live2D models within a Pixi.js canvas. Key files:
- `app/lib/Live2DModel.ts` - Extended Live2D model class with mouse tracking
- `app/lib/live2d-loader.ts` - Runtime loading and model instantiation
- `app/hooks/useModelManager.ts` - Model loading and management logic
- `app/hooks/useLive2DControl.ts` - Control methods for model manipulation

### SSE Control System
Real-time control is implemented via Server-Sent Events:
- Backend server (`backend/src/server.ts`) provides SSE endpoint at `/sse`
- Frontend hook (`app/hooks/useSSEControl.ts`) manages connection and command handling
- Commands include: lookAt, expression, motion, tap, resetFocus

### UI Component Structure
- Uses Shadcn UI components (in `components/ui/`) with Tailwind CSS v4
- Main control panels: ControlPanel, ManualControls, MotionControls, SSEConfig
- All components use TypeScript with proper type definitions

### State Management
- No external state library - uses React hooks and prop drilling
- Key state in `app/page.tsx`: currentModel, app (Pixi instance), controls
- SSE connection state managed separately with refs to prevent re-renders

## Key Technical Details

### Tailwind CSS v4
- Uses new `@theme` directive in globals.css
- PostCSS configuration required (postcss.config.js)
- CSS variables for theming with oklch colors

### Live2D Model Support
- Supports both Cubism 2 (.model.json) and Cubism 4 (.model3.json)
- Models can be loaded via: drag-drop, URL, or from public/models/
- Runtime libraries must be loaded before model instantiation

### SSE Connection Stability
- Uses refs for callbacks to prevent infinite reconnection loops
- Automatic reconnection with exponential backoff
- Handles 'connected' message type from server

### Type Definitions
- Custom types in `app/lib/types.ts` for Live2D models
- Extended window interface for Live2D globals
- Proper TypeScript config with strict mode

## Common Issues and Solutions

1. **Shadcn styles not working**: Ensure postcss.config.js exists and tailwindcss-animate is removed (incompatible with v4)
2. **SSE infinite reconnection**: Check that callbacks are stored in refs, not in useEffect dependencies
3. **Model loading fails**: Verify Live2D runtime is loaded first via ensureLive2DRuntime()
4. **TypeScript errors**: Run build command to catch type errors not shown in dev mode

## Testing

Currently no test setup. When implementing tests:
- Use Vitest for unit tests (better ESM support)
- Consider Playwright for Live2D interaction testing
- Mock Pixi.js and Live2D runtime for component tests