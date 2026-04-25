/**
 * Task-delegation tour — English source dictionary.
 *
 * The English dictionary is an array where each entry IS the literal string
 * passed to `t(...)`. Other locales are keyed Records mapping each English
 * string to its translation.
 */
export const en = [
  // Scene 1 — hook
  'Stop chatting. Start delegating.',

  // Scene 2 — prompt submit
  'Audit Q1 expenses, flag anomalies, draft a CFO memo',

  // Scene 3 — board view (task titles)
  'Parse invoices',
  'Flag anomalies',
  'Cross-check budgets',
  'Summarize findings',
  'Draft CFO memo',
  // Scene 3 — board view (task snippets)
  'Extract line items from 247 invoices',
  'Identify outliers above 2σ threshold',
  'Compare against Q4 budget allocations',
  'Aggregate findings into executive bullets',
  'Compose formal memo for CFO review',
  // Scene 3 — agent roles
  'Analysis',
  'Auditing',
  'Writing',

  // Scene 4 — artifacts
  'Task completed',
  '3 agents collaborated',
  'Q1 Expense Audit',
  'report',
  'CFO Memo',
  'document',

  // Scene 5 — collapse
  'Delegated. Delivered. Done.',

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
