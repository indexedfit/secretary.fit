// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from project root
dotenv.config({ path: join(__dirname, '../../../.env') })

// Export for easy access
export const config = {
  port: process.env.PORT || '3001',
  nodeEnv: process.env.NODE_ENV || 'development',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
}

// Validate critical env vars
if (!config.anthropicApiKey) {
  console.warn('⚠️  ANTHROPIC_API_KEY not set in .env')
}

if (!config.groqApiKey) {
  console.warn('⚠️  GROQ_API_KEY not set in .env')
}

if (!config.elevenLabsApiKey) {
  console.warn('⚠️  ELEVENLABS_API_KEY not set in .env')
}

console.log('✅ Environment loaded:', {
  port: config.port,
  hasAnthropicKey: !!config.anthropicApiKey,
  hasGroqKey: !!config.groqApiKey,
  hasElevenLabsKey: !!config.elevenLabsApiKey,
})
