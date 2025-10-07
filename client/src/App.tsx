import { useState } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis'

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
  const [conversation, setConversation] = useState<Message[]>([])
  const [files, setFiles] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [agentStatus, setAgentStatus] = useState<string>('')

  const { sendMessage, isConnected } = useWebSocket({
    url: 'ws://localhost:3001',
    onMessage: (data) => {
      // Handle different message types
      if (data.type === 'groq_response') {
        // GROQ's immediate response
        setConversation(prev => [...prev, {
          role: 'assistant',
          content: data.content,
          type: 'groq'
        }])
        speak(data.content)
      } else if (data.type === 'agent_assistant') {
        // Agent's actual response
        setConversation(prev => [...prev, {
          role: 'agent',
          content: data.content,
          type: 'agent_thinking'
        }])
        setAgentStatus('Processing...')

        // Extract file operations from agent messages
        extractFileInfo(data.content)
      } else if (data.type === 'agent_result') {
        // Final result from agent
        setConversation(prev => [...prev, {
          role: 'agent',
          content: data.content,
          type: 'agent_result'
        }])
        setAgentStatus('')

        // Extract file info from result
        extractFileInfo(data.content)
      } else if (data.type === 'message') {
        // Fallback for generic messages
        setConversation(prev => [...prev, {
          role: 'assistant',
          content: data.content
        }])
        speak(data.content)
      }
    },
  })

  const { speak, speaking, voices } = useSpeechSynthesis()
  const { listening, transcript, startListening, stopListening } = useSpeechRecognition({
    onResult: (text) => {
      setMessage(text)
    },
  })

  const extractFileInfo = (content: string) => {
    // Extract file contents from messages (basic parsing)
    // Look for patterns like "created file X" or "content: ..."
    const fileCreatedMatch = content.match(/created?\s+(?:file|a file)\s+(?:named\s+)?['"]?([^'":\s]+)['"]?/i)
    if (fileCreatedMatch) {
      const fileName = fileCreatedMatch[1]
      if (!files.find(f => f.name === fileName)) {
        setFiles(prev => [...prev, { name: fileName, content: '[File created]' }])
      }
    }

    // Extract file read content
    const fileContentMatch = content.match(/(?:content|contains?):\s*['"]?([^'"]+)['"]?/i)
    if (fileContentMatch && files.length > 0) {
      const lastFile = files[files.length - 1]
      setFiles(prev => prev.map(f =>
        f.name === lastFile.name
          ? { ...f, content: fileContentMatch[1] }
          : f
      ))
    }
  }

  const handleSend = () => {
    if (!message.trim()) return

    setConversation(prev => [...prev, { role: 'user', content: message }])
    sendMessage({ type: 'message', content: message })
    setMessage('')
  }

  const handleVoiceInput = () => {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>secretary.fit</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.875rem'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4CAF50' : '#f44336',
                marginRight: '0.5rem',
                display: 'inline-block'
              }}></span>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {agentStatus && (
              <span style={{
                fontSize: '0.875rem',
                color: '#4CAF50',
                fontWeight: 500
              }}>
                🤖 {agentStatus}
              </span>
            )}
          </div>
        </div>

        {/* Conversation */}
        <div style={{
          flex: 1,
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          overflowY: 'auto',
          backgroundColor: '#fafafa'
        }}>
          {conversation.map((msg, idx) => (
            <div key={idx} style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor:
                msg.role === 'user' ? '#e3f2fd' :
                msg.role === 'agent' ? '#e8f5e9' :
                '#ffffff',
              borderRadius: '8px',
              borderLeft: msg.role === 'agent' ? '4px solid #4CAF50' :
                          msg.role === 'user' ? '4px solid #2196F3' : 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#666',
                marginBottom: '0.25rem',
                fontWeight: 500,
                textTransform: 'uppercase'
              }}>
                {msg.role === 'user' ? '👤 You' :
                 msg.role === 'agent' ? '🤖 Agent' :
                 '💬 Assistant'}
                {msg.type === 'agent_result' && ' • Final Result'}
              </div>
              <div>{msg.content}</div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div>
          {listening && (
            <div style={{
              marginBottom: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#fff3cd',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              🎤 Listening... {transcript}
            </div>
          )}

          {speaking && (
            <div style={{
              marginBottom: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#d1ecf1',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              🔊 Speaking...
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              style={{ flex: 1, padding: '0.75rem', fontSize: '1rem' }}
            />
            <button onClick={handleSend} disabled={!isConnected}>
              Send
            </button>
            <button
              onClick={handleVoiceInput}
              style={{
                backgroundColor: listening ? '#f44336' : '#4CAF50',
                color: 'white',
                minWidth: '80px'
              }}
            >
              {listening ? '🎤 Stop' : '🎤 Talk'}
            </button>
          </div>

          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#666'
          }}>
            Available voices: {voices.length} | Transcript: {transcript || 'None'}
          </div>
        </div>
      </div>

      {/* Workspace Sidebar */}
      <div style={{
        width: '400px',
        borderLeft: '1px solid #ccc',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column'
      }}>
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
