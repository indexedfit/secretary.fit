import { useRef, useState, useCallback } from 'react'

interface UseAudioRecordingOptions {
  onDataAvailable?: (audioBlob: Blob) => void
  chunkInterval?: number // Send chunks every N milliseconds
}

export function useAudioRecording({
  onDataAvailable,
  chunkInterval = 250, // Send chunks every 250ms for real-time transcription
}: UseAudioRecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false)
        throw new Error('MediaDevices API not supported')
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })

      streamRef.current = stream

      // Try different formats (iOS Safari needs mp4)
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else {
        // iOS Safari fallback - no mimeType specified
        mimeType = ''
      }

      console.log(`🎙️ Using mimeType: ${mimeType || '(default)'}`)

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorder.ondataavailable = (event) => {
        console.log(`📦 Audio chunk received: ${event.data.size} bytes, type: ${event.data.type}`)
        if (event.data.size > 0) {
          onDataAvailable?.(event.data)
        } else {
          console.warn('⚠️ Empty audio chunk received')
        }
      }

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error)
        stopRecording()
      }

      // Start recording and send chunks at specified interval
      mediaRecorder.start(chunkInterval)
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

      console.log(`✅ Recording started with ${mimeType || '(default)'}, sending chunks every ${chunkInterval}ms`)
      console.log(`MediaRecorder state: ${mediaRecorder.state}`)
    } catch (error) {
      console.error('Failed to start recording:', error)
      setIsRecording(false)
      throw error
    }
  }, [onDataAvailable, chunkInterval])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
    console.log('Recording stopped')
  }, [])

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
  }
}
