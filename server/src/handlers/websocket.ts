import { WebSocket } from 'ws'
import { claudeAgentService } from '../services/claude.js'
import { groqService } from '../services/groq.js'
import { whisperService } from '../services/whisper.js'
import { ttsService } from '../services/tts.js'
import type { ClientMessage, ServerMessage } from '../types/messages.js'
import { randomUUID } from 'crypto'

// Store user sessions by WebSocket connection
const userSessions = new WeakMap<WebSocket, {
  userId: string
  sessionId?: string
  audioChunks: Buffer[]
}>()

export function handleConnection(ws: WebSocket) {
  // Generate unique user ID for this connection
  const userId = randomUUID()
  userSessions.set(ws, { userId, audioChunks: [] })

  console.log(`Client connected: ${userId}`)

  ws.on('message', async (data) => {
    try {
      // Try to parse as JSON first (text messages)
      const dataString = data.toString()

      try {
        const message: ClientMessage = JSON.parse(dataString)
        console.log(`📨 [Message] Type: ${message.type}, Content: ${message.content?.substring(0, 50) || 'N/A'}`)

        switch (message.type) {
          case 'message':
            if (message.content) {
              console.log(`💬 Processing text message: "${message.content}"`)
              await handleUserMessage(ws, message.content)
            }
            break

          case 'audio_start':
            console.log('🎙️ Audio recording START')
            await handleAudioStart(ws)
            break

          case 'audio_end':
            console.log('🛑 Audio recording STOP - will transcribe')
            await handleAudioEnd(ws)
            break

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }))
            break

          default:
            console.warn('⚠️ Unknown message type:', message)
        }
      } catch (parseError) {
        // Not JSON - must be binary audio data
        console.log(`📦 [Binary Audio] Received ${(data as Buffer).length} bytes`)
        await handleBinaryMessage(ws, data as Buffer)
      }
    } catch (error) {
      console.error('❌ Error handling message:', error)
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

/**
 * Handle binary audio chunks from client
 */
async function handleBinaryMessage(ws: WebSocket, data: Buffer) {
  const session = userSessions.get(ws)
  if (!session) return

  // Accumulate audio chunks
  session.audioChunks.push(data)
  // Only log every 10th chunk to reduce spam
  const totalChunks = session.audioChunks.length
  if (totalChunks % 10 === 0) {
    const totalBytes = session.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    console.log(`🎙️ Audio: ${totalChunks} chunks, ${totalBytes} bytes total`)
  }
}

/**
 * Handle audio recording start
 */
async function handleAudioStart(ws: WebSocket) {
  const session = userSessions.get(ws)
  if (!session) return

  // Clear any previous audio chunks
  session.audioChunks = []
  console.log('Audio recording started')
}

/**
 * Handle audio recording end - transcribe and process
 */
async function handleAudioEnd(ws: WebSocket) {
  const session = userSessions.get(ws)
  if (!session) return

  try {
    // Concatenate all audio chunks
    const audioBuffer = Buffer.concat(session.audioChunks)
    console.log(`🎤 Transcribing ${audioBuffer.length} bytes of audio (${session.audioChunks.length} chunks)...`)

    // Transcribe using Whisper
    const transcription = await whisperService.transcribe(audioBuffer)
    console.log(`✅ Transcription: "${transcription}"`)

    // Send transcription to client
    ws.send(
      JSON.stringify({
        type: 'transcription',
        content: transcription,
        isFinal: true,
      } as ServerMessage)
    )

    // Clear audio chunks
    session.audioChunks = []

    // Process the transcription as a normal message
    if (transcription) {
      console.log(`📤 Processing transcription as message...`)
      await handleUserMessage(ws, transcription)
    }
  } catch (error) {
    console.error('❌ Error transcribing audio:', error)
    ws.send(
      JSON.stringify({
        type: 'error',
        content: 'Failed to transcribe audio',
      } as ServerMessage)
    )
    session.audioChunks = []
  }
}

async function handleUserMessage(ws: WebSocket, content: string) {
  const session = userSessions.get(ws)
  if (!session) {
    console.error('❌ Session not found!')
    ws.send(JSON.stringify({ type: 'error', content: 'Session not found' }))
    return
  }

  try {
    console.log(`🤖 Sending to GROQ: "${content}"`)
    // Step 1: GROQ provides immediate acknowledgment
    const groqResponse = await groqService.generateResponse(content)
    console.log(`✅ GROQ response: "${groqResponse.substring(0, 100)}..."`)
    ws.send(
      JSON.stringify({
        type: 'groq_response',
        content: groqResponse,
      } as ServerMessage)
    )

    // Step 1.5: Generate TTS audio with ElevenLabs
    try {
      const audioBuffer = await ttsService.synthesize(groqResponse)

      // Send audio as base64
      ws.send(
        JSON.stringify({
          type: 'tts_audio',
          data: audioBuffer.toString('base64'),
        } as ServerMessage)
      )
    } catch (ttsError) {
      console.error('⚠️  TTS error (continuing anyway):', ttsError)
      // Don't fail the whole request if TTS fails
    }

    // Step 2: Only run Agent if needed (for file ops, code execution, etc.)
    if (needsAgent(content)) {
      console.log(`🔧 Agent needed - executing...`)
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
      console.log(`✅ Agent completed`)
    } else {
      console.log(`⏭️ Agent not needed for: "${content}"`)
    }
  } catch (error) {
    console.error('❌ Error generating response:', error)
    ws.send(
      JSON.stringify({
        type: 'error',
        content: 'Failed to generate response',
      } as ServerMessage)
    )
  }
}
