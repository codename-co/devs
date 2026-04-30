/**
 * Task-delegation tour — English source dictionary.
 */
export const en = [
  // Scene 1 — hook
  'Connect everything. Delegate anything.',

  // Scene 2 — settings / connectors
  'Connectors',
  'Choose a service to connect:',
  'Google Drive',
  'Sync files and folders',
  'Gmail',
  'Sync emails',
  'Connecting to Google Drive...',
  'Connecting to Gmail...',
  'Successfully connected!',
  'Connected and authorized',
  'Auto-sync enabled',

  // Scene 3 — prompt submit
  'Analyze last month\u2019s sales invoices from Drive, calculate quarterly projections, and generate a PPTX deck with an email draft to the client',

  // Scene 4 — swarm stream (step titles)
  'Breaking into subtasks. Recruiting Data, Analysis, and Writing agents\u2026',
  'Pulling invoices from Google Drive',
  'Scanning Gmail for purchase order confirmations',
  'Calculating quarterly projections',
  'Generating presentation',
  'Drafting email to client',

  // Scene 4 — swarm stream (tool call I/O)
  '34 invoices \u00B7 Sales folder',
  '12 matching PO confirmations',
  'Q1: $2.4M \u00B7 Q2: $3.1M \u00B7 Q3: $2.8M \u00B7 Q4 (proj): $3.6M',
  '8 slides \u00B7 .pptx ready',
  'Draft ready \u00B7 1 attachment',

  // Scene 4 — streaming markdown answer
  'quarterly_report',

  // Scene 4 — thread list items
  'Sales invoice analysis + quarterly projections',
  'Draft Q3 OKRs for the platform team',
  'Synthesized five drafts. Ready for review.',
  'Compare three WebGPU inference runtimes',
  'Benchmarks complete. Transformers.js leads on cold start.',

  // Scene 4 — agent roles
  'Research',
  'Analysis',
  'Writing',
  'Review',

  // Scene 4 — task metadata
  'New task',
  'Start a new task',

  // Scene 5 — email draft
  'To:',
  'Subject:',
  'Q4 Sales Projections \u2014 Deck Attached',
  'Dear Sarah,',
  'Please find attached our quarterly sales projections deck. Key highlights:',
  '\u2022 Q4 projected revenue: **$3.6M** (+29% vs Q3)',
  '\u2022 Top growth driver: Enterprise segment (+42%)',
  '\u2022 3 risk factors flagged in appendix',
  'Happy to walk through the details at your convenience.',
  'Best regards',
  'quarterly-projections.pptx',
  '2.4 MB',

  // Scene 6 — collapse
  'Connected. Computed. Delivered.',

  // Scene 7 — CTA
  'Now you can.',
  'Open devs.new \u2192',
  'No signup \u00B7 No install \u00B7 Free',

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
