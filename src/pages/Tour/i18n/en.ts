/**
 * Tour-local i18n — English source dictionary.
 *
 * Follows the project convention from `src/features/connectors/i18n/en.ts`:
 * the English dictionary is an array where each entry IS the literal string
 * passed to `t(...)`. Other locales are keyed Records mapping each English
 * string to its translation.
 */
export const en = [
  // Browser chrome
  'New Tab',
  'DEVS',

  // Demo prompt shown in the real composer during Scene 2.
  'Build me a research brief on lithium battery supply chains.',
  'Research lithium supply chains, chart the top 5 risks, and draft an exec summary.',

  // Scene captions (italic serif)
  'Open a tab.',
  'An AI agent swarm. In your browser.',
  'A swarm, not a chat.',
  'All inside your browser.',
  'No server.',
  'No subscription.',
  'No third party.',
  'Your keys. Your data.',
  'OPEN SOURCE · BROWSER-NATIVE · YOURS',
  'devs.new',
  'Intelligence, one tab away',
  'Open devs.new →',
  'No signup · No install · Free',
  'github.com/codename-co/devs · MIT',

  // Scene 2 — task / swarm proof
  '4 agents · 6 tools · 11s',
  'Breaking this into parallel subtasks. Recruiting Research, Analysis, Writing, and Review…',
  'Searching knowledge base',
  'Searching Wikipedia',
  'Searching arXiv',
  'Drafting exec summary',
  'Charting top 5 risks',
  'Reviewing deliverables',
  'Research supply chain stages',
  'Identify top 5 risks',
  'Build risks chart',
  'Draft exec summary',
  'Lithium supply chain — exec summary',
  'Top 5 risks — chart',
  'Analysis',
  'Writing',
  'Review',

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

  // Scene 2 streamed answer (markdown blob shown in ThreadPreview)
  `## Research brief — lithium supply chains

**Four critical stages:** raw materials · refining · cell manufacturing · pack assembly.

### Top 5 risks

1. **Refining concentration** — China controls ~75% of capacity
2. **Cobalt sourcing** — DRC artisanal mining exposure
3. **Recycling gap** — capacity lags demand growth
4. **Nickel volatility** — Indonesian supply shocks
5. **Geopolitical shifts** — IRA, EU CRMA reshape flows

> Exec summary and risks chart attached.`,

  // Scene 2 filler thread titles + snippets
  'Draft Q3 OKRs for the platform team',
  'Synthesized five drafts. Ready for review.',
  'Compare three WebGPU inference runtimes',
  'Benchmarks complete. Transformers.js leads on cold start.',
  'Summarize last week’s customer interviews',
  'Three themes emerged: latency, privacy, price.',

  // Scene 2 ThreadList new-task button
  'New task',
  'Start a new task',

  // Scene 2 agent role
  'Research',
] as const
