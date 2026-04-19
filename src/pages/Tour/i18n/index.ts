/**
 * Tour-local i18n.
 *
 * Follows the project convention from `src/features/connectors/i18n/en.ts`:
 * the English dictionary is an array where each entry IS the literal string
 * passed to `t(...)`. Other locales (when added) will be keyed Records
 * mapping the English string to its translation.
 *
 * For now only English is wired up, per product requirements — the tour is
 * still ready for i18n: every user-visible string in the scenes goes through
 * the app's real `useI18n(tourI18n)` pipeline.
 */
export const en = [
  // Browser chrome
  'New Tab',
  'DEVS',

  // Demo prompt shown in the real composer during Scene 2.
  'Build me a research brief on lithium battery supply chains.',

  // Scene captions (italic serif)
  'Open a tab.',
  'A swarm, not a chat.',
  'All inside your browser.',
  'No server.',
  'No subscription.',
  'No third party.',
  'OPEN SOURCE · BROWSER-NATIVE · YOURS',
  'devs.new',
  'Intelligence amplification for everyone with a browser.',
  'github.com/codename-co/devs · MIT',

  // Agent labels (used in the swarm ring)
  'ORCHESTRATOR',
  'Scout',
  'RESEARCH',
  'Forge',
  'CODE',
  'Scribe',
  'WRITE',
  'Probe',
  'Lens',
  'Critic',
  'Tool',
  'Echo',
  'Archive',
] as const

const tourI18n = { en } as const

export default tourI18n
