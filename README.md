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

## Mobile Testing

To test on mobile devices (iOS/Android), you need HTTPS for microphone access:

```bash
# Quick setup (generates SSL certificate)
./setup-mobile-https.sh

# Then start dev server
npm run dev
```

The servers will:
- **Client (Vite)**: Listen on all network interfaces with HTTPS (if cert exists)
- **Server (WebSocket)**: Listen on 0.0.0.0:3001 (accepts LAN connections)
- **Auto-detection**: Client automatically connects to the correct WebSocket URL

On your mobile device:
1. Find your computer's IP (e.g., 192.168.0.30)
2. Visit `http://YOUR_IP:5173` (or `https://YOUR_IP:5173` if cert exists)
3. Accept security warning if using self-signed cert
4. Grant microphone permissions
5. Start using voice mode! 🎤

**Note**: Both servers must be on the same network as your mobile device.

See `client/.cert/README.md` for detailed HTTPS setup instructions.

## Production Deployment

When deploying to production:

1. **Set WebSocket URL** in your hosting environment:
   ```bash
   # For client deployment
   VITE_WS_URL=wss://api.yourapp.com
   ```

2. **Server** should be deployed separately (e.g., on Railway, Render, or VPS)

3. **CORS**: Update `CLIENT_URL` in server `.env` to your production domain

Example production setup:
- Client: `https://secretary.fit` (Vercel/Netlify)
- Server: `wss://api.secretary.fit` (Railway/Render)
- Set `VITE_WS_URL=wss://api.secretary.fit` in client env

## Development

- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both projects
- `npm test` - Run tests for both projects
- `npm run clean` - Clean all dependencies and build artifacts

## Requirements

- Node.js >= 18.0.0
- Anthropic API key (for Claude)
- GROQ API key (for fast inference)
- ElevenLabs API key (for TTS)
