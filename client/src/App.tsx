import { useState } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis'

function App() {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([])

  const { sendMessage, isConnected } = useWebSocket({
    url: 'ws://localhost:3001',
    onMessage: (data) => {
      setConversation(prev => [...prev, { role: 'assistant', content: data.content }])
      speak(data.content)
    },
  })

  const { speak, speaking, voices } = useSpeechSynthesis()
  const { listening, transcript, startListening, stopListening } = useSpeechRecognition({
    onResult: (text) => {
      setMessage(text)
    },
  })

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
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>secretary.fit</h1>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        minHeight: '300px',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {conversation.map((msg, idx) => (
          <div key={idx} style={{
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
            borderRadius: '4px'
          }}>
            <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button onClick={handleSend} disabled={!isConnected}>
          Send
        </button>
        <button
          onClick={handleVoiceInput}
          style={{
            backgroundColor: listening ? '#f44336' : '#4CAF50',
            color: 'white'
          }}
        >
          {listening ? '🎤 Stop' : '🎤 Talk'}
        </button>
      </div>

      {listening && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
          Listening... {transcript}
        </div>
      )}

      {speaking && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#d1ecf1', borderRadius: '4px' }}>
          Speaking...
        </div>
      )}

      <div style={{ fontSize: '0.875rem', color: '#666' }}>
        <p>Available voices: {voices.length}</p>
        <p>Transcript: {transcript || 'None'}</p>
      </div>
    </div>
  )
}

export default App
