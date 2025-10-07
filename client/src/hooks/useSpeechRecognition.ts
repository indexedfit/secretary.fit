import { useEffect, useRef, useState } from 'react'

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void
  continuous?: boolean
  lang?: string
}

export function useSpeechRecognition({
  onResult,
  continuous = false,
  lang = 'en-US',
}: UseSpeechRecognitionOptions = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)

      const recognition = new SpeechRecognition()
      recognition.continuous = continuous
      recognition.interimResults = true
      recognition.lang = lang

      recognition.onstart = () => {
        setListening(true)
      }

      recognition.onend = () => {
        setListening(false)
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        const combinedTranscript = finalTranscript || interimTranscript
        setTranscript(combinedTranscript)

        if (finalTranscript) {
          onResult?.(finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setListening(false)
      }

      recognitionRef.current = recognition
    } else {
      console.warn('Speech recognition not supported in this browser')
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [continuous, lang])

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      setTranscript('')
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop()
    }
  }

  return {
    listening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  }
}
