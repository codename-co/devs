/**
 * Privacy-first tour — English source dictionary.
 *
 * The English dictionary is an array where each entry IS the literal string
 * passed to `t(...)`. Other locales are keyed Records mapping each English
 * string to its translation.
 */
export const en = [
  // Scene 1 — hook
  'What leaves your browser? Nothing.',

  // Scene 2 — browser local
  'IndexedDB',
  'Local storage',
  'Web Crypto',
  'Encrypted keys',
  'Service Worker',
  'Offline ready',

  // Scene 3 — BYOK
  'LLM Providers',
  'OpenAI',
  'Anthropic',
  'Gemini',
  'Ollama',
  'OpenRouter',
  'Local (WebGPU)',
  'Connected',
  '12+ providers. Your keys. Your choice.',

  // Scene 4 — promise
  'No server.',
  'No subscription.',
  'No third party.',
  'Open source.',
  'OPEN SOURCE · BROWSER-NATIVE · YOURS',

  // Scene 5 — CTA
  'Now you can.',
  'Open devs.new →',
  'No signup · No install · Free',

  // Playback bar — settings menu
  'Speed',
  'Normal',
  'Language',
  'Keyboard shortcuts',

  // Playback bar — control titles
  'Pause',
  'Play',
  'Unmute',
  'Mute',
  'Exit full screen',
  'Full screen',
  'Settings',

  // Keyboard shortcut overlay — descriptions
  'Play / Pause',
  'Seek back 0.1 s',
  'Seek forward 0.1 s',
  'Seek back 1 s',
  'Seek forward 1 s',
  'Go to start',
  'Toggle mute',
  'Toggle full screen',
  'Show shortcuts',
  'Close this overlay',
] as const
