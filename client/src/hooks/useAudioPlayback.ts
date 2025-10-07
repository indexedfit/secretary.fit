import { useRef, useState, useCallback } from 'react'

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  /**
   * Initialize AudioContext (must be done after user interaction)
   */
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error)
        setIsSupported(false)
      }
    }
  }, [])

  /**
   * Play audio from ArrayBuffer
   */
  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    try {
      // Initialize context if needed
      initAudioContext()

      if (!audioContextRef.current) {
        throw new Error('AudioContext not available')
      }

      // Resume context if suspended (required by some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)

      // Stop any currently playing audio
      stop()

      // Create and configure source
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)

      // Track when playback ends
      source.onended = () => {
        setIsPlaying(false)
        currentSourceRef.current = null
      }

      // Start playback
      source.start(0)
      currentSourceRef.current = source
      setIsPlaying(true)

      console.log(`Playing ${audioBuffer.duration.toFixed(2)}s of audio`)
    } catch (error) {
      console.error('Failed to play audio:', error)
      setIsPlaying(false)
      throw error
    }
  }, [initAudioContext])

  /**
   * Play audio from Blob
   */
  const playBlob = useCallback(async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer()
    return playAudio(arrayBuffer)
  }, [playAudio])

  /**
   * Stop currently playing audio
   */
  const stop = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch (error) {
        // Ignore errors if already stopped
      }
      currentSourceRef.current = null
    }
    setIsPlaying(false)
  }, [])

  /**
   * Cleanup audio context
   */
  const cleanup = useCallback(async () => {
    stop()
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [stop])

  return {
    isPlaying,
    isSupported,
    playAudio,
    playBlob,
    stop,
    cleanup,
  }
}
