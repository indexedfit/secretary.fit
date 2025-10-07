# secretary.fit

An AI-powered assistant with Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities, powered by Claude AI and GROQ.

## Architecture

This is a monorepo containing:

- **client**: React web application with local TTS/STT capabilities
- **server**: WebSocket server with Claude Agent SDK integration and GROQ inference

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start development servers:
```bash
npm run dev
```

This will start both the client (http://localhost:5173) and server (ws://localhost:3001).

## Development

- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both projects
- `npm test` - Run tests for both projects
- `npm run clean` - Clean all dependencies and build artifacts

## Requirements

- Node.js >= 18.0.0
- Anthropic API key (for Claude)
- GROQ API key (for fast inference)
