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
  'Build me a climate adaptation briefing for 5 major cities.',
  'Research how 5 major cities are adapting to climate change, compare their strategies, and draft a presentation briefing for city planners.',

  // Scene captions (italic serif)
  'What if you could delegate anything?',
  'Open a tab.',
  'An AI agent swarm. In your browser.',
  'A swarm, not a chat.',
  'All of that. In one tab.',
  'No server.',
  'No subscription.',
  'No third party.',
  'Your keys. Your data.',
  'OPEN SOURCE · BROWSER-NATIVE · YOURS',
  'devs.new',
  'Now you can.',
  'Open devs.new →',
  'No signup · No install · Free',
  'github.com/codename-co/devs · MIT',

  // Scene 2 — task / swarm proof
  '4 agents · 3 tools · 11s',
  'Breaking this into parallel subtasks. Recruiting Research, Analysis, Writing, and Review…',
  'Searching knowledge base',
  'Searching Wikipedia',
  'Searching arXiv',
  'Drafting presentation briefing',
  'Comparing city strategies',
  'Reviewing deliverables',
  'Generating presentation',
  'Research city adaptations',
  'Compare strategies',
  'Build strategy overview',
  'Draft briefing',
  'Climate adaptation — strategy comparison',
  'City planners briefing — presentation',
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
  `## Climate adaptation briefing — 5 major cities

**Cities surveyed:** Amsterdam · Singapore · Copenhagen · Medellín · Rotterdam

### Comparative strategies

1. **Amsterdam** — floating infrastructure, canal surge control
2. **Singapore** — NEWater system, urban heat island mitigation
3. **Copenhagen** — 100% renewable target, 20-min city model
4. **Medellín** — green corridors, urban acupuncture model
5. **Rotterdam** — water squares, rooftop gardens, floating pavilions

> Strategy comparison and presentation deck attached.`,

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
