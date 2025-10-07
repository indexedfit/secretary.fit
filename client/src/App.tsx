import { useState, useEffect, useRef } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useAudioRecording } from './hooks/useAudioRecording'
import { useAudioPlayback } from './hooks/useAudioPlayback'
import { useVoiceState } from './hooks/useVoiceState'
import { AudioVisualizer } from './components/AudioVisualizer'
import { BottomSheet } from './components/BottomSheet'
import './App.mobile.css'

interface Message {
  role: 'user' | 'assistant' | 'agent'
  content: string
  type?: string
}

interface FileInfo {
  name: string
  content: string
  path?: string
}

function App() {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<Message[]>(() => {
    // Load conversation from localStorage on mount
    const saved = localStorage.getItem('secretary-conversation')
    return saved ? JSON.parse(saved) : []
  })
  const [files, setFiles] = useState<FileInfo[]>(() => {
    // Load files from localStorage on mount
    const saved = localStorage.getItem('secretary-files')
    return saved ? JSON.parse(saved) : []
  })
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [agentStatus, setAgentStatus] = useState<string>('')
  const [transcribedText, setTranscribedText] = useState<string>('')
  const [isFileSheetOpen, setIsFileSheetOpen] = useState(false)
  const conversationEndRef = useRef<HTMLDivElement>(null)

  // Voice state machine
  const voiceState = useVoiceState()

  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('secretary-conversation', JSON.stringify(conversation))
  }, [conversation])

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  // Save files to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('secretary-files', JSON.stringify(files))
  }, [files])

  const { sendMessage, sendBinary, isConnected } = useWebSocket({
    url: 'ws://localhost:3001',
    onMessage: (data) => {
      // Handle different message types
      if (data.type === 'system_init') {
        // Just connection message, don't display
        return
      } else if (data.type === 'groq_response') {
        // GROQ's immediate response
        if (data.content && data.content.trim()) {
          console.log(`📨 GROQ response received`)
          voiceState.startThinking()
          setConversation(prev => [...prev, {
            role: 'assistant',
            content: data.content,
            type: 'groq'
          }])
          // TTS audio will come separately
        }
      } else if (data.type === 'agent_assistant') {
        // Show tool uses as progress indicators
        if (data.data?.tool_uses && data.data.tool_uses.length > 0) {
          voiceState.startAgentWork()
          const toolNames = data.data.tool_uses.map((t: any) => {
            const icon =
              t.name === 'Write' ? '✏️' :
              t.name === 'Read' ? '📖' :
              t.name === 'Bash' ? '⚙️' :
              t.name === 'Edit' ? '✏️' :
              t.name === 'Glob' ? '🔍' :
              t.name === 'Grep' ? '🔎' : '🔧'
            return `${icon} ${t.name}`
          }).join(', ')
          setAgentStatus(toolNames)
        }

        // Only show assistant messages if they have unique content (avoid duplicates with result)
        // Skip for now - we'll show in result
        extractFileInfo(data.content)
      } else if (data.type === 'agent_result') {
        // Final result from agent
        if (data.content && data.content.trim()) {
          setConversation(prev => [...prev, {
            role: 'agent',
            content: data.content,
            type: 'agent_result'
          }])
          setAgentStatus('')
          voiceState.reset()
          extractFileInfo(data.content)
        }
      } else if (data.type === 'transcription') {
        // Whisper transcription result
        if (data.content) {
          setTranscribedText(data.content)
          setMessage(data.content)
          voiceState.startThinking()
          console.log('✅ Transcription:', data.content)
        }
      } else if (data.type === 'tts_audio') {
        // Server-generated TTS audio - comes as base64
        if (data.data) {
          console.log('🔊 Received TTS audio, playing...')
          voiceState.startSpeaking()
          // Convert base64 to ArrayBuffer
          const binaryString = atob(data.data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          playAudio(bytes.buffer)
        }
      }
    },
  })

  // Audio playback for server-generated TTS
  const { playAudio, isPlaying: isSpeaking, getAnalyser, stop: stopAudio } = useAudioPlayback()

  // Update voice state when playback ends
  useEffect(() => {
    if (!isSpeaking && voiceState.state === 'speaking') {
      voiceState.reset()
    }
  }, [isSpeaking, voiceState])

  // Whisper-based audio recording
  const { isRecording, startRecording, stopRecording } = useAudioRecording({
    onDataAvailable: (audioBlob) => {
      sendBinary(audioBlob)
    },
    chunkInterval: 100,
  })

  const extractFileInfo = (content: string) => {
    if (!content) return

    // Extract file operations from messages
    // Match patterns: "created hello.txt", "Created test.txt", "Done! Created test.txt"
    const fileCreatedMatch = content.match(/(?:created?|made|wrote)\s+(?:file\s+)?(?:named\s+)?[`'"]?([a-zA-Z0-9_.-]+\.(?:txt|js|ts|json|md|py|html|css|sh|yml|yaml))[`'"]?/i)

    if (fileCreatedMatch) {
      const fileName = fileCreatedMatch[1]

      // Use functional update to prevent race conditions
      setFiles(prev => {
        if (prev.find(f => f.name === fileName)) {
          return prev // Already exists
        }
        return [...prev, { name: fileName, content: '[File created - click to load]' }]
      })
    }

    // Extract file content: with "Hello World" or with content "..."
    const contentMatch = content.match(/with\s+(?:the\s+)?(?:content\s+)?[`'"]([^`'"]+)[`'"]/i)
    if (contentMatch) {
      setFiles(prev => {
        if (prev.length === 0) return prev

        const lastFile = prev[prev.length - 1]
        if (lastFile.content === contentMatch[1]) {
          return prev // Content unchanged
        }

        return prev.map(f =>
          f.name === lastFile.name
            ? { ...f, content: contentMatch[1] }
            : f
        )
      })
    }
  }

  const handleSend = () => {
    if (!message.trim()) return

    setConversation(prev => [...prev, { role: 'user', content: message }])
    sendMessage({ type: 'message', content: message })
    setMessage('')
  }

  const handleVoiceInput = () => {
    // Handle interruption during speaking or agent work
    if (voiceState.canInterrupt()) {
      stopAudio()
      voiceState.reset()
      return
    }

    // Use Whisper-based recording
    if (isRecording) {
      stopRecording()
      voiceState.stopRecording()
      // Send end signal to trigger transcription
      sendMessage({ type: 'audio_end' })
    } else if (voiceState.canRecord()) {
      setTranscribedText('')
      // Send start signal
      sendMessage({ type: 'audio_start' })
      startRecording()
      voiceState.startRecording()
    }
  }

  const handleClearAll = () => {
    if (confirm('Clear all conversation history and files?')) {
      setConversation([])
      setFiles([])
      setSelectedFile(null)
      localStorage.removeItem('secretary-conversation')
      localStorage.removeItem('secretary-files')
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="app-title">secretary.fit</h1>
          <button
            onClick={handleClearAll}
            style={{
              padding: '8px 12px',
              fontSize: '0.75rem',
              backgroundColor: '#FF3B30',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            🗑️ Clear
          </button>
        </div>
        <div className="status-bar">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#34C759' : '#FF3B30',
            }}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {conversation.length > 0 && (
            <span style={{ color: '#999', fontSize: '0.75rem' }}>
              💾 Auto-saved
            </span>
          )}
        </div>
      </div>

      {/* Agent Status (floating) */}
      {agentStatus && (
        <div className="agent-status">
          🤖 {agentStatus}
        </div>
      )}

      {/* Conversation */}
      <div className="conversation-container">
        {conversation.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#999',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎙️</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '8px' }}>
              Welcome to secretary.fit
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              Tap the button below to start speaking
            </div>
          </div>
        ) : (
          <>
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`message message-${msg.role}`}
                style={{
                  display: msg.role === 'user' ? 'block' : 'flex',
                  marginLeft: msg.role === 'user' ? 'auto' : '0',
                  marginRight: msg.role === 'user' ? '0' : 'auto',
                }}
              >
                {msg.content}
              </div>
            ))}
            <div ref={conversationEndRef} />
          </>
        )}
      </div>

      {/* Voice Control */}
      <div className="voice-control-container">
        {/* Audio Visualizer */}
        <div className="visualizer-wrapper">
          <AudioVisualizer
            analyser={getAnalyser()}
            isActive={isSpeaking}
            width={Math.min(window.innerWidth - 64, 400)}
            height={80}
            barCount={40}
            barColor="#34C759"
          />
        </div>

        {/* Voice Button */}
        <button
          onClick={handleVoiceInput}
          className="voice-button"
          style={{
            backgroundColor: voiceState.getStateColor(),
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>{voiceState.getStateIcon()}</span>
          <span>{voiceState.getStateLabel()}</span>
        </button>

        {/* Status Info */}
        <div style={{
          fontSize: '0.75rem',
          color: '#999',
          textAlign: 'center'
        }}>
          {transcribedText ? (
            <div>Last: "{transcribedText}"</div>
          ) : (
            <div>Powered by Groq Whisper & ElevenLabs</div>
          )}
        </div>
      </div>

      {/* File Peek Button (Mobile) */}
      {files.length > 0 && (
        <div
          className="file-peek"
          onClick={() => setIsFileSheetOpen(true)}
        >
          📁
          <div className="file-badge">{files.length}</div>
        </div>
      )}

      {/* Bottom Sheet for Files */}
      <BottomSheet
        isOpen={isFileSheetOpen}
        onClose={() => setIsFileSheetOpen(false)}
        title="📁 Workspace Files"
        snapPoints={[40, 70, 90]}
      >
        {files.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#999',
            padding: '40px 20px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📂</div>
            <div>No files yet</div>
            <div style={{ fontSize: '0.875rem', marginTop: '8px' }}>
              Try saying: "create a file named test.txt"
            </div>
          </div>
        ) : (
          <div>
            {files.map((file, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedFile(file)}
                style={{
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: selectedFile?.name === file.name ? '#007AFF' : '#f5f5f5',
                  color: selectedFile?.name === file.name ? 'white' : '#000',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📄</span>
                  <span>{file.name}</span>
                </div>
                {selectedFile?.name === file.name ? (
                  <pre style={{
                    margin: 0,
                    marginTop: '12px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}>
                    {file.content}
                  </pre>
                ) : (
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    {file.content.length > 50
                      ? file.content.substring(0, 50) + '...'
                      : file.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* Desktop Sidebar (hidden on mobile) */}
      <div style={{
        width: '400px',
        borderLeft: '1px solid #ccc',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column'
      }}
        className="desktop-sidebar"
      >
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #ccc',
          backgroundColor: '#ffffff'
        }}>
          <h3 style={{ margin: 0 }}>📁 Workspace</h3>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            Files created by Agent
          </div>
        </div>

        {/* File List */}
        <div style={{
          flex: files.length > 0 && selectedFile ? '0 0 150px' : '1',
          overflowY: 'auto',
          padding: '1rem'
        }}>
          {files.length === 0 ? (
            <div style={{
              color: '#999',
              fontSize: '0.875rem',
              textAlign: 'center',
              padding: '2rem 1rem'
            }}>
              No files yet. Try asking:<br/>
              <code style={{
                display: 'block',
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                fontSize: '0.75rem'
              }}>
                "create a file named test.txt"
              </code>
            </div>
          ) : (
            <div>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedFile(file)}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    backgroundColor: selectedFile?.name === file.name ? '#e3f2fd' : '#ffffff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: selectedFile?.name === file.name ? '2px solid #2196F3' : '1px solid #ddd',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                    📄 {file.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    {file.content.length > 30
                      ? file.content.substring(0, 30) + '...'
                      : file.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Viewer */}
        {selectedFile && (
          <div style={{
            borderTop: '1px solid #ccc',
            backgroundColor: '#ffffff',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <div style={{
              padding: '0.75rem',
              borderBottom: '1px solid #eee',
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>📄 {selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0 0.5rem'
                }}
              >
                ×
              </button>
            </div>
            <pre style={{
              flex: 1,
              margin: 0,
              padding: '1rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              backgroundColor: '#f8f8f8',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {selectedFile.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
