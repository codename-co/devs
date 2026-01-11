/**
 * Meeting Bot Feature
 *
 * Enables DEVS agents to participate in Google Meet meetings as real participants.
 * The agent brain runs in the browser, while a headless Playwright instance
 * (devs-meet server) serves as the "body" that joins the meeting.
 */

// Types
export * from './types'

// Hooks
export { useMeetingBot } from './hooks/useMeetingBot'
export { useMeetingSession } from './hooks/useMeetingSession'

// Components
export { MeetingBotPanel } from './components/MeetingBotPanel'
export { MeetingControls } from './components/MeetingControls'
export { MeetingTranscript } from './components/MeetingTranscript'

// Services
export { MeetingBotBridge } from './meet-bridge'
