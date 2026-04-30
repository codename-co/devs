/**
 * Tour-local i18n — English source dictionary for the Agent Studio video.
 *
 * Convention: en.ts is an array where each entry IS the literal key
 * passed to `t(...)`. Other locales map each English string to its
 * translation.
 */
export const en = [
  // Browser chrome
  'DEVS',

  // Scene 1 — hook caption
  'What if AI worked your way?',

  // Scene 2 — browse agents
  'New agent',
  'Create a custom agent',
  'Scout',
  'Research',
  'Forge',
  'Analysis',
  'Scribe',
  'Writing',
  'Echo',
  'Review',
  'Probe',
  'Data',
  'Lens',
  'Vision',
  'Market Scout',
  'Competitive Analyst',
  'Search agents…',
  'No agents found',

  // Scene 3 — AI describe
  'An agent that monitors competitor pricing and product launches, then writes weekly briefs',
  'Analyzing your description...',
  'Generating agent configuration...',
  '{"name": "Market Scout", "role": "Competitive Analyst"}',

  // Scene 4 — form review
  'Analyze competitor products, pricing strategies, and market positioning. Summarize findings into actionable briefs.',

  // Scene 5 — test playground
  'What are our main competitors doing in Q1?',
  'Based on my analysis, here are the key competitor moves this quarter:\n\n1. **Acme Corp** launched a freemium tier targeting SMBs\n2. **Globex** cut enterprise pricing by 15%\n3. **Initech** acquired a data analytics startup\n\nI recommend focusing on our mid-market positioning.',

  // Scene 4 — team glance (legacy, kept for other locales)
  'A team. Yours. Built in seconds.',

  // Scene 6 — CTA
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
