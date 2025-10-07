// Load env FIRST
import '../config/env.js'
import { ElevenLabsClient } from 'elevenlabs'

class TTSService {
  private client: ElevenLabsClient | null = null

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      console.warn('⚠️  ELEVENLABS_API_KEY not set - TTS will not be available')
      return
    }

    this.client = new ElevenLabsClient({
      apiKey,
    })

    console.log('✅ ElevenLabs TTS configured')
  }

  async synthesize(text: string, voiceId: string = 'EXAVITQu4vr4xnSDxMaL'): Promise<Buffer> {
    if (!this.client) {
      throw new Error('ElevenLabs client not initialized - check ELEVENLABS_API_KEY')
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for synthesis')
    }

    try {
      console.log(`🔊 Generating ElevenLabs TTS: "${text.substring(0, 50)}..."`)

      const audio = await this.client.generate({
        voice: voiceId, // Default: Sarah (female, conversational)
        text: text,
        model_id: 'eleven_monolingual_v1',
      })

      // Convert stream to buffer
      const chunks: Buffer[] = []
      for await (const chunk of audio) {
        chunks.push(chunk)
      }

      const buffer = Buffer.concat(chunks)
      console.log(`✅ Generated ${buffer.length} bytes of audio`)

      return buffer
    } catch (error) {
      console.error('❌ ElevenLabs TTS error:', error)
      throw error
    }
  }
}

export const ttsService = new TTSService()
