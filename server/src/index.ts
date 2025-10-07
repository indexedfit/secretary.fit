// Load env vars FIRST before any other imports
import './config/env.js'
import { WebSocketServer } from 'ws'
import { handleConnection } from './handlers/websocket.js'

const PORT = process.env.PORT || 3001

const wss = new WebSocketServer({ port: Number(PORT) })

console.log(`WebSocket server is running on ws://localhost:${PORT}`)

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
