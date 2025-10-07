import { useState, useCallback, useEffect } from 'react'

/**
 * Voice interaction states
 */
export type VoiceState =
  | 'idle'                // Not recording or speaking
  | 'recording'           // User is speaking
  | 'processing'          // Transcribing audio
  | 'thinking'            // AI is generating response
  | 'speaking'            // AI is speaking
  | 'agent_working'       // Agent SDK is executing tools

interface VoiceStateConfig {
  onStateChange?: (state: VoiceState) => void
}

/**
 * Manages voice interaction state machine
 * Controls transitions between idle, recording, processing, speaking, and agent_working states
 */
export function useVoiceState({ onStateChange }: VoiceStateConfig = {}) {
  const [state, setState] = useState<VoiceState>('idle')

  // Notify on state changes
  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  const startRecording = useCallback(() => {
    setState('recording')
  }, [])

  const stopRecording = useCallback(() => {
    setState('processing')
  }, [])

  const startThinking = useCallback(() => {
    setState('thinking')
  }, [])

  const startSpeaking = useCallback(() => {
    setState('speaking')
  }, [])

  const startAgentWork = useCallback(() => {
    setState('agent_working')
  }, [])

  const reset = useCallback(() => {
    setState('idle')
  }, [])

  /**
   * Get user-facing label for current state
   */
  const getStateLabel = useCallback((): string => {
    switch (state) {
      case 'idle':
        return 'Tap to speak'
      case 'recording':
        return 'Listening...'
      case 'processing':
        return 'Processing...'
      case 'thinking':
        return 'Thinking...'
      case 'speaking':
        return 'Tap to interrupt'
      case 'agent_working':
        return 'Working...'
      default:
        return 'Ready'
    }
  }, [state])

  /**
   * Get emoji icon for current state
   */
  const getStateIcon = useCallback((): string => {
    switch (state) {
      case 'idle':
        return '🎙️'
      case 'recording':
        return '🔴'
      case 'processing':
        return '⏳'
      case 'thinking':
        return '💭'
      case 'speaking':
        return '🔊'
      case 'agent_working':
        return '🤖'
      default:
        return '🎙️'
    }
  }, [state])

  /**
   * Get color for current state
   */
  const getStateColor = useCallback((): string => {
    switch (state) {
      case 'idle':
        return '#4CAF50'
      case 'recording':
        return '#f44336'
      case 'processing':
        return '#FF9800'
      case 'thinking':
        return '#2196F3'
      case 'speaking':
        return '#9C27B0'
      case 'agent_working':
        return '#00BCD4'
      default:
        return '#4CAF50'
    }
  }, [state])

  /**
   * Check if user can interrupt (during speaking or agent_working)
   */
  const canInterrupt = useCallback((): boolean => {
    return state === 'speaking' || state === 'agent_working'
  }, [state])

  /**
   * Check if user can start recording
   */
  const canRecord = useCallback((): boolean => {
    return state === 'idle'
  }, [state])

  /**
   * Check if system is busy (processing, thinking, speaking, agent_working)
   */
  const isBusy = useCallback((): boolean => {
    return state !== 'idle' && state !== 'recording'
  }, [state])

  return {
    state,
    startRecording,
    stopRecording,
    startThinking,
    startSpeaking,
    startAgentWork,
    reset,
    getStateLabel,
    getStateIcon,
    getStateColor,
    canInterrupt,
    canRecord,
    isBusy,
  }
}
