import Anthropic from '@anthropic-ai/sdk'

class ClaudeService {
  private client: Anthropic | null = null
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not set - Claude service will not be available')
      return
    }

    this.client = new Anthropic({
      apiKey,
    })
  }

  async generateResponse(userMessage: string): Promise<string> {
    if (!this.client) {
      throw new Error('Claude client not initialized - check your ANTHROPIC_API_KEY')
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    })

    // Keep only last 10 messages to manage context
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10)
    }

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: this.conversationHistory,
    })

    const assistantMessage = response.content[0].text

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    })

    return assistantMessage
  }

  clearHistory() {
    this.conversationHistory = []
  }
}

export const claudeService = new ClaudeService()
