/**
 * Inbox-workflow tour — English source dictionary.
 *
 * The English dictionary is an array where each entry IS the literal string
 * passed to `t(...)`. Other locales are keyed Records mapping each English
 * string to its translation.
 */
export const en = [
  // Scene 1 — hook
  'AI that reports back to you.',

  // Scene 2 — inbox full
  'Q1 Expense Audit',
  'Blog post draft',
  'API documentation',
  'Market research',
  'Code review: auth',
  'Weekly summary',
  'Auditor',
  'Scribe',
  'DocBot',
  'Scout',
  'Reviewer',
  'Digest',
  '2m ago',
  '15m ago',
  '1h ago',
  '3h ago',
  '5h ago',
  '1d ago',
  'Found 3 anomalies in Q1 data…',
  'Here\u2019s a draft covering key topics…',
  'Endpoints documented with examples…',
  'Audit Q1 expenses and flag anomalies',
  'Analyzing expense data across departments…',
  'Found 3 anomalies totaling $12,400. Two duplicate vendor payments and one misclassified expense in Marketing.',

  // Scene 3 — transcript
  'Audit Q1 expenses...',
  'Analyzing expense data...',
  'calculate — 247 transactions',
  'search_knowledge — Q1 reports',
  'Found 3 anomalies...',
  '1.2s',
  '0.8s',
  '2.1s',
  '1.5s',
  '0.9s',
  '340 tok',
  '—',
  '580 tok',
  '120 tok',
  '410 tok',
  'User input',
  'Thinking',
  'Tool call',
  'Response',

  // Scene 4 — tags & search
  '#research',
  'Search. Tag. Organize.',

  // Scene 5 — CTA
  'Now you can.',
  'Open devs.new →',
  'No signup · No install · Free',
] as const
