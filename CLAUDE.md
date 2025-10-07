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

### Current Status (Phase 1 Complete! 🎉)

**Core Platform:**
✅ Monorepo structure with client and server
✅ React client with localStorage persistence
✅ WebSocket server infrastructure
✅ User session management (UUID per connection)
✅ Workspace isolation (`/workspace/user-{id}/`)

**AI Integration:**
✅ GROQ integration with conversational system prompt
✅ Claude Agent SDK with user sandboxing
✅ Smart agent triggering (only runs for file ops, not simple questions)
✅ Dual-agent flow: GROQ (instant) + Agent (deep processing)

**UX Features:**
✅ Tool usage progress indicators (✏️ Write, 📖 Read, ⚙️ Bash)
✅ File detection and sidebar viewer
✅ Auto-save conversation and files
✅ Duplicate message deduplication
✅ Session persistence across refreshes

**Performance:**
✅ Simple queries: 500ms (GROQ only)
✅ Complex queries: 3-5s (GROQ + Agent)
✅ Cost optimized: 30x cheaper for simple questions

### Phase 2: Voice Integration ✅ COMPLETE!
**Goal:** Replace browser APIs with production-quality voice.

**Completed:**
- ✅ Groq Whisper Turbo for STT (real-time transcription)
- ✅ ElevenLabs TTS for high-quality voice
- ✅ WebSocket binary audio streaming
- ✅ Click-to-record interface
- ✅ Auto-scroll conversation
- ✅ File detection and viewing

**What Works Now:**
- 🎙️ Click Record → Speak → Click Stop
- 📝 Whisper transcribes speech
- 💬 GROQ responds immediately
- 🔊 ElevenLabs speaks response
- 📁 Files auto-detected and viewable in sidebar

### Phase 3: Voice-to-Voice Mode (Mobile-First UX) 🎯 NEXT!
**Goal:** Create a seamless voice conversation experience optimized for mobile.

**Design Philosophy:**
- **Mobile-first**: Touch-friendly, works great on phones
- **One-tap interaction**: Click to send, click to interrupt
- **Visual feedback**: Always show what's happening
- **Continuous flow**: Voice → Response → Voice (like a real conversation)

**Architecture:**

```
┌─────────────────────────────────────┐
│  Mobile-Optimized Voice Interface   │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────┐     │
│  │   Audio Visualizer        │     │
│  │   (Winamp-style waveform) │     │
│  │   🎵🎵🎵🎵🎵🎵🎵           │     │
│  └───────────────────────────┘     │
│                                     │
│  ┌───────────────────────────┐     │
│  │  Status: Recording...      │     │
│  │  or: AI is thinking...     │     │
│  │  or: AI is speaking...     │     │
│  └───────────────────────────┘     │
│                                     │
│  ┌───────────────────────────┐     │
│  │   🎤 TAP TO SEND          │     │ ← While recording
│  │   or                       │     │
│  │   ⏸️  TAP TO INTERRUPT    │     │ ← While AI speaking
│  └───────────────────────────┘     │
│                                     │
│  ┌───────────────────────────┐     │
│  │  Tool Progress Indicators  │     │
│  │  ✏️ Writing file...        │     │
│  │  📖 Reading document...    │     │
│  └───────────────────────────┘     │
│                                     │
│  ┌───────────────────────────┐     │
│  │  File Viewer (Swipeable)   │     │
│  │  📄 test.txt               │     │
│  │  📄 script.py              │     │
│  └───────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

**Implementation Tasks:**

**3.1: Mobile-First UI Redesign**
- [ ] Single-column layout (no sidebar on mobile)
- [ ] Bottom sheet for file viewer (swipe up to expand)
- [ ] Large touch targets (min 44px)
- [ ] Responsive breakpoints (mobile/tablet/desktop)
- [ ] Remove text input on mobile (voice-only mode)
- [ ] Fullscreen voice interface option

**3.2: Winamp-Style Audio Visualizer**
- [ ] Real-time waveform during recording (using Web Audio API analyzer)
- [ ] Animated bars during AI speech playback
- [ ] Color-coded: Blue (recording), Green (AI speaking), Gray (idle)
- [ ] Smooth animations (60fps)
- [ ] Component: `<AudioVisualizer />`

**3.3: Smart State Machine**
```typescript
States:
- IDLE: Show "Tap to Record" button
- RECORDING: Show waveform + "Tap to Send"
- PROCESSING: Show "Thinking..." spinner
- SPEAKING: Show waveform + "Tap to Interrupt"
- AGENT_WORKING: Show tool indicators (Read, Write, Bash, etc.)
```

**3.4: Click-to-Send / Click-to-Interrupt**
- [ ] State-aware button:
  - IDLE → Click starts recording
  - RECORDING → Click sends & stops
  - SPEAKING → Click interrupts & stops audio
  - AGENT_WORKING → Click cancels agent (if possible)
- [ ] Haptic feedback on mobile (vibrate)
- [ ] Visual state transitions (color changes)

**3.5: Enhanced Agent SDK Integration**
- [ ] Expose more tools: `WebSearch`, `WebFetch`, `Task` (subagents)
- [ ] Real-time tool progress streaming
- [ ] Better error handling & recovery
- [ ] Tool usage visualization (show what agent is doing)
- [ ] Interrupt/cancel agent operations

**3.6: Progress Indicators**
- [ ] Tool icons with labels (✏️ Writing, 📖 Reading, ⚙️ Running, 🔍 Searching)
- [ ] Progress bar for long operations
- [ ] Estimated time remaining (if available)
- [ ] Queue indicator (if multiple tools)

**3.7: File Management**
- [ ] Swipeable bottom sheet for files
- [ ] Tap file to expand/preview
- [ ] Syntax highlighting for code
- [ ] Download button for files
- [ ] Delete file option
- [ ] File thumbnails (for images)

**3.8: Mobile Optimizations**
- [ ] Service Worker for offline support
- [ ] PWA manifest (add to home screen)
- [ ] Handle screen wake lock during recording
- [ ] Optimize for low-bandwidth (compress audio)
- [ ] Battery optimization (suspend when backgrounded)
- [ ] Handle interruptions (phone calls, notifications)

**3.9: Voice Activity Detection (VAD)**
- [ ] Auto-detect when user stops speaking
- [ ] Configurable silence threshold (e.g., 1.5s of silence = auto-send)
- [ ] Toggle for manual vs. auto-send
- [ ] Visual indicator for VAD (listening indicator)

**3.10: Settings Panel**
- [ ] Voice selection (ElevenLabs voices)
- [ ] Speed control (0.75x - 1.5x)
- [ ] Auto-send timeout
- [ ] Enable/disable file auto-detection
- [ ] Theme (light/dark)
- [ ] Advanced: Show text transcript toggle

**Technical Implementation Details:**

**Audio Visualizer Component:**
```typescript
// client/src/components/AudioVisualizer.tsx
const AudioVisualizer = ({
  isRecording,
  isSpeaking,
  audioStream
}) => {
  // Use Web Audio API AnalyserNode
  // Draw canvas with requestAnimationFrame
  // 32 bars, update 60fps
  // Color: recording=#3B82F6, speaking=#10B981
}
```

**State Machine:**
```typescript
// client/src/hooks/useVoiceState.ts
type VoiceState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'speaking'
  | 'agent_working'

const useVoiceState = () => {
  const [state, setState] = useState<VoiceState>('idle')

  const handleTap = () => {
    switch(state) {
      case 'idle': startRecording(); break;
      case 'recording': sendAudio(); break;
      case 'speaking': interrupt(); break;
      case 'agent_working': cancelAgent(); break;
    }
  }

  return { state, handleTap, buttonLabel, buttonColor }
}
```

**Mobile Layout:**
```css
/* Mobile-first breakpoints */
@media (max-width: 768px) {
  /* Single column, no sidebar */
  /* Bottom sheet for files */
  /* Fullscreen voice UI */
}

@media (min-width: 769px) {
  /* Tablet: Side-by-side with collapsible sidebar */
}

@media (min-width: 1024px) {
  /* Desktop: Current layout (chat + sidebar) */
}
```

**Agent Tool Access:**
```typescript
// Expand tools available to Agent SDK
const agentOptions = {
  tools: [
    'Read', 'Write', 'Edit', 'Bash',
    'WebSearch', 'WebFetch', 'Glob', 'Grep',
    'Task' // For spawning subagents
  ],
  timeout: 60000, // 1min max
  onProgress: (tool, status) => {
    // Stream progress to UI
  }
}
```

**Next Immediate Steps:**
1. Create AudioVisualizer component
2. Implement voice state machine
3. Add mobile-first CSS with breakpoints
4. Build bottom sheet file viewer
5. Add click-to-interrupt logic
6. Test on mobile device (iPhone/Android)

### Phase 4: Enhanced Agent Capabilities
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

### Next Immediate Steps (Phase 3 - Voice-to-Voice)
1. ✅ **Voice pipeline working** - STT + GROQ + TTS fully operational
2. ✅ **File viewing** - Sidebar shows created files
3. **START Mobile-First Voice UX:**
   - Day 1-2: Audio visualizer component (Winamp-style)
   - Day 3-4: Voice state machine + click-to-interrupt
   - Day 5-6: Mobile-responsive layout + bottom sheet
   - Day 7: Test on real mobile devices
   - Day 8-9: Agent tool progress indicators
   - Day 10: Voice Activity Detection (auto-send)

### Technical Debt & Future Considerations
- Replace WeakMap session storage with Redis for multi-server scaling
- Implement proper authentication (OAuth, JWT)
- Add TypeScript strict mode compliance
- Unit tests for Agent message processing
- E2E tests for dual-agent flow
- Consider server-side rendering for better SEO
