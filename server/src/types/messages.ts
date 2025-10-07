export interface ClientMessage {
  type: 'message' | 'ping'
  content?: string
}

export interface ServerMessage {
  type: 'message' | 'error' | 'pong' | 'groq_response' | 'agent_assistant' | 'agent_result' | 'agent_system_init' | 'agent_system'
  content?: string
  data?: any
}
