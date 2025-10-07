# Deployment Guide

## Quick Start (5 minutes)

**Prerequisites:**
- GitHub repo pushed
- Railway account (railway.app)
- Netlify account (netlify.com)
- API keys: Anthropic, GROQ, ElevenLabs

**Deploy Server (Railway):**
1. Go to railway.app → New Project → Deploy from GitHub repo
2. Add env vars: `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY`
3. Copy your Railway URL (e.g., `https://secretary-fit.up.railway.app`)

**Deploy Client (Netlify):**
1. Go to netlify.com → Add new site → Import from Git
2. Base directory: `client`, Build: `npm run build`, Publish: `client/dist`
3. Add env var: `VITE_WS_URL=wss://your-railway-url` (use wss://)
4. Deploy!

**Test:**
- Visit your Netlify URL on mobile (iOS requires HTTPS ✓)
- Grant microphone permission
- Tap mic button, speak, hear response!

---

## Railway (Server)

### Option A: Deploy via Railway Dashboard (Recommended)

1. **Go to railway.app and create a new project**
2. **Connect your GitHub repo**
3. **Configure the service:**
   - Root directory: `/` (Railway will use `railway.json` to find the server)
   - Railway will read `railway.json` for build/start commands
4. **Add environment variables in Railway Dashboard:**
   ```
   ANTHROPIC_API_KEY=your_actual_key
   GROQ_API_KEY=your_actual_key
   ELEVENLABS_API_KEY=your_actual_key
   ```
5. **Deploy**: Railway auto-deploys on push to main branch
6. **Get your URL**: Railway gives you `https://your-app.up.railway.app`
   - Your WebSocket URL is the same: `wss://your-app.up.railway.app`

### Option B: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Initialize**
   ```bash
   railway login
   railway init
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set ANTHROPIC_API_KEY=your_key
   railway variables set GROQ_API_KEY=your_key
   railway variables set ELEVENLABS_API_KEY=your_key
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Get Your WebSocket URL**
   ```bash
   railway status
   # Look for the public URL
   ```

### What Railway Does

Railway will automatically:
- Detect the `railway.json` config
- Run `cd server && npm install && npm run build`
- Start with `cd server && npm start`
- Provide HTTPS/WSS automatically (no SSL config needed)

---

## Netlify (Client)

### Option A: Deploy via Netlify Dashboard (Recommended)

1. **Go to netlify.com and create a new site**
2. **Connect your GitHub repo**
3. **Configure build settings:**
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`
4. **Add environment variables in Netlify Dashboard:**
   - Go to Site settings → Environment variables
   - Add: `VITE_WS_URL` = `wss://your-railway-app.up.railway.app`
5. **Deploy**: Netlify auto-deploys on push to main branch
6. **Get your URL**: Netlify gives you `https://your-app.netlify.app`
   - Custom domain can be configured later

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Deploy**
   ```bash
   cd client
   netlify deploy --prod
   ```

4. **Set Environment Variable**
   ```bash
   netlify env:set VITE_WS_URL wss://your-railway-app.up.railway.app
   ```

### What Netlify Does

Netlify will automatically:
- Run `npm install` in the client directory
- Run `npm run build` (builds React app with Vite)
- Serve static files from `client/dist`
- Provide HTTPS automatically
- Inject `VITE_WS_URL` during build time

---

## Quick Test Checklist

After deployment:

1. ✅ Visit your Netlify URL (e.g., `https://secretary-fit.netlify.app`)
2. ✅ Open browser console - check for WebSocket connection
3. ✅ Grant microphone permissions (HTTPS enables this)
4. ✅ Click record button - speak
5. ✅ Verify transcription appears
6. ✅ Verify AI response comes back
7. ✅ Verify audio plays

---

## Troubleshooting

**WebSocket won't connect:**
- Check `VITE_WS_URL` is set correctly in Netlify
- Verify Railway server is running (check Railway logs)
- Check Railway server URL is using `wss://` not `ws://`

**No microphone access:**
- Must be on HTTPS (Netlify provides this automatically)
- Check browser permissions

**Audio doesn't play:**
- Check ElevenLabs API key is set in Railway
- Check browser console for audio decode errors
- iOS: Make sure user tapped something first (audio unlock)

**Railway build fails:**
- Make sure you're deploying from the `server` directory, not root
- Check Railway build logs for TypeScript errors
