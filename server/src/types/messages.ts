export interface ClientMessage {
  type: 'message' | 'ping'
  content?: string
}

export interface ServerMessage {
  type: 'message' | 'error' | 'pong'
  content?: string
}
