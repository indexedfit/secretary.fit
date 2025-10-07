// Load env FIRST
import '../config/env.js'
import Groq from 'groq-sdk'
import { File } from 'buffer'

class WhisperService {
  private client: Groq | null = null
  private audioChunks: Buffer[] = []

  constructor() {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      console.warn('GROQ_API_KEY not set - Whisper service will not be available')
      return
    }

    this.client = new Groq({
      apiKey,
    })
  }

  /**
   * Accumulate audio chunks for better transcription quality
   */
  addChunk(chunk: Buffer) {
    this.audioChunks.push(chunk)
  }

  /**
   * Transcribe accumulated audio chunks
   */
  async transcribe(audioBuffer?: Buffer): Promise<string> {
    if (!this.client) {
      throw new Error('Whisper client not initialized - check your GROQ_API_KEY')
    }

    // Use provided buffer or accumulated chunks
    const buffer = audioBuffer || Buffer.concat(this.audioChunks)

    if (buffer.length === 0) {
      throw new Error('No audio data to transcribe')
    }

    try {
      // Create a File object from the buffer (required by Groq SDK)
      const audioFile = new File([buffer], 'audio.webm', {
        type: 'audio/webm',
      })

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3-turbo',
        language: 'en', // Can be made configurable
        response_format: 'json',
        temperature: 0.0, // More deterministic
      })

      // Clear chunks after successful transcription
      this.audioChunks = []

      return transcription.text.trim()
    } catch (error) {
      console.error('Whisper transcription error:', error)
      throw error
    }
  }

  /**
   * Clear accumulated audio chunks
   */
  clearChunks() {
    this.audioChunks = []
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.audioChunks.reduce((total, chunk) => total + chunk.length, 0)
  }
}

export const whisperService = new WhisperService()
