import { useEffect, useState } from 'react'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true)

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)
      }

      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices

      return () => {
        window.speechSynthesis.cancel()
      }
    } else {
      console.warn('Speech synthesis not supported in this browser')
    }
  }, [])

  const speak = (text: string, voiceIndex?: number) => {
    if (!isSupported || !text) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    if (voiceIndex !== undefined && voices[voiceIndex]) {
      utterance.voice = voices[voiceIndex]
    }

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error)
      setSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
  }

  const cancel = () => {
    if (isSupported) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }

  return {
    speaking,
    voices,
    isSupported,
    speak,
    cancel,
  }
}
