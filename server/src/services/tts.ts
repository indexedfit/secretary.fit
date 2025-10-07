// Load env FIRST
import '../config/env.js'
import OpenAI from 'openai'

class TTSService {
  private client: OpenAI | null = null

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set - TTS service will not be available')
      console.warn('Note: We can switch to Kokoro TTS (free, local) later')
      return
    }

    this.client = new OpenAI({
      apiKey,
    })
  }

  /**
   * Convert text to speech using OpenAI TTS
   * Returns audio as Buffer (MP3 format)
   */
  async synthesize(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<Buffer> {
    if (!this.client) {
      throw new Error('TTS client not initialized - check your OPENAI_API_KEY')
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for synthesis')
    }

    try {
      const mp3 = await this.client.audio.speech.create({
        model: 'tts-1', // Fast model, use 'tts-1-hd' for higher quality
        voice: voice,
        input: text,
        speed: 1.0, // Can be 0.25 to 4.0
      })

      // Convert response to Buffer
      const buffer = Buffer.from(await mp3.arrayBuffer())
      console.log(`Generated ${buffer.length} bytes of audio for: "${text.substring(0, 50)}..."`)

      return buffer
    } catch (error) {
      console.error('TTS synthesis error:', error)
      throw error
    }
  }
}

export const ttsService = new TTSService()
