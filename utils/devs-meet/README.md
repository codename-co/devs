# DEVS Meeting Bot

A headless browser service that enables DEVS agents to join Google Meet meetings as real participants.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  DEVS Browser (Agent Brain)        devs-meet (Bot Body)              │
│  ┌────────────────────────┐        ┌────────────────────────────┐   │
│  │ • Agent logic          │        │ • Playwright browser       │   │
│  │ • LLM calls            │◄─WSS──►│ • Joins Meet as real user  │   │
│  │ • Memory               │        │ • Captures captions        │   │
│  │ • User controls        │        │ • Sends chat/reactions     │   │
│  └────────────────────────┘        └────────────────────────────┘   │
│                                                                      │
│  All intelligence stays             Server is just a "puppet body"  │
│  in the user's browser              with no AI logic                │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Using Docker (Recommended)

```bash
# Build and run
docker compose up -d

# Check logs
docker compose logs -f

# Stop
docker compose down
```

### Local Development

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run server
npm start

# Or with auto-reload
npm run dev
```

## WebSocket API

Connect to `ws://localhost:4445/{sessionId}` where `sessionId` is a unique identifier for your meeting session.

### Messages from Client → Server

#### Join Meeting

```json
{
  "type": "join",
  "meetingUrl": "https://meet.google.com/abc-defg-hij",
  "botName": "My Agent",
  "googleAuthToken": {
    /* optional: Google auth cookies */
  }
}
```

#### Leave Meeting

```json
{
  "type": "leave"
}
```

#### Send Chat Message

```json
{
  "type": "chat",
  "text": "Hello from DEVS Agent!"
}
```

#### Speak Text (TTS)

```json
{
  "type": "speak",
  "text": "Hello, I am your AI assistant."
}
```

#### Play Audio

```json
{
  "type": "speak",
  "audioBase64": "UklGRiQA..." // Base64-encoded WAV audio
}
```

#### Send Reaction

```json
{
  "type": "react",
  "emoji": "👍"
}
```

#### Ping/Keepalive

```json
{
  "type": "ping"
}
```

### Messages from Server → Client

#### Connection Established

```json
{
  "type": "connected",
  "sessionId": "my-session"
}
```

#### Successfully Joined

```json
{
  "type": "joined",
  "sessionId": "my-session",
  "meetingUrl": "https://meet.google.com/abc-defg-hij"
}
```

#### Transcript Update (Live Captions)

```json
{
  "type": "transcript",
  "speaker": "John Doe",
  "text": "Let's discuss the quarterly results.",
  "timestamp": 1704931200000,
  "sessionId": "my-session"
}
```

#### Chat Message Received

```json
{
  "type": "chat_message",
  "sender": "Jane Smith",
  "text": "I agree with that approach.",
  "timestamp": 1704931200000
}
```

#### Participant Change

```json
{
  "type": "participant",
  "action": "joined", // or "left"
  "name": "Bob Wilson",
  "id": "participant-123",
  "timestamp": 1704931200000
}
```

#### Status Update

```json
{
  "type": "status",
  "status": "joining", // starting, navigating, pre-join, joining, waiting, joined, leaving, left
  "message": "Requesting to join..."
}
```

#### Error

```json
{
  "type": "error",
  "error": "Failed to join: Meeting not found"
}
```

## Authentication

### Option 1: Guest Mode (Limited)

Join as a guest without authentication. Works for meetings that allow guests.

### Option 2: Google Auth Cookies

Pass Google authentication cookies obtained from your browser:

```javascript
// In DEVS browser, export cookies and send to bot
const authToken = [
  { name: 'SID', value: '...', domain: '.google.com' },
  { name: 'HSID', value: '...', domain: '.google.com' },
  { name: 'SSID', value: '...', domain: '.google.com' },
  // ... other auth cookies
]

ws.send(
  JSON.stringify({
    type: 'join',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    botName: 'DEVS Agent',
    googleAuthToken: authToken,
  }),
)
```

## Audio Output to Meeting

By default, TTS plays locally in the headless browser. To route audio INTO the meeting:

### Linux (with PulseAudio)

```bash
# Create virtual audio device
pactl load-module module-null-sink sink_name=VirtualMic sink_properties=device.description=VirtualMic

# Set as default source for browser
export PULSE_SOURCE=VirtualMic.monitor
```

### Docker with Audio

Uncomment the volume mount in `compose.yaml`:

```yaml
volumes:
  - /run/user/1000/pulse:/run/user/1000/pulse
environment:
  - PULSE_SERVER=unix:/run/user/1000/pulse/native
```

## Environment Variables

| Variable    | Default   | Description                              |
| ----------- | --------- | ---------------------------------------- |
| `HOST`      | `0.0.0.0` | Server bind address                      |
| `PORT`      | `4445`    | WebSocket server port                    |
| `LOG_LEVEL` | `info`    | Logging level (debug, info, warn, error) |

## Known Limitations

1. **Google Meet UI Changes**: Google frequently updates their DOM structure. Selectors may need updates.

2. **Bot Detection**: Google may detect automated browsers. The bot uses anti-detection measures but is not foolproof.

3. **Audio Injection**: Requires system-level audio routing (PulseAudio) for the agent to speak into the meeting.

4. **Captions**: Relies on Google Meet's live captions being available. May not work in all locales.

5. **Authentication**: Complex Google OAuth flows may require manual cookie extraction.

## Integration with DEVS

Example usage in DEVS browser:

```typescript
// src/features/meeting-bot/meet-bridge.ts
export class MeetBridge {
  private ws: WebSocket

  constructor(serverUrl: string) {
    this.ws = new WebSocket(`${serverUrl}/meeting-${Date.now()}`)
    this.ws.onmessage = this.handleMessage.bind(this)
  }

  async joinMeeting(url: string, agentName: string) {
    this.ws.send(
      JSON.stringify({
        type: 'join',
        meetingUrl: url,
        botName: agentName,
      }),
    )
  }

  private handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data)

    if (data.type === 'transcript') {
      // Send to DEVS agent for processing
      this.processWithAgent(data.speaker, data.text)
    }
  }

  private async processWithAgent(speaker: string, text: string) {
    // Agent logic here - analyze, respond, etc.
    const response = await this.agent.chat(`${speaker} said: "${text}"`)

    if (response.shouldRespond) {
      this.ws.send(
        JSON.stringify({
          type: 'chat', // or 'speak' for voice
          text: response.message,
        }),
      )
    }
  }
}
```

## License

MIT - Same as DEVS
