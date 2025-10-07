// Load env FIRST
import '../config/env.js'
import Groq from 'groq-sdk'

class GroqService {
  private client: Groq | null = null
  private conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []

  constructor() {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      console.warn('GROQ_API_KEY not set - GROQ service will not be available')
      return
    }

    this.client = new Groq({
      apiKey,
    })

    // Add system message
    this.conversationHistory.push({
      role: 'system',
      content: `You are a helpful voice assistant. Keep responses brief (1-3 sentences) for voice output.

You work alongside a background Agent that handles file operations, code execution, and system commands.

When users ask you to:
- Work with files (create, edit, read, delete, append to files)
- Run commands or code
- Search through files or directories

Respond with a brief acknowledgment like: "On it" or "Let me handle that" or "Working on that now"

For everything else (questions, explanations, advice, general conversation), answer naturally from your knowledge. Be honest if you don't know something or if it requires real-time data you don't have access to.

Stay conversational and concise.`,
    })
  }

  async generateResponse(userMessage: string): Promise<string> {
    if (!this.client) {
      throw new Error('GROQ client not initialized - check your GROQ_API_KEY')
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    })

    // Keep only system message + last 10 messages
    if (this.conversationHistory.length > 11) {
      const systemMessage = this.conversationHistory[0]
      this.conversationHistory = [systemMessage, ...this.conversationHistory.slice(-10)]
    }

    const response = await this.client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: this.conversationHistory as any,
      temperature: 0.7,
      max_tokens: 1024,
    })

    const assistantMessage = response.choices[0]?.message?.content || 'No response generated'

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    })

    return assistantMessage
  }

  clearHistory() {
    this.conversationHistory = this.conversationHistory.slice(0, 1) // Keep system message
  }
}

export const groqService = new GroqService()
