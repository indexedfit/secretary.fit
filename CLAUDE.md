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

## AI Agent Architecture

### Dual-Agent Approach
The system uses two AI agents working together:

**GROQ (Fast Intermediary)**
- Provides immediate, conversational acknowledgments
- Natural, warm responses that feel human
- Bridges the gap between voice input and background processing
- Example tone: "Let me take a look at those documents for you..."

**Claude Agent SDK (Deep Processing)**
- Handles actual file operations and complex tasks
- Built-in bash, file operations, and code execution tools
- User-specific workspace sandboxing
- Takes time to plan and execute properly - that's the feature, not a bug

**Message Flow:**
1. User speaks → Speech-to-text
2. GROQ immediately responds conversationally
3. Claude Agent SDK processes in background
4. Progress updates streamed back to user
5. Text-to-speech delivers responses

### User Sandboxing
- Each user gets isolated folder: `/workspace/user-{id}/`
- Agent SDK scoped to user's directory only
- Path validation prevents directory traversal
- Conversation history maintained per user

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

## Implementation Roadmap

### Current Status (Phase 0)
✅ Monorepo structure with client and server
✅ React client with TTS/STT hooks
✅ WebSocket server infrastructure
✅ GROQ integration for fast responses
✅ Claude Agent SDK integrated with user sandboxing
✅ User session management (UUID per connection)
✅ Workspace isolation (`/workspace/user-{id}/`)

### Phase 1: Dual-Agent Flow (In Progress)
**Goal:** Implement the full dual-agent architecture where GROQ provides immediate acknowledgment while Claude Agent processes in background.

**Tasks:**
1. **Streaming Agent Responses**
   - Uncomment agent streaming code in `server/src/handlers/websocket.ts:81-96`
   - Test Agent SDK streaming with simple file operations
   - Handle session ID persistence for conversation continuity

2. **Client UI Updates**
   - Add separate UI sections for GROQ (instant) vs Agent (processing) responses
   - Display "Processing..." indicator when Agent is working
   - Stream Agent progress updates to UI
   - Handle multiple concurrent message types

3. **Message Type Expansion**
   - Add `agent_progress`, `agent_tool_use`, `agent_complete` message types
   - Update `types/messages.ts` with new message schemas
   - Client-side handlers for each Agent event type

4. **Testing & Validation**
   - Test with simple tasks: "create a file", "read a file", "run a bash command"
   - Verify workspace isolation between users
   - Confirm session persistence across multiple messages

### Phase 2: Enhanced Agent Capabilities
**Goal:** Expand what the Agent can do and improve user experience.

**Tasks:**
1. **Expand Tool Access**
   - Add more tools: `WebSearch`, `WebFetch`, `Task` (subagents)
   - Configure MCP servers if needed for external integrations
   - Fine-tune tool permissions per use case

2. **Conversation Context Management**
   - Implement session resume functionality
   - Save conversation history to disk per user
   - Add session listing/management endpoints

3. **Voice Experience Refinement**
   - Optimize GROQ responses for voice (shorter, more natural)
   - Implement interrupt/cancel for long Agent operations
   - Add voice controls (pause, resume, stop)
   - Selective TTS for different message types

4. **Security & Resource Management**
   - Add workspace size limits per user
   - Implement request rate limiting
   - Add timeout controls for Agent operations
   - Audit logging for file operations

### Phase 3: Production Readiness
**Goal:** Make the system production-ready with proper monitoring and scale.

**Tasks:**
1. **Error Handling & Recovery**
   - Graceful Agent failures with user-friendly messages
   - Auto-retry for transient errors
   - Fallback to GROQ if Agent fails

2. **Monitoring & Observability**
   - Add metrics: response times, token usage, costs
   - Agent operation logging and tracing
   - Health check endpoints
   - Usage analytics dashboard

3. **Performance Optimization**
   - Implement prompt caching for Agent SDK
   - Optimize workspace file I/O
   - WebSocket connection pooling
   - Client-side caching for common responses

4. **User Management**
   - Persistent user accounts (vs session-based UUIDs)
   - User preferences (voice settings, agent behavior)
   - Workspace persistence across sessions
   - Multi-device sync

### Phase 4: Advanced Features
**Goal:** Add sophisticated capabilities that differentiate the product.

**Tasks:**
1. **Multi-Modal Support**
   - Image/screenshot analysis via Agent
   - PDF document processing
   - Code execution and debugging

2. **Collaborative Features**
   - Shared workspaces between users
   - Real-time collaboration on Agent tasks
   - Team-level conversation history

3. **Custom Agent Behaviors**
   - User-configurable system prompts
   - Custom subagents for specific workflows
   - Agent personality customization
   - Task templates and shortcuts

4. **Integration Ecosystem**
   - GitHub integration for code operations
   - Calendar/email via MCP servers
   - Custom MCP server marketplace
   - API for third-party integrations

### Next Immediate Steps
1. **Test current setup:** Run `npm run dev` and verify both servers start
2. **Simple Agent test:** Uncomment streaming code and test with "create a file named test.txt"
3. **Client streaming UI:** Add visual feedback for Agent processing states
4. **Documentation:** Document Agent message flow with examples

### Technical Debt & Future Considerations
- Replace WeakMap session storage with Redis for multi-server scaling
- Implement proper authentication (OAuth, JWT)
- Add TypeScript strict mode compliance
- Unit tests for Agent message processing
- E2E tests for dual-agent flow
- Consider server-side rendering for better SEO
