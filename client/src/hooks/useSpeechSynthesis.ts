import { useEffect, useState } from 'react'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    console.log('🔊 Checking for speechSynthesis...', 'speechSynthesis' in window)

    if ('speechSynthesis' in window) {
      console.log('✅ speechSynthesis is available!')
      setIsSupported(true)

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices()
        console.log(`🔊 Loaded ${availableVoices.length} voices`, availableVoices)
        setVoices(availableVoices)
      }

      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices

      return () => {
        window.speechSynthesis.cancel()
      }
    } else {
      console.warn('❌ Speech synthesis not supported in this browser')
      setIsSupported(false)
    }
  }, [])

  const speak = (text: string, voiceIndex?: number) => {
    if (!text) {
      console.warn('🔇 TTS: No text to speak')
      return
    }

    // Try even if not "supported" - browser might still work
    if (!('speechSynthesis' in window)) {
      console.warn('🔇 TTS: speechSynthesis not in window')
      return
    }

    console.log(`🔊 TTS: Speaking "${text.substring(0, 50)}..."`)
    console.log(`🔊 TTS: isSupported=${isSupported}, voices.length=${voices.length}`)

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    if (voiceIndex !== undefined && voices[voiceIndex]) {
      utterance.voice = voices[voiceIndex]
    }

    utterance.onstart = () => {
      console.log('🔊 TTS: Started speaking')
      setSpeaking(true)
    }
    utterance.onend = () => {
      console.log('✅ TTS: Finished speaking')
      setSpeaking(false)
    }
    utterance.onerror = (error) => {
      console.error('❌ TTS error:', error)
      setSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
    console.log('🔊 TTS: Called speechSynthesis.speak()')
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
