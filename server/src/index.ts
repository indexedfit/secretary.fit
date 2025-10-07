// Load env vars FIRST before any other imports
import './config/env.js'
import { WebSocketServer } from 'ws'
import { handleConnection } from './handlers/websocket.js'
import https from 'https'
import http from 'http'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = process.env.PORT || 3001

// Check for SSL certificates (for HTTPS/WSS support)
const certPath = join(__dirname, '../../client/.cert/cert.pem')
const keyPath = join(__dirname, '../../client/.cert/key.pem')
const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath)

let server: http.Server | https.Server

if (hasSSL) {
  // Create HTTPS server for WSS support
  const httpsServer = https.createServer({
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  })

  httpsServer.listen(PORT, '0.0.0.0')
  server = httpsServer

  console.log(`🔒 HTTPS server running on https://0.0.0.0:${PORT}`)
  console.log(`🔒 WSS server running on wss://0.0.0.0:${PORT}`)
  console.log(`   Connect locally:  wss://localhost:${PORT}`)
  console.log(`   Connect on LAN:   wss://YOUR_LOCAL_IP:${PORT}`)
} else {
  // Create HTTP server for WS support (no SSL)
  const httpServer = http.createServer()
  httpServer.listen(PORT, '0.0.0.0')
  server = httpServer

  console.log(`WebSocket server is running on ws://0.0.0.0:${PORT}`)
  console.log(`Connect locally:  ws://localhost:${PORT}`)
  console.log(`Connect on LAN:   ws://YOUR_LOCAL_IP:${PORT}`)
}

// Attach WebSocket server to HTTP/HTTPS server
const wss = new WebSocketServer({ server })

wss.on('connection', handleConnection)

wss.on('error', (error) => {
  console.error('WebSocket server error:', error)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  wss.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
