# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

secretary.fit is a monorepo containing an AI-powered voice assistant application with two main components:

- **client**: React web application with browser-based TTS (Text-to-Speech) and STT (Speech-to-Text)
- **server**: WebSocket server integrating Claude API and GROQ for AI inference

## Development Commands

### Root Level
- `npm install` - Install all dependencies for client and server
- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both projects
- `npm test` - Run tests for both projects
- `npm run clean` - Remove all node_modules and build artifacts

### Client (React + Vite)
```bash
cd client
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run Vitest tests
```

### Server (WebSocket + AI)
```bash
cd server
npm run dev      # Start with hot reload using tsx
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled version
npm test         # Run Vitest tests
```

## Architecture

### Client Architecture

The client uses React with Vite and is structured around three core browser APIs:

1. **WebSocket Connection** (`useWebSocket` hook)
   - Connects to server at ws://localhost:3001
   - Auto-reconnection logic
   - Bidirectional message passing with server

2. **Speech Recognition** (`useSpeechRecognition` hook)
   - Uses browser's Web Speech API (SpeechRecognition)
   - Converts user voice to text
   - Supports interim and final results

3. **Speech Synthesis** (`useSpeechSynthesis` hook)
   - Uses browser's Web Speech API (SpeechSynthesis)
   - Converts AI responses to voice
   - Voice selection support

**File Structure:**
- `src/hooks/` - Custom React hooks for WebSocket, STT, and TTS
- `src/components/` - React components (currently all in App.tsx)
- `src/utils/` - Utility functions

### Server Architecture

The server is a WebSocket-based service that routes messages to different AI providers:

1. **WebSocket Handler** (`handlers/websocket.ts`)
   - Main connection logic
   - Message routing
   - Client lifecycle management

2. **AI Services** (`services/`)
   - `claude.ts` - Anthropic Claude integration using @anthropic-ai/sdk
   - `groq.ts` - GROQ fast inference using groq-sdk
   - Both maintain conversation history (last 10 messages)

3. **Message Types** (`types/messages.ts`)
   - `ClientMessage`: { type: 'message' | 'ping', content?: string }
   - `ServerMessage`: { type: 'message' | 'error' | 'pong', content?: string }

**Service Selection Logic:**
- Currently hardcoded in `handlers/websocket.ts` (see `useGroq` flag)
- GROQ is used for fast responses
- Claude can be used for more complex reasoning

## Environment Configuration

Required environment variables (see `.env.example`):

- `PORT` - Server WebSocket port (default: 3001)
- `ANTHROPIC_API_KEY` - For Claude API access
- `GROQ_API_KEY` - For GROQ API access
- `CLIENT_URL` - CORS configuration (default: http://localhost:5173)

## Key Implementation Details

### Conversation History Management
Both AI services maintain conversation history:
- Limited to last 10 messages to manage token usage
- GROQ includes a persistent system message
- History can be cleared via service methods

### WebSocket Message Flow
1. Client sends: `{ type: 'message', content: 'user input' }`
2. Server routes to AI service (GROQ or Claude)
3. Server responds: `{ type: 'message', content: 'AI response' }`
4. Client triggers TTS to speak response

### Browser API Compatibility
- Speech Recognition: Chrome/Edge (webkit prefix), not Safari iOS
- Speech Synthesis: All modern browsers
- Both hooks include `isSupported` checks

## Common Development Tasks

### Switching AI Providers
Edit `server/src/handlers/websocket.ts:39` to change the `useGroq` flag.

### Adding New Message Types
1. Update `server/src/types/messages.ts` interfaces
2. Add handler in `server/src/handlers/websocket.ts` switch statement
3. Update client WebSocket hook to handle new type

### Modifying Conversation Context
- Claude: Edit `server/src/services/claude.ts` (adjust history length, model, max_tokens)
- GROQ: Edit `server/src/services/groq.ts` (adjust system prompt, model, temperature)
