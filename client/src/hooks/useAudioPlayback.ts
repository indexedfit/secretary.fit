import { useRef, useState, useCallback } from 'react'

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const isUnlockedRef = useRef(false)

  /**
   * Initialize AudioContext (must be done after user interaction)
   */
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

        // Create analyser node for visualization
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        analyserRef.current.smoothingTimeConstant = 0.8

        console.log('AudioContext initialized:', audioContextRef.current.state)
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error)
        setIsSupported(false)
      }
    }
  }, [])

  /**
   * Unlock audio on iOS Safari (requires user interaction)
   */
  const unlockAudio = useCallback(async () => {
    if (isUnlockedRef.current) return

    initAudioContext()

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        // Play a silent buffer to unlock audio on iOS
        const buffer = audioContextRef.current.createBuffer(1, 1, 22050)
        const source = audioContextRef.current.createBufferSource()
        source.buffer = buffer
        source.connect(audioContextRef.current.destination)
        source.start(0)

        await audioContextRef.current.resume()
        isUnlockedRef.current = true
        console.log('Audio unlocked for iOS')
      } catch (error) {
        console.error('Failed to unlock audio:', error)
      }
    } else {
      isUnlockedRef.current = true
    }
  }, [initAudioContext])

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
   * Play audio from ArrayBuffer
   */
  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    try {
      // Unlock audio on first interaction (iOS Safari)
      await unlockAudio()

      if (!audioContextRef.current) {
        throw new Error('AudioContext not available')
      }

      console.log(`AudioContext state before resume: ${audioContextRef.current.state}`)

      // ALWAYS resume context on iOS Safari - this is critical
      if (audioContextRef.current.state !== 'running') {
        console.log('AudioContext not running, resuming...')
        await audioContextRef.current.resume()
        console.log(`AudioContext after resume: ${audioContextRef.current.state}`)
      }

      // Decode audio data
      console.log(`🎵 Decoding audio: ${audioData.byteLength} bytes`)
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)
      console.log(`✅ Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels, sample rate: ${audioBuffer.sampleRate}`)

      // Stop any currently playing audio
      stop()

      // Resume AGAIN right before playing (iOS Safari workaround)
      if (audioContextRef.current.state !== 'running') {
        await audioContextRef.current.resume()
        console.log('Final resume before play')
      }

      // Create and configure source
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer

      // Connect through analyser for visualization
      if (analyserRef.current) {
        source.connect(analyserRef.current)
        analyserRef.current.connect(audioContextRef.current.destination)
      } else {
        source.connect(audioContextRef.current.destination)
      }

      // Track when playback ends
      source.onended = () => {
        console.log('Audio playback ended')
        setIsPlaying(false)
        currentSourceRef.current = null
      }

      // Start playback
      console.log(`Starting playback NOW - context state: ${audioContextRef.current.state}`)
      source.start(0)
      currentSourceRef.current = source
      setIsPlaying(true)

      console.log(`Playing ${audioBuffer.duration.toFixed(2)}s of audio`)
    } catch (error) {
      console.error('Failed to play audio:', error)
      setIsPlaying(false)
      throw error
    }
  }, [unlockAudio, stop])

  /**
   * Play audio from Blob
   */
  const playBlob = useCallback(async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer()
    return playAudio(arrayBuffer)
  }, [playAudio])

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

  /**
   * Get audio context for visualization
   */
  const getAudioContext = useCallback(() => {
    return audioContextRef.current
  }, [])

  /**
   * Get analyser node for visualization
   */
  const getAnalyser = useCallback(() => {
    return analyserRef.current
  }, [])

  return {
    isPlaying,
    isSupported,
    playAudio,
    playBlob,
    stop,
    cleanup,
    getAudioContext,
    getAnalyser,
    unlockAudio,
  }
}
