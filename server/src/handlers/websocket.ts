import { WebSocket } from 'ws'
import { claudeAgentService } from '../services/claude.js'
import { groqService } from '../services/groq.js'
import type { ClientMessage, ServerMessage } from '../types/messages.js'
import { randomUUID } from 'crypto'

// Store user sessions by WebSocket connection
const userSessions = new WeakMap<WebSocket, { userId: string; sessionId?: string }>()

export function handleConnection(ws: WebSocket) {
  // Generate unique user ID for this connection
  const userId = randomUUID()
  userSessions.set(ws, { userId })

  console.log(`Client connected: ${userId}`)

  ws.on('message', async (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString())

      switch (message.type) {
        case 'message':
          if (message.content) {
            await handleUserMessage(ws, message.content)
          }
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
    console.log(`Client disconnected: ${userId}`)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })

  // Send welcome message with user ID
  ws.send(
    JSON.stringify({
      type: 'system_init',
      content: `Connected to secretary.fit`,
      data: { userId },
    } as ServerMessage)
  )
}

/**
 * Determine if Agent is needed based on user request
 */
function needsAgent(userMessage: string): boolean {
  const lowerMessage = userMessage.toLowerCase()

  // Keywords that indicate Agent is needed
  const agentKeywords = [
    'create', 'make', 'write', 'generate',  // File creation
    'file', 'folder', 'directory',          // File operations
    'read', 'open', 'show', 'display',      // File reading (sometimes)
    'edit', 'modify', 'update', 'change',   // File editing
    'delete', 'remove', 'rm',               // File deletion
    'run', 'execute', 'bash', 'command',    // Code execution
    'search', 'find', 'grep', 'look for',   // File search
    'list', 'ls', 'show files',             // Directory listing
    'install', 'npm', 'pip',                // Package management
    'git', 'commit', 'push', 'pull',        // Git operations
  ]

  return agentKeywords.some(keyword => lowerMessage.includes(keyword))
}

async function handleUserMessage(ws: WebSocket, content: string) {
  const session = userSessions.get(ws)
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', content: 'Session not found' }))
    return
  }

  try {
    // Step 1: GROQ provides immediate acknowledgment
    const groqResponse = await groqService.generateResponse(content)
    ws.send(
      JSON.stringify({
        type: 'groq_response',
        content: groqResponse,
      } as ServerMessage)
    )

    // Step 2: Only run Agent if needed (for file ops, code execution, etc.)
    if (needsAgent(content)) {
      for await (const agentMsg of claudeAgentService.executeAgent(session.userId, content, {
        sessionId: session.sessionId,
      })) {
        ws.send(JSON.stringify({
          type: 'agent_' + agentMsg.type,
          content: agentMsg.content,
          data: agentMsg.data,
        }))

        // Store session ID for conversation continuity
        if (agentMsg.data?.session_id) {
          session.sessionId = agentMsg.data.session_id
        }
      }
    }
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
