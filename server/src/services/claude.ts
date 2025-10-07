// Load env FIRST
import '../config/env.js'
import { query } from '@anthropic-ai/claude-agent-sdk'
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import * as fs from 'fs/promises'
import * as path from 'path'

class ClaudeAgentService {
  private workspaceRoot = path.join(process.cwd(), 'workspace')

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not set - Claude Agent service will not be available')
      return
    }

    // Ensure workspace directory exists
    this.initWorkspace().catch(console.error)
  }

  private async initWorkspace() {
    try {
      await fs.mkdir(this.workspaceRoot, { recursive: true })
    } catch (error) {
      console.error('Failed to create workspace directory:', error)
    }
  }

  /**
   * Get or create user-specific workspace directory
   */
  private async getUserWorkspace(userId: string): Promise<string> {
    const userWorkspace = path.join(this.workspaceRoot, `user-${userId}`)

    // Security: validate userId to prevent directory traversal
    if (userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
      throw new Error('Invalid user ID')
    }

    await fs.mkdir(userWorkspace, { recursive: true })
    return userWorkspace
  }

  /**
   * Execute agent query with streaming response
   */
  async *executeAgent(
    userId: string,
    userPrompt: string,
    options?: {
      sessionId?: string
      permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
    }
  ): AsyncGenerator<{ type: string; content: string; data?: any }> {
    const userWorkspace = await this.getUserWorkspace(userId)

    try {
      const result = query({
        prompt: userPrompt,
        options: {
          cwd: userWorkspace,
          permissionMode: options?.permissionMode || 'acceptEdits',
          resume: options?.sessionId,
          systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
            append: 'You are secretary.fit, a helpful voice assistant. Keep responses concise and conversational for voice output.',
          },
          settingSources: ['project'], // Load CLAUDE.md if present
          allowedTools: [
            'Read',
            'Write',
            'Edit',
            'Glob',
            'Grep',
            'Bash',
            'TodoWrite',
          ],
          maxTurns: 10,
        },
      })

      // Stream messages as they arrive
      for await (const message of result) {
        yield this.processMessage(message)
      }
    } catch (error) {
      console.error('Agent execution error:', error)
      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Process SDK messages into simplified format for WebSocket
   */
  private processMessage(message: SDKMessage): { type: string; content: string; data?: any } {
    switch (message.type) {
      case 'assistant':
        // Extract text content from assistant message
        const textContent = message.message.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n')

        return {
          type: 'assistant',
          content: textContent,
          data: {
            session_id: message.session_id,
            uuid: message.uuid,
          },
        }

      case 'result':
        return {
          type: 'result',
          content: message.subtype === 'success' ? message.result : 'Task completed',
          data: {
            session_id: message.session_id,
            duration_ms: message.duration_ms,
            cost_usd: message.total_cost_usd,
            num_turns: message.num_turns,
            is_error: message.is_error,
          },
        }

      case 'system':
        if (message.subtype === 'init') {
          return {
            type: 'system_init',
            content: 'Agent initialized',
            data: {
              session_id: message.session_id,
              tools: message.tools,
              model: message.model,
            },
          }
        }
        return {
          type: 'system',
          content: 'System event',
          data: message,
        }

      default:
        return {
          type: 'unknown',
          content: '',
          data: message,
        }
    }
  }

  /**
   * Simple non-streaming version for quick responses
   */
  async generateResponse(userId: string, userMessage: string): Promise<string> {
    const messages: string[] = []

    for await (const msg of this.executeAgent(userId, userMessage)) {
      if (msg.type === 'assistant' || msg.type === 'result') {
        messages.push(msg.content)
      }
    }

    return messages.join('\n') || 'No response generated'
  }
}

export const claudeAgentService = new ClaudeAgentService()
