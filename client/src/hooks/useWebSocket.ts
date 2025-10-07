import { useEffect, useRef, useState } from 'react'

interface UseWebSocketOptions {
  url: string
  onMessage?: (data: any) => void
  onConnect?: () => void
  onError?: (error: Event) => void
  reconnectInterval?: number
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onError,
  reconnectInterval = 3000
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = () => {
    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        onConnect?.()
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)

        // Attempt to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, reconnectInterval)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        onError?.(error)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // Pass ALL message types to the handler
          onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [url])

  const sendMessage = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.error('WebSocket is not connected')
    }
  }

  const sendBinary = (data: Blob | ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const size = data instanceof Blob ? data.size : data.byteLength
      console.log(`🔌 Sending binary data: ${size} bytes`)
      wsRef.current.send(data)
    } else {
      console.error('❌ WebSocket is not connected, cannot send binary data')
    }
  }

  return {
    isConnected,
    sendMessage,
    sendBinary,
  }
}
