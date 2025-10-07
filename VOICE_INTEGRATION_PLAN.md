# Voice Integration Plan - Groq Whisper + Kokoro TTS

## Current Issues

### Speech-to-Text (STT)
❌ **Browser Web Speech API Problems:**
- Unreliable on different browsers/OS
- No Safari iOS support
- Inconsistent quality
- No streaming support in many browsers
- Requires user to manually start/stop

### Text-to-Speech (TTS)
❌ **Browser Web Speech Synthesis Problems:**
- Robot-like voice quality
- Limited voice selection
- No emotion/intonation control
- Blocking (can't interrupt easily)
- Different voice availability per OS

## Proposed Solution

### STT: Groq Whisper Turbo
✅ **Why Groq Whisper:**
- Lightning fast (real-time transcription)
- High accuracy
- Multilingual support
- Streaming capable
- Consistent across all devices

### TTS: Kokoro-82M
✅ **Why Kokoro:**
- High-quality, natural voice
- Emotional intonation
- Fast inference
- Small model size (82M params)
- Can run locally or via API

## Architecture

### Phase 1: Server-Side Voice Processing

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ WebSocket (Audio Stream)
       ↓
┌─────────────────┐
│     Server      │
│  ┌───────────┐  │
│  │   GROQ    │  │ ← Audio chunk → Whisper Turbo → Text
│  │  Whisper  │  │
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │  Kokoro   │  │ ← Text → TTS → Audio chunk
│  │    TTS    │  │
│  └───────────┘  │
└─────────────────┘
```

### Implementation Steps

#### 1. **Add Audio Streaming to WebSocket**

**Client Side:**
```typescript
// New hook: useAudioRecording
const useAudioRecording = () => {
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const startRecording = (onDataAvailable: (blob: Blob) => void) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        })

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            onDataAvailable(e.data)
          }
        }

        mediaRecorder.start(100) // Send chunks every 100ms
        mediaRecorderRef.current = mediaRecorder
        setRecording(true)
      })
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    setRecording(false)
  }

  return { recording, startRecording, stopRecording }
}
```

**Server Side:**
```typescript
// server/src/services/whisper.ts
import Groq from 'groq-sdk'

class WhisperService {
  private client: Groq

  async transcribe(audioBuffer: Buffer): Promise<string> {
    const transcription = await this.client.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-large-v3-turbo',
      language: 'en',
      response_format: 'json',
      temperature: 0.0,
    })

    return transcription.text
  }
}
```

#### 2. **Integrate Kokoro TTS**

**Option A: Run Kokoro Locally (Best for latency)**
```bash
# Install kokoro-onnx
pip install kokoro-onnx
```

```python
# server/src/services/tts.py
from kokoro_onnx import Kokoro

class TTSService:
    def __init__(self):
        self.kokoro = Kokoro('kokoro-v0_19.onnx', 'voices.bin')

    def synthesize(self, text: str, voice: str = 'af') -> bytes:
        """Generate audio from text using Kokoro"""
        samples, sample_rate = self.kokoro.create(text, voice=voice, speed=1.0)
        # Convert to WebM or MP3 for browser
        return audio_bytes
```

**Option B: Use Kokoro via API (Easier setup)**
```typescript
// server/src/services/kokoro.ts
class KokoroService {
  async synthesize(text: string): Promise<Buffer> {
    // Call Kokoro API endpoint
    const response = await fetch('http://localhost:8000/tts', {
      method: 'POST',
      body: JSON.stringify({ text, voice: 'af' })
    })
    return await response.buffer()
  }
}
```

#### 3. **Update WebSocket Protocol**

```typescript
// New message types
interface AudioChunkMessage {
  type: 'audio_chunk'
  data: ArrayBuffer // Audio chunk from mic
  sequence: number
}

interface TranscriptionMessage {
  type: 'transcription'
  text: string
  is_final: boolean
}

interface TTSAudioMessage {
  type: 'tts_audio'
  data: ArrayBuffer // Audio to play
  sequence: number
}
```

#### 4. **Client Audio Playback**

```typescript
// New hook: useAudioPlayback
const useAudioPlayback = () => {
  const audioContextRef = useRef<AudioContext>()
  const [playing, setPlaying] = useState(false)

  const playAudio = async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)
    const source = audioContextRef.current.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContextRef.current.destination)

    source.onended = () => setPlaying(false)
    source.start()
    setPlaying(true)
  }

  const stop = () => {
    audioContextRef.current?.close()
    audioContextRef.current = new AudioContext()
    setPlaying(false)
  }

  return { playAudio, playing, stop }
}
```

## UI/UX Enhancements

### 1. **Speech Bubble Animation**

```typescript
// When speaking, show animated speech bubble
<div className={speaking ? 'speech-bubble pulse' : 'speech-bubble'}>
  <div className="waveform">
    {/* Animated waveform bars */}
  </div>
</div>
```

```css
.speech-bubble {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.speech-bubble.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}
```

### 2. **Interruption Support**

```typescript
// Click anywhere to interrupt
<div onClick={handleInterrupt} className="interrupt-overlay">
  {speaking && <p>Click to interrupt</p>}
</div>

const handleInterrupt = () => {
  stopAudioPlayback()
  ws.send(JSON.stringify({ type: 'interrupt' }))
}
```

### 3. **Voice Activation (VAD)**

```typescript
// Detect when user starts speaking (Voice Activity Detection)
const useVoiceActivation = (threshold = 0.01) => {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)

        microphone.connect(analyser)
        analyser.fftSize = 512

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          const normalized = average / 255

          setIsActive(normalized > threshold)
          requestAnimationFrame(checkVolume)
        }

        checkVolume()
      })
  }, [threshold])

  return isActive
}
```

## Implementation Timeline

### Week 1: STT with Groq Whisper
- [ ] Add audio recording hook
- [ ] Send audio chunks via WebSocket
- [ ] Integrate Groq Whisper API
- [ ] Display real-time transcription
- [ ] Test accuracy and latency

### Week 2: TTS with Kokoro
- [ ] Set up Kokoro (local or API)
- [ ] Stream TTS audio to client
- [ ] Audio playback with Web Audio API
- [ ] Test voice quality

### Week 3: UX Polish
- [ ] Speech bubble animation
- [ ] Interruption support (click/tap)
- [ ] Voice Activity Detection
- [ ] Visual feedback (waveforms)
- [ ] Settings (voice selection, speed)

### Week 4: Optimization
- [ ] Reduce latency (streaming TTS)
- [ ] Handle network issues gracefully
- [ ] Add audio caching
- [ ] Performance testing

## Technical Considerations

### Latency Optimization
1. **Streaming Audio** - Don't wait for full response, stream chunks
2. **Parallel Processing** - Start TTS before full Agent response
3. **Audio Buffering** - Pre-buffer next chunk while playing current
4. **WebSocket Priority** - Separate audio and text channels

### Browser Compatibility
- WebRTC for mic access (all modern browsers)
- Web Audio API for playback (all modern browsers)
- ArrayBuffer for binary audio data
- Fallback to File upload for very old browsers

### Cost Estimation
- **Groq Whisper**: ~$0.05 per minute of audio
- **Kokoro**: Free if self-hosted, ~$0.02/1000 chars if API
- **Monthly for 1000 users @ 5min/day**: ~$7,500/month

### Alternatives
- **STT**: OpenAI Whisper API, Deepgram, AssemblyAI
- **TTS**: ElevenLabs, Play.ht, Azure Speech, Coqui TTS

## Next Steps

1. **Prototype STT** - Build basic Groq Whisper integration
2. **Prototype TTS** - Test Kokoro locally
3. **Measure Latency** - Benchmark end-to-end delay
4. **User Testing** - Get feedback on voice quality
5. **Iterate** - Improve based on results

## Questions to Resolve

1. Should we use Kokoro locally or via API?
2. Do we want multi-language support immediately?
3. Voice cloning for personalization?
4. How to handle poor network conditions?
5. Mobile app considerations?
