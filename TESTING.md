# Testing Guide

## Quick Start

1. **Start both servers:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   - Navigate to http://localhost:5173
   - You should see "🟢 Connected" status

3. **Test the dual-agent flow:**

### Test 1: Simple Question (GROQ only)
Type: `What is 2 + 2?`

**Expected:**
- 💬 Quick GROQ response appears immediately
- TTS speaks the answer

### Test 2: File Operation (GROQ + Agent)
Type: `create a file named hello.txt with the content "Hello from secretary.fit"`

**Expected:**
- 💬 GROQ acknowledges immediately (e.g., "Let me create that file for you...")
- 🤖 Agent messages appear showing the file creation process
- ✅ Final result confirms completion
- File should exist in `server/workspace/user-{your-session-id}/hello.txt`

### Test 3: File Reading
Type: `read the file hello.txt`

**Expected:**
- 💬 GROQ acknowledges
- 🤖 Agent reads and displays the file content
- ✅ Result shows the file contents

### Test 4: Voice Input
1. Click the "🎤 Talk" button
2. Say: "Create a file named voice-test.txt"
3. Click "🎤 Stop"

**Expected:**
- Your speech appears in the input field
- Message sends automatically
- Same dual-agent flow as above

## Message Types

### Client receives these message types:

| Type | Source | Color | Description |
|------|--------|-------|-------------|
| `groq_response` | GROQ | Gray (💬) | Immediate conversational response |
| `agent_assistant` | Claude Agent | Green (🤖) | Agent's thinking/response |
| `agent_result` | Claude Agent | Green (✅) | Final task result |
| `agent_system_init` | Claude Agent | - | Agent initialization info |
| `message` | Fallback | Gray | Generic messages |
| `error` | Either | - | Error messages |

## Debugging

### Check server logs
Look for:
- `Client connected: <uuid>` - Session created
- GROQ/Agent initialization messages
- Any error stack traces

### Verify workspace
```bash
ls -la server/workspace/
```
You should see `user-{uuid}` directories for each session.

### Check API keys
```bash
grep -E "(ANTHROPIC|GROQ)" .env
```
Both should be set.

### Common Issues

**"GROQ service will not be available"**
- .env file is now loaded from root correctly
- Verify GROQ_API_KEY is in `.env`

**"Agent not responding"**
- Check ANTHROPIC_API_KEY is set
- Check server logs for Agent SDK errors
- Verify you have Claude Code CLI installed

**"WebSocket disconnected"**
- Server might have crashed - check server logs
- Client will auto-reconnect every 3 seconds

## Advanced Testing

### Test Session Persistence
1. Send: "create file test1.txt"
2. Send: "create file test2.txt"
3. Both should use the same session (same workspace directory)

### Test Multiple Clients
1. Open two browser tabs
2. Each should get a different UUID
3. Each should have isolated workspace
4. Files created in one won't appear in the other

### Test Agent Tools
Try these commands:
- `list all files in the current directory`
- `create a bash script that prints hello world`
- `search for any javascript files`
- `create a new folder called test`

### Monitor Token Usage
Watch server logs for cost data in `agent_result` messages:
```json
{
  "type": "agent_result",
  "data": {
    "cost_usd": 0.0015,
    "duration_ms": 2341,
    "num_turns": 3
  }
}
```
