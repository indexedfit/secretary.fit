export interface ClientMessage {
  type: 'message' | 'ping' | 'audio_chunk' | 'audio_start' | 'audio_end' | 'identify' | 'fetch_file'
  content?: string
  audioData?: ArrayBuffer
  mimeType?: string
  userId?: string
}

export interface ServerMessage {
  type: 'message' | 'error' | 'pong' | 'groq_response' | 'system_init' | 'agent_assistant' | 'agent_result' | 'agent_system_init' | 'agent_system' | 'transcription' | 'tts_audio' | 'file_content'
  content?: string
  data?: any
  audioData?: ArrayBuffer
  isFinal?: boolean
}
