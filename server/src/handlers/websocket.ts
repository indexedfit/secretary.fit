import { WebSocket } from 'ws'
import { claudeService } from '../services/claude.js'
import { groqService } from '../services/groq.js'
import type { ClientMessage, ServerMessage } from '../types/messages.js'

export function handleConnection(ws: WebSocket) {
  console.log('Client connected')

  ws.on('message', async (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString())

      switch (message.type) {
        case 'message':
          await handleUserMessage(ws, message.content)
          break

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }))
          break

        default:
          console.warn('Unknown message type:', message)
      }
    } catch (error) {
      console.error('Error handling message:', error)
      ws.send(
        JSON.stringify({
          type: 'error',
          content: 'Failed to process message',
        } as ServerMessage)
      )
    }
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: 'message',
      content: 'Connected to secretary.fit server',
    } as ServerMessage)
  )
}

async function handleUserMessage(ws: WebSocket, content: string) {
  try {
    // Use GROQ for fast inference (you can switch to Claude for more complex tasks)
    const useGroq = true // Change this logic based on your needs

    let response: string

    if (useGroq) {
      response = await groqService.generateResponse(content)
    } else {
      response = await claudeService.generateResponse(content)
    }

    ws.send(
      JSON.stringify({
        type: 'message',
        content: response,
      } as ServerMessage)
    )
  } catch (error) {
    console.error('Error generating response:', error)
    ws.send(
      JSON.stringify({
        type: 'error',
        content: 'Failed to generate response',
      } as ServerMessage)
    )
  }
}
