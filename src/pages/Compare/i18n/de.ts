import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Hero
  Comparison: 'Vergleich',
  '{productName} vs {alternative}': '{productName} vs {alternative}',
  'Full AI agent orchestration that runs in your browser — no cloud, no credits, no limits.':
    'Vollständige KI-Agenten-Orchestrierung in Ihrem Browser — keine Cloud, keine Credits, keine Limits.',
  'Try {productName} Free →': '{productName} kostenlos testen →',
  'View on GitHub': 'Auf GitHub ansehen',

  // TL;DR
  Privacy: 'Datenschutz',
  '100% client-side': '100% clientseitig',
  'Cloud (Meta infra)': 'Cloud (Meta-Infrastruktur)',
  Pricing: 'Preise',
  'Free forever': 'Für immer kostenlos',
  'From $39/mo': 'Ab 39 $/Monat',
  Orchestration: 'Orchestrierung',
  'Multi-agent teams': 'Multi-Agenten-Teams',
  'Single agent': 'Einzelner Agent',

  // Feature table
  'Feature Comparison': 'Funktionsvergleich',
  'Head-to-Head Comparison': 'Direkter Vergleich',
  Feature: 'Funktion',

  // Feature names + devs + alt
  'Open Source': 'Open Source',
  'MIT License': 'MIT-Lizenz',
  No: 'Nein',
  'Browser-Native': 'Browser-nativ',
  Yes: 'Ja',
  'Web app (cloud)': 'Web-App (Cloud)',
  'Data Stays Local': 'Daten bleiben lokal',
  'Multi-Agent Orchestration': 'Multi-Agenten-Orchestrierung',
  Advanced: 'Fortgeschritten',
  'Bring Your Own Keys': 'Eigene Schlüssel mitbringen',
  'Offline Capable': 'Offline-fähig',
  'P2P Sync': 'P2P-Synchronisation',
  'Agent Memory': 'Agenten-Gedächtnis',
  'Projects only': 'Nur Projekte',
  'LLM Provider Choice': 'LLM-Anbieterauswahl',
  '6+ providers': '6+ Anbieter',
  'Locked to {alternative}': 'Gebunden an {alternative}',
  'Free Tier': 'Kostenloses Angebot',
  Unlimited: 'Unbegrenzt',
  '4,000 credits/mo': '4.000 Credits/Monat',

  // Advantages
  'Why {productName}': 'Warum {productName}',
  'Why Teams Choose {productName} over {alternative}':
    'Warum Teams {productName} statt {alternative} wählen',
  'True Privacy': 'Echte Privatsphäre',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Manus processes everything on Meta\u2019s cloud infrastructure.':
    'Alle Daten bleiben in Ihrem Browser — IndexedDB, verschlüsselte Tokens, keine Telemetrie. Manus verarbeitet alles auf Metas Cloud-Infrastruktur.',
  'Zero Platform Cost': 'Keine Plattformkosten',
  'Pay only for your own LLM API usage. No $39/month subscription, no credit limits, no surprise bills.':
    'Zahlen Sie nur für Ihre eigene LLM-API-Nutzung. Kein Abo für 39 $/Monat, keine Kreditlimits, keine Überraschungsrechnungen.',
  'Multi-Agent Teams': 'Multi-Agenten-Teams',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} runs a single agent per task.':
    'Koordinieren Sie spezialisierte Agenten-Teams mit Abhängigkeitsauflösung und paralleler Ausführung. {alternative} führt einen einzelnen Agenten pro Aufgabe aus.',
  'Provider Freedom': 'Anbieterfreiheit',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own infrastructure.':
    'Wechseln Sie zwischen OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} bindet Sie an die eigene Infrastruktur.',

  // Pricing
  'Stop Paying for the Platform': 'Hören Sie auf, für die Plattform zu zahlen',
  '{productName}': '{productName}',
  '$0/mo': '0 $/Monat',
  'Unlimited agents': 'Unbegrenzte Agenten',
  'All features included': 'Alle Funktionen inklusive',
  'Full data privacy': 'Vollständiger Datenschutz',
  'BYOK \u2014 any LLM provider': 'BYOK — jeder LLM-Anbieter',
  'Credit-based usage': 'Kreditbasierte Nutzung',
  'Paid tiers for more': 'Kostenpflichtige Stufen für mehr',
  'Cloud-only processing': 'Nur Cloud-Verarbeitung',
  'Locked to {alternative} infra': 'Gebunden an {alternative}-Infrastruktur',

  // Honest take
  'Honest Take': 'Ehrliche Einschätzung',
  'Who Should Choose What': 'Wer sollte was wählen',
  'Choose {productName} if you\u2026':
    'Wählen Sie {productName}, wenn Sie\u2026',
  'Care about data privacy and sovereignty':
    'Wert auf Datenschutz und Datensouveränität legen',
  'Want full control over LLM providers and costs':
    'Volle Kontrolle über LLM-Anbieter und Kosten wollen',
  'Need multi-agent orchestration with team coordination':
    'Multi-Agenten-Orchestrierung mit Teamkoordination brauchen',
  'Prefer open-source, self-hosted solutions':
    'Open-Source- und selbstgehostete Lösungen bevorzugen',
  'Want to work offline or in air-gapped environments':
    'Offline oder in isolierten Umgebungen arbeiten wollen',
  'Consider {alternative} if you\u2026':
    'Ziehen Sie {alternative} in Betracht, wenn Sie\u2026',
  'Want a polished, zero-config SaaS experience out of the box':
    'Eine sofort einsatzbereite SaaS-Erfahrung ohne Konfiguration wollen',
  'Prefer not to manage your own LLM API keys':
    'Ihre eigenen LLM-API-Schlüssel nicht verwalten möchten',
  'Need built-in Slack integration and scheduled tasks':
    'Integrierte Slack-Integration und geplante Aufgaben brauchen',

  // OpenManus — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Python, no server, no setup.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 kein Python, kein Server, keine Einrichtung.',

  // OpenManus — TL;DR
  'Python environment': 'Python-Umgebung',
  'Python framework': 'Python-Framework',
  UX: 'UX',
  'Visual UI': 'Visuelle Oberfl\u00e4che',
  'Command-line / code-first': 'Kommandozeile / Code-first',

  // OpenManus — Feature table
  'No (Python)': 'Nein (Python)',
  'Yes (self-hosted)': 'Ja (selbst gehostet)',
  'Basic flows': 'Einfache Abl\u00e4ufe',
  'No (needs API)': 'Nein (braucht API)',
  'OpenAI-compatible': 'OpenAI-kompatibel',

  // OpenManus — Advantages
  'No Python, no dependencies, no virtual environments \u2014 just open a browser and start orchestrating agents instantly.':
    'Kein Python, keine Abh\u00e4ngigkeiten, keine virtuellen Umgebungen \u2014 einfach den Browser \u00f6ffnen und sofort Agenten orchestrieren.',
  'Visual Experience': 'Visuelle Erfahrung',
  'Full graphical UI with agent visualization, real-time workflow tracking, and drag-and-drop. {alternative} is a code-first, command-line tool.':
    'Vollst\u00e4ndige grafische Oberfl\u00e4che mit Agenten-Visualisierung, Echtzeit-Workflow-Tracking und Drag-and-Drop. {alternative} ist ein Code-first-Kommandozeilentool.',
  'Agent Memory & Learning': 'Agenten-Ged\u00e4chtnis & Lernen',
  'Agents remember context across conversations with a persistent memory system and human review. {alternative} has no built-in memory layer.':
    'Agenten erinnern sich an den Kontext \u00fcber Gespr\u00e4che hinweg mit einem persistenten Ged\u00e4chtnissystem und menschlicher \u00dcberpr\u00fcfung. {alternative} hat keine eingebaute Ged\u00e4chtnisschicht.',
  'Works on any device including mobile \u2014 no install, no server, no Python runtime. Everything runs client-side as a PWA.':
    'Funktioniert auf jedem Ger\u00e4t einschlie\u00dflich Mobilger\u00e4ten \u2014 keine Installation, kein Server, keine Python-Laufzeit. Alles l\u00e4uft clientseitig als PWA.',

  // OpenManus — Pricing
  'Free (self-hosted)': 'Kostenlos (selbst gehostet)',
  'Requires Python environment': 'Erfordert Python-Umgebung',
  'No managed hosting': 'Kein verwaltetes Hosting',
  'Setup & maintenance required': 'Einrichtung & Wartung erforderlich',
  'CLI-first interface': 'Kommandozeilen-Oberfl\u00e4che',

  // OpenManus — Honest take
  'Need Python-based extensibility and custom agent code':
    'Python-basierte Erweiterbarkeit und benutzerdefinierten Agenten-Code ben\u00f6tigen',
  'Prefer a code-first approach over visual UI':
    'Einen Code-first-Ansatz gegen\u00fcber visueller Oberfl\u00e4che bevorzugen',
  'Want A2A protocol support': 'A2A-Protokollunterst\u00fctzung w\u00fcnschen',

  // CTA
  'Ready to Take Control of Your AI Workflow?':
    'Bereit, die Kontrolle \u00fcber Ihren KI-Workflow zu \u00fcbernehmen?',
  'Start using {productName} for free \u2014 no account needed, no credit card, no server to set up.':
    'Nutzen Sie {productName} kostenlos \u2014 kein Konto n\u00f6tig, keine Kreditkarte, kein Server einzurichten.',
  'Get Started \u2192': 'Loslegen \u2192',
  'View Source on GitHub': 'Quellcode auf GitHub ansehen',

  // Lemon AI — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Node.js, no limits.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 kein Docker, kein Node.js, keine Grenzen.',

  // Lemon AI — TL;DR
  Setup: 'Einrichtung',
  'Zero install (browser)': 'Keine Installation (Browser)',
  'Docker + Node.js': 'Docker + Node.js',
  Architecture: 'Architektur',
  'Browser-native PWA': 'Browser-native PWA',
  'Desktop app (Vue + Node.js)': 'Desktop-App (Vue + Node.js)',

  // Lemon AI — Feature table
  'Apache 2.0': 'Apache 2.0',
  'No (desktop app)': 'Nein (Desktop-App)',
  'Yes (Docker sandbox)': 'Ja (Docker-Sandbox)',
  'Partial (local LLM only)': 'Teilweise (nur lokales LLM)',
  'Self-evolving': 'Selbstentwickelnd',
  'Free + subscription': 'Kostenlos + Abonnement',

  // Lemon AI — Advantages
  'Zero Setup': 'Keine Einrichtung',
  'No Docker or Node.js needed, just open your browser. {alternative} requires a local Docker environment and Node.js backend to run.':
    'Kein Docker oder Node.js n\u00f6tig, \u00f6ffnen Sie einfach Ihren Browser. {alternative} ben\u00f6tigt eine lokale Docker-Umgebung und ein Node.js-Backend.',
  'Full team orchestration with dependency resolution, not just single agent. {alternative} runs one agent at a time.':
    'Vollst\u00e4ndige Team-Orchestrierung mit Abh\u00e4ngigkeitsaufl\u00f6sung, nicht nur ein einzelner Agent. {alternative} f\u00fchrt jeweils nur einen Agenten aus.',
  'Works on any device, no installation, progressive web app. {alternative} is a desktop application built with Vue + Node.js.':
    'Funktioniert auf jedem Ger\u00e4t, keine Installation, Progressive Web App. {alternative} ist eine Desktop-Anwendung mit Vue + Node.js.',
  'P2P Collaboration': 'P2P-Zusammenarbeit',
  'Cross-device sync via WebRTC, real-time collaboration. {alternative} has no built-in sync or collaboration features.':
    'Ger\u00e4te\u00fcbergreifende Synchronisierung via WebRTC, Echtzeit-Zusammenarbeit. {alternative} hat keine integrierten Sync- oder Kollaborationsfunktionen.',

  // Lemon AI — Pricing
  'Free + paid tiers': 'Kostenlos + kostenpflichtige Stufen',
  'Online subscription available': 'Online-Abonnement verf\u00fcgbar',
  'Requires Docker for sandbox': 'Erfordert Docker f\u00fcr Sandbox',
  'Node.js backend required': 'Node.js-Backend erforderlich',
  'Single agent architecture': 'Einzelagenten-Architektur',

  // Lemon AI — Honest take
  'Need Docker VM sandbox for safe code execution':
    'Docker-VM-Sandbox f\u00fcr sichere Code-Ausf\u00fchrung ben\u00f6tigen',
  'Want built-in deep search and vibe coding':
    'Integrierte Tiefensuche und Vibe Coding w\u00fcnschen',
  'Prefer a self-evolving memory system':
    'Ein selbstentwickelndes Ged\u00e4chtnissystem bevorzugen',
  // DeepChat — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no download, no Electron, no limits.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 kein Download, kein Electron, keine Limits.',

  // DeepChat — TL;DR
  'Electron app download': 'Electron-App-Download',
  'Single chat interface': 'Einzelne Chat-Oberfl\u00e4che',
  'Desktop app (Electron)': 'Desktop-App (Electron)',

  // DeepChat — Feature table
  'No (Electron desktop)': 'Nein (Electron-Desktop)',
  'No (single chat)': 'Nein (einzelner Chat)',
  'Yes (30+ providers)': 'Ja (30+ Anbieter)',
  'Yes (with Ollama)': 'Ja (mit Ollama)',
  '30+ providers': '30+ Anbieter',

  // DeepChat — Advantages
  'Zero Install': 'Keine Installation',
  'No download, no Electron app. Just open your browser on any device. {alternative} requires a desktop application download.':
    'Kein Download, keine Electron-App. \u00d6ffnen Sie einfach Ihren Browser auf jedem Ger\u00e4t. {alternative} erfordert den Download einer Desktop-Anwendung.',
  'Coordinate specialized agent teams with dependency resolution. {alternative} is a single-chat interface without orchestration.':
    'Koordinieren Sie spezialisierte Agententeams mit Abh\u00e4ngigkeitsaufl\u00f6sung. {alternative} ist eine Einzelchat-Oberfl\u00e4che ohne Orchestrierung.',
  'Persistent agent memory with human review, categories, confidence levels. {alternative} has no memory system.':
    'Persistenter Agentenspeicher mit menschlicher \u00dcberpr\u00fcfung, Kategorien, Vertrauensstufen. {alternative} hat kein Speichersystem.',
  'Cross-device synchronization via Yjs/WebRTC. {alternative} is limited to one device.':
    'Ger\u00e4te\u00fcbergreifende Synchronisation via Yjs/WebRTC. {alternative} ist auf ein Ger\u00e4t beschr\u00e4nkt.',

  // DeepChat — Pricing
  Free: 'Kostenlos',
  'Desktop-only (Electron)': 'Nur Desktop (Electron)',
  'No multi-agent orchestration': 'Keine Multi-Agenten-Orchestrierung',
  'No P2P sync or collaboration':
    'Keine P2P-Synchronisation oder Zusammenarbeit',
  'No agent memory system': 'Kein Agenten-Speichersystem',

  // DeepChat — Honest take
  'Prefer a native desktop app experience with multi-window UI':
    'Eine native Desktop-App-Erfahrung mit Multi-Fenster-UI bevorzugen',
  'Need MCP tool calling and ACP agent protocol support':
    'MCP-Tool-Aufrufe und ACP-Agentenprotokoll-Unterst\u00fctzung ben\u00f6tigen',
  'Want built-in search enhancement (Brave, Google, Bing)':
    'Integrierte Suchverbesserung (Brave, Google, Bing) wollen',

  // HappyCapy — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no cloud sandbox, no credits, no limits.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 keine Cloud-Sandbox, keine Credits, keine Limits.',

  // HappyCapy — TL;DR
  'Cloud sandbox': 'Cloud-Sandbox',
  'From ${price}/mo': 'Ab ${price}/Monat',
  'Closed source': 'Nicht Open Source',

  // HappyCapy — Feature table
  'No (cloud infra)': 'Nein (Cloud-Infrastruktur)',
  'Agent teams (preview)': 'Agenten-Teams (Vorschau)',
  'Via skills': '\u00dcber Skills',
  '{alternative} models': '{alternative}-Modelle',
  'Limited credits': 'Begrenzte Credits',

  // HappyCapy — Advantages
  'All processing stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} runs everything on a cloud sandbox.':
    'Alle Verarbeitung bleibt in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. {alternative} f\u00fchrt alles in einer Cloud-Sandbox aus.',
  'No subscription, no credits. {alternative} starts at $17/mo and goes up to $200/mo for full features.':
    'Kein Abonnement, keine Credits. {alternative} beginnt bei 17 $/Monat und geht bis zu 200 $/Monat f\u00fcr alle Funktionen.',
  'Full MIT-licensed codebase \u2014 inspect, modify, self-host. {alternative} is closed source.':
    'Vollst\u00e4ndig MIT-lizenzierte Codebasis \u2014 pr\u00fcfen, \u00e4ndern, selbst hosten. {alternative} ist nicht Open Source.',
  'Use any LLM provider \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their model access.':
    'Nutzen Sie jeden LLM-Anbieter \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} bindet Sie an deren Modellzugang.',

  // HappyCapy — Pricing
  'Closed-source platform': 'Closed-Source-Plattform',
  'Locked to {alternative} models': 'Gebunden an {alternative}-Modelle',

  // HappyCapy — Honest take
  'Want a managed cloud sandbox environment':
    'Eine verwaltete Cloud-Sandbox-Umgebung w\u00fcnschen',
  'Need built-in email integration and scheduling':
    'Integrierte E-Mail-Integration und Terminplanung brauchen',
  'Prefer access to 150+ models without managing API keys':
    'Zugang zu 150+ Modellen ohne Verwaltung von API-Schl\u00fcsseln bevorzugen',

  // Kortix — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no database, no infrastructure.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 kein Docker, keine Datenbank, keine Infrastruktur.',

  // Kortix — TL;DR
  'Self-hosted (Docker + Supabase)': 'Selbst gehostet (Docker + Supabase)',
  'Docker + Supabase stack': 'Docker + Supabase-Stack',
  'Server-based (Python/FastAPI)': 'Serverbasiert (Python/FastAPI)',

  // Kortix — Feature table
  'Yes (custom license)': 'Ja (eigene Lizenz)',
  'No (Next.js dashboard)': 'Nein (Next.js-Dashboard)',
  'Self-hosted Supabase': 'Selbst gehostetes Supabase',
  'Single agent runtimes': 'Einzelagenten-Laufzeiten',
  'Yes (via LiteLLM)': 'Ja (via LiteLLM)',
  Limited: 'Begrenzt',
  'Multiple (via LiteLLM)': 'Mehrere (via LiteLLM)',
  'Zero Infrastructure': 'Keine Infrastruktur',
  'Requires Docker + Supabase': 'Erfordert Docker + Supabase',

  // Kortix — Advantages
  'Open your browser and start working \u2014 no Docker, no Supabase, no FastAPI server. {alternative} requires a full infrastructure stack to self-host.':
    '\u00d6ffnen Sie Ihren Browser und legen Sie los \u2014 kein Docker, kein Supabase, kein FastAPI-Server. {alternative} erfordert einen vollst\u00e4ndigen Infrastruktur-Stack zum Selbsthosten.',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. Kein Server, nicht einmal ein selbst gehosteter.',
  'Works on any device with a browser \u2014 desktop, tablet, or mobile. No server requirements, no Docker containers, fully offline capable.':
    'Funktioniert auf jedem Ger\u00e4t mit Browser \u2014 Desktop, Tablet oder Mobilger\u00e4t. Keine Server-Anforderungen, keine Docker-Container, voll offline-f\u00e4hig.',
  'No Infrastructure': 'Keine Infrastruktur',
  'No Docker containers, no PostgreSQL database, no Python backend to maintain. {alternative} needs ongoing server management and updates.':
    'Keine Docker-Container, keine PostgreSQL-Datenbank, kein Python-Backend zu warten. {alternative} ben\u00f6tigt laufende Serververwaltung und Updates.',

  // Kortix — Pricing
  'Requires server hosting costs': 'Erfordert Server-Hosting-Kosten',
  'Docker + Supabase infrastructure': 'Docker + Supabase-Infrastruktur',
  'Ongoing maintenance overhead': 'Laufender Wartungsaufwand',
  'Server administration required': 'Serveradministration erforderlich',

  // Kortix — Honest take
  'Need Docker-sandboxed code execution for agent runtimes':
    'Docker-Sandbox-Code-Ausf\u00fchrung f\u00fcr Agenten-Laufzeiten ben\u00f6tigen',
  'Want server-side agent runtimes with persistent processes':
    'Serverseitige Agenten-Laufzeiten mit persistenten Prozessen w\u00fcnschen',
  'Need built-in browser automation via Playwright':
    'Integrierte Browser-Automatisierung via Playwright brauchen',

  // AgenticSeek — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no setup.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 kein Docker, kein Python, keine Einrichtung.',

  // AgenticSeek — TL;DR
  'Docker + Python setup': 'Docker + Python-Einrichtung',
  'Single agent routing': 'Einzelagenten-Routing',
  'Desktop (Python + Docker)': 'Desktop (Python + Docker)',

  // AgenticSeek — Feature table
  'GPL-3.0': 'GPL-3.0',
  'No (Python + Docker)': 'Nein (Python + Docker)',
  'Smart routing': 'Intelligentes Routing',
  'Yes (local LLM)': 'Ja (lokales LLM)',
  'Session recovery': 'Sitzungswiederherstellung',
  '8+ providers': '8+ Anbieter',

  // AgenticSeek — Advantages
  'No Python, no Docker, no SearxNG \u2014 just open your browser. {alternative} requires a full Docker + Python environment.':
    'Kein Python, kein Docker, kein SearxNG \u2014 einfach den Browser \u00f6ffnen. {alternative} erfordert eine vollst\u00e4ndige Docker + Python-Umgebung.',
  'Full team orchestration with dependency resolution and parallel execution. {alternative} uses smart routing to a single agent.':
    'Vollst\u00e4ndige Team-Orchestrierung mit Abh\u00e4ngigkeitsaufl\u00f6sung und paralleler Ausf\u00fchrung. {alternative} nutzt intelligentes Routing zu einem einzelnen Agenten.',
  'Works on any device including mobile. {alternative} is desktop-only with Python + Docker.':
    'Funktioniert auf jedem Ger\u00e4t einschlie\u00dflich Mobilger\u00e4ten. {alternative} ist nur f\u00fcr Desktop mit Python + Docker.',
  'Cross-device sync via Yjs/WebRTC. {alternative} has no collaboration features.':
    'Ger\u00e4te\u00fcbergreifende Synchronisation via Yjs/WebRTC. {alternative} hat keine Kollaborationsfunktionen.',

  // AgenticSeek — Pricing
  'Requires Docker + Python': 'Erfordert Docker + Python',
  'SearxNG setup needed': 'SearxNG-Einrichtung erforderlich',
  'Desktop only \u2014 no mobile': 'Nur Desktop \u2014 kein Mobilger\u00e4t',
  'GPL-3.0 license (restrictive)': 'GPL-3.0-Lizenz (restriktiv)',

  // AgenticSeek — Honest take
  'Need autonomous web browsing with stealth capabilities':
    'Autonomes Surfen mit Stealth-F\u00e4higkeiten ben\u00f6tigen',
  'Want local code execution in multiple languages (Python, C, Go, Java)':
    'Lokale Code-Ausf\u00fchrung in mehreren Sprachen (Python, C, Go, Java) w\u00fcnschen',
  'Prefer voice-enabled interaction with speech-to-text':
    'Sprachgest\u00fctzte Interaktion mit Sprache-zu-Text bevorzugen',

  // Base44 — TL;DR
  'Cloud-based': 'Cloud-basiert',
  'App generation': 'App-Generierung',

  // Base44 — Feature table
  'Platform-selected': 'Plattform-ausgew\u00e4hlt',
  'General-Purpose AI': 'Allzweck-KI',
  'App building only': 'Nur App-Erstellung',
  'Limited free tier': 'Begrenztes kostenloses Angebot',

  // Base44 — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud infrastructure.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. {alternative} verarbeitet alles auf deren Cloud-Infrastruktur.',
  'Pay only for your own LLM API usage. No ${price}/month subscription, no feature gates, no surprise bills.':
    'Zahlen Sie nur f\u00fcr Ihre eigene LLM-API-Nutzung. Kein Abo f\u00fcr ${price}/Monat, keine Funktionsbeschr\u00e4nkungen, keine \u00dcberraschungsrechnungen.',
  'Beyond App Building': '\u00dcber App-Erstellung hinaus',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating apps.':
    'Koordinieren Sie spezialisierte Agenten-Teams f\u00fcr jede Aufgabe \u2014 Recherche, Schreiben, Analyse, Entwicklung. {alternative} ist auf die Generierung von Apps beschr\u00e4nkt.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} selects AI models for you with no choice.':
    'Wechseln Sie zwischen OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} w\u00e4hlt KI-Modelle f\u00fcr Sie ohne Wahlm\u00f6glichkeit.',

  // Base44 — Pricing
  'Paid plans for more features':
    'Kostenpflichtige Pl\u00e4ne f\u00fcr mehr Funktionen',
  'No bring-your-own-key support':
    'Keine Bring-Your-Own-Key-Unterst\u00fctzung',

  // Base44 — Honest take
  'Want to generate full-stack apps from natural language prompts':
    'Full-Stack-Apps aus nat\u00fcrlichsprachigen Prompts generieren wollen',
  'Prefer built-in hosting, auth, and database without setup':
    'Integriertes Hosting, Authentifizierung und Datenbank ohne Einrichtung bevorzugen',
  'Need one-click publish with custom domains and analytics':
    'Ein-Klick-Ver\u00f6ffentlichung mit eigenen Domains und Analysen brauchen',

  // ChatGPT — TL;DR
  'Cloud (OpenAI infra)': 'Cloud (OpenAI-Infrastruktur)',

  // ChatGPT — Feature table
  'Yes, with human review': 'Ja, mit menschlicher \u00dcberpr\u00fcfung',
  'Locked to OpenAI': 'Gebunden an OpenAI',
  'No \u2014 subscription required': 'Nein \u2014 Abonnement erforderlich',

  // ChatGPT — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. ChatGPT Agent Mode processes everything on OpenAI\u2019s cloud infrastructure.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. Der ChatGPT Agent Mode verarbeitet alles auf OpenAIs Cloud-Infrastruktur.',
  'Pay only for your own LLM API usage. No $20\u2013$200/month subscription, no feature gates, no usage caps.':
    'Zahlen Sie nur f\u00fcr Ihre eigene LLM-API-Nutzung. Kein Abo f\u00fcr 20\u2013200 $/Monat, keine Funktionsbeschr\u00e4nkungen, keine Nutzungslimits.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into OpenAI\u2019s models only.':
    'Wechseln Sie zwischen OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} bindet Sie ausschlie\u00dflich an OpenAIs Modelle.',

  // ChatGPT — Pricing
  '$20/mo Plus or $200/mo Pro': '20 $/Monat Plus oder 200 $/Monat Pro',
  'Locked to OpenAI models': 'Gebunden an OpenAI-Modelle',
  'No bring-your-own-key option': 'Keine Bring-Your-Own-Key-Option',

  // ChatGPT — Honest take
  'Want a polished, all-in-one ChatGPT experience with zero setup':
    'Eine ausgefeilte All-in-One-ChatGPT-Erfahrung ohne Einrichtung w\u00fcnschen',
  'Need built-in browsing, code interpreter, and file analysis in one tool':
    'Integriertes Surfen, Code-Interpreter und Dateianalyse in einem Tool brauchen',

  // DataKit — Hero
  'Full AI agent orchestration that runs in your browser \u2014 not just data analysis, but any task.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 nicht nur Datenanalyse, sondern jede Aufgabe.',

  // DataKit — TL;DR
  Scope: 'Umfang',
  'Multi-agent platform': 'Multi-Agenten-Plattform',
  'Data analysis tool': 'Datenanalyse-Tool',
  'LLM Providers': 'LLM-Anbieter',
  'Data-focused AI': 'Datenfokussierte KI',
  Collaboration: 'Zusammenarbeit',
  'P2P sync & teams': 'P2P-Sync & Teams',
  'Single-user': 'Einzelbenutzer',

  // DataKit — Feature table
  Likely: 'Wahrscheinlich',
  'Data analysis only': 'Nur Datenanalyse',

  // DataKit — Advantages
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused solely on data file analysis.':
    'Koordinieren Sie spezialisierte Agenten-Teams f\u00fcr jede Aufgabe \u2014 Recherche, Schreiben, Analyse, Entwicklung. {alternative} konzentriert sich ausschlie\u00dflich auf Dateianalyse.',
  'Agent Memory & Knowledge': 'Agenten-Ged\u00e4chtnis & Wissen',
  'Agents learn from conversations and access a full knowledge base. {alternative} has no memory or knowledge management.':
    'Agenten lernen aus Gespr\u00e4chen und greifen auf eine vollst\u00e4ndige Wissensdatenbank zu. {alternative} hat kein Ged\u00e4chtnis- oder Wissensmanagement.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} is limited to data-specific AI capabilities.':
    'Wechseln Sie zwischen OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} ist auf datenspezifische KI-F\u00e4higkeiten beschr\u00e4nkt.',
  'Cross-device sync via Yjs/WebRTC for seamless teamwork. {alternative} is a single-user data analysis tool.':
    'Ger\u00e4te\u00fcbergreifende Synchronisation via Yjs/WebRTC f\u00fcr nahtlose Teamarbeit. {alternative} ist ein Einzelbenutzer-Datenanalyse-Tool.',

  // DataKit — Pricing
  'Free (open source)': 'Kostenlos (Open Source)',
  'Data analysis only \u2014 no orchestration':
    'Nur Datenanalyse \u2014 keine Orchestrierung',
  'No multi-agent collaboration': 'Keine Multi-Agenten-Zusammenarbeit',
  'No agent memory or knowledge base':
    'Kein Agenten-Ged\u00e4chtnis oder Wissensdatenbank',
  'No P2P sync or cross-device support':
    'Keine P2P-Synchronisation oder ger\u00e4te\u00fcbergreifende Unterst\u00fctzung',

  // DataKit — Honest take
  'Need dedicated CSV, JSON, XLS, or Parquet file analysis with AI assistance':
    'Dedizierte CSV-, JSON-, XLS- oder Parquet-Dateianalyse mit KI-Unterst\u00fctzung ben\u00f6tigen',
  'Want a lightweight, focused tool specifically for local data exploration':
    'Ein leichtgewichtiges, fokussiertes Tool speziell f\u00fcr lokale Datenexploration w\u00fcnschen',
  'Prefer a single-purpose data tool over a full orchestration platform':
    'Ein Einzelzweck-Datentool gegen\u00fcber einer vollst\u00e4ndigen Orchestrierungsplattform bevorzugen',

  // Dualite — TL;DR
  'From $29/mo': 'Ab 29 $/Monat',
  'App/web builder': 'App-/Web-Builder',

  // Dualite — Feature table
  '5 messages': '5 Nachrichten',
  'Figma-to-Code': 'Figma-zu-Code',

  // Dualite — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Dualite processes everything on their cloud servers.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. Dualite verarbeitet alles auf deren Cloud-Servern.',
  'Pay only for your own LLM API usage. No $29\u2013$79/month subscription, no message limits, no surprise bills.':
    'Zahlen Sie nur f\u00fcr Ihre eigene LLM-API-Nutzung. Kein Abo f\u00fcr 29\u201379 $/Monat, keine Nachrichtenlimits, keine \u00dcberraschungsrechnungen.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-prompt app generation.':
    'Koordinieren Sie spezialisierte Agenten-Teams mit Abh\u00e4ngigkeitsaufl\u00f6sung und paralleler Ausf\u00fchrung. {alternative} konzentriert sich auf Ein-Prompt-App-Generierung.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own models.':
    'Wechseln Sie zwischen OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} bindet Sie an deren eigene Modelle.',

  // Dualite — Pricing
  'Message-based limits': 'Nachrichtenbasierte Limits',
  '5 free messages only': 'Nur 5 kostenlose Nachrichten',

  // Dualite — Honest take
  'Need Figma-to-code conversion and app templates out of the box':
    'Figma-zu-Code-Konvertierung und App-Vorlagen sofort einsatzbereit brauchen',
  'Want a visual app builder with authentication and backend included':
    'Einen visuellen App-Builder mit Authentifizierung und Backend inklusive w\u00fcnschen',
  'Prefer prompt-to-app generation over multi-agent orchestration':
    'Prompt-zu-App-Generierung gegen\u00fcber Multi-Agenten-Orchestrierung bevorzugen',

  // HugstonOne — Hero
  'Multi-agent orchestration in any browser \u2014 vs a Windows-only local inference app.':
    'Multi-Agenten-Orchestrierung in jedem Browser \u2014 vs. eine reine Windows-App f\u00fcr lokale Inferenz.',

  // HugstonOne — TL;DR
  Platform: 'Plattform',
  'Any browser, any OS': 'Jeder Browser, jedes OS',
  'Windows desktop only': 'Nur Windows-Desktop',
  Agents: 'Agenten',
  'Multi-agent orchestration': 'Multi-Agenten-Orchestrierung',
  'Single-model inference': 'Einzelmodell-Inferenz',
  'Proprietary (free)': 'Propriet\u00e4r (kostenlos)',

  // HugstonOne — Feature table
  'No (proprietary)': 'Nein (propriet\u00e4r)',
  'Cross-Platform': 'Plattform\u00fcbergreifend',
  'Any OS with a browser': 'Jedes OS mit Browser',
  'Windows only': 'Nur Windows',
  'No \u2014 single-model only': 'Nein \u2014 nur Einzelmodell',
  'Cloud LLM Providers': 'Cloud-LLM-Anbieter',
  'None \u2014 local GGUF only': 'Keine \u2014 nur lokales GGUF',
  'Local Model Support': 'Lokale Modellunterst\u00fctzung',
  'Via Ollama': '\u00dcber Ollama',
  '10,000+ GGUF models': '10.000+ GGUF-Modelle',
  'Knowledge Base': 'Wissensdatenbank',
  'Yes \u2014 fully local': 'Ja \u2014 vollst\u00e4ndig lokal',

  // HugstonOne — Advantages
  'Any Device, Any OS': 'Jedes Ger\u00e4t, jedes OS',
  'Works on Mac, Linux, Windows, tablets, and phones \u2014 anywhere you have a browser. {alternative} is locked to Windows desktops.':
    'Funktioniert auf Mac, Linux, Windows, Tablets und Smartphones \u2014 \u00fcberall, wo Sie einen Browser haben. {alternative} ist auf Windows-Desktops beschr\u00e4nkt.',
  'Orchestrate entire teams of specialized AI agents that collaborate on complex tasks. {alternative} runs a single model at a time.':
    'Orchestrieren Sie ganze Teams spezialisierter KI-Agenten, die bei komplexen Aufgaben zusammenarbeiten. {alternative} f\u00fchrt jeweils nur ein einzelnes Modell aus.',
  'Cloud + Local Models': 'Cloud + lokale Modelle',
  'Access OpenAI, Anthropic, Gemini, Mistral, and more \u2014 plus local models via Ollama. {alternative} only supports local GGUF inference.':
    'Zugriff auf OpenAI, Anthropic, Gemini, Mistral und mehr \u2014 plus lokale Modelle via Ollama. {alternative} unterst\u00fctzt nur lokale GGUF-Inferenz.',
  'Open Source & Extensible': 'Open Source & erweiterbar',
  'Fully open-source under the MIT license with a marketplace, plugins, and community contributions. {alternative} is proprietary and closed.':
    'Vollst\u00e4ndig Open Source unter MIT-Lizenz mit Marktplatz, Plugins und Community-Beitr\u00e4gen. {alternative} ist propriet\u00e4r und geschlossen.',

  // HugstonOne — Pricing
  'Free (email required)': 'Kostenlos (E-Mail erforderlich)',
  'Windows only \u2014 no Mac or Linux':
    'Nur Windows \u2014 kein Mac oder Linux',
  'No cloud LLM provider support': 'Keine Cloud-LLM-Anbieterunterst\u00fctzung',
  'Proprietary \u2014 not open source':
    'Propriet\u00e4r \u2014 nicht Open Source',

  // HugstonOne — Honest take
  'Want a simple local GGUF inference app on Windows':
    'Eine einfache lokale GGUF-Inferenz-App auf Windows w\u00fcnschen',
  'Need GPU-accelerated local model inference with image-to-text':
    'GPU-beschleunigte lokale Modellinferenz mit Bild-zu-Text ben\u00f6tigen',
  'Prefer a desktop app with an integrated code editor and live preview':
    'Eine Desktop-App mit integriertem Code-Editor und Live-Vorschau bevorzugen',

  // LlamaPen — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no download, no Ollama dependency, no limits.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 kein Download, keine Ollama-Abh\u00e4ngigkeit, keine Limits.',

  // LlamaPen — TL;DR
  'Browser UI for Ollama': 'Browser-UI f\u00fcr Ollama',

  // LlamaPen — Feature table
  'Provider Support': 'Anbieterunterst\u00fctzung',
  '6+ providers (cloud + local)': '6+ Anbieter (Cloud + lokal)',
  'Ollama only': 'Nur Ollama',
  'Yes (Ollama web UI)': 'Ja (Ollama-Web-UI)',
  'Yes (PWA)': 'Ja (PWA)',
  'Requires Ollama running': 'Erfordert laufendes Ollama',
  'Marketplace & Connectors': 'Marktplatz & Konnektoren',

  // LlamaPen — Advantages
  'Multi-Provider Freedom': 'Multi-Anbieter-Freiheit',
  'Connect to OpenAI, Anthropic, Gemini, Ollama, and more. {alternative} only works with a local Ollama instance.':
    'Verbinden Sie sich mit OpenAI, Anthropic, Gemini, Ollama und mehr. {alternative} funktioniert nur mit einer lokalen Ollama-Instanz.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface.':
    'Koordinieren Sie spezialisierte Agenten-Teams mit Abh\u00e4ngigkeitsaufl\u00f6sung und paralleler Ausf\u00fchrung. {alternative} ist eine Einzelchat-Oberfl\u00e4che.',
  'Agent Memory & Knowledge Base': 'Agenten-Ged\u00e4chtnis & Wissensdatenbank',
  'Persistent memory with human review, plus a full knowledge base for document ingestion. {alternative} has neither.':
    'Persistentes Ged\u00e4chtnis mit menschlicher \u00dcberpr\u00fcfung, plus eine vollst\u00e4ndige Wissensdatenbank f\u00fcr Dokumentenaufnahme. {alternative} hat beides nicht.',
  'P2P Sync & Ecosystem': 'P2P-Sync & \u00d6kosystem',
  'Cross-device sync via Yjs/WebRTC, marketplace, connectors, and traces. {alternative} offers none of these.':
    'Ger\u00e4te\u00fcbergreifende Synchronisation via Yjs/WebRTC, Marktplatz, Konnektoren und Traces. {alternative} bietet nichts davon.',

  // LlamaPen — Pricing
  'Ollama-only (no cloud providers)': 'Nur Ollama (keine Cloud-Anbieter)',
  'No P2P sync or marketplace': 'Keine P2P-Synchronisation oder Marktplatz',

  // LlamaPen — Honest take
  'Only use local Ollama models and want the simplest possible chat UI':
    'Nur lokale Ollama-Modelle nutzen und die einfachste Chat-Oberfl\u00e4che w\u00fcnschen',
  'Don\u2019t need multi-agent orchestration or agent memory':
    'Keine Multi-Agenten-Orchestrierung oder Agenten-Ged\u00e4chtnis ben\u00f6tigen',
  'Want a lightweight, zero-config interface exclusively for Ollama':
    'Eine leichtgewichtige, konfigurationsfreie Oberfl\u00e4che ausschlie\u00dflich f\u00fcr Ollama w\u00fcnschen',

  // MiniMax — TL;DR
  'Cloud (MiniMax infra)': 'Cloud (MiniMax-Infrastruktur)',
  'Free tier + credits': 'Kostenloses Angebot + Credits',
  'Expert collection': 'Experten-Sammlung',

  // MiniMax — Feature table
  'Credit-based': 'Kreditbasiert',

  // MiniMax — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. MiniMax Agent processes everything on their cloud infrastructure.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. MiniMax Agent verarbeitet alles auf deren Cloud-Infrastruktur.',
  'Pay only for your own LLM API usage. No credit system, no usage caps, no surprise bills.':
    'Zahlen Sie nur f\u00fcr Ihre eigene LLM-API-Nutzung. Kein Kreditsystem, keine Nutzungslimits, keine \u00dcberraschungsrechnungen.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} offers an expert collection but lacks true multi-agent orchestration.':
    'Koordinieren Sie spezialisierte Agenten-Teams mit Abh\u00e4ngigkeitsaufl\u00f6sung und paralleler Ausf\u00fchrung. {alternative} bietet eine Experten-Sammlung, aber keine echte Multi-Agenten-Orchestrierung.',

  // MiniMax — Pricing
  'Free + credits': 'Kostenlos + Credits',
  'Credit-based usage system': 'Kreditbasiertes Nutzungssystem',
  'No bring-your-own-key': 'Kein Bring-Your-Own-Key',

  // MiniMax — Honest take
  'Want ready-made chatbot deployment to Telegram, Discord, or Slack':
    'Fertige Chatbot-Bereitstellung f\u00fcr Telegram, Discord oder Slack w\u00fcnschen',
  'Need built-in PPT creation and website building tools':
    'Integrierte PPT-Erstellung und Website-Bautools brauchen',
  'Prefer a zero-config SaaS with scheduled task execution':
    'Ein konfigurationsfreies SaaS mit geplanter Aufgabenausf\u00fchrung bevorzugen',

  // NextDocs — TL;DR
  'From $18/mo': 'Ab 18 $/Monat',
  'Document generation': 'Dokumentengenerierung',

  // NextDocs — Feature table
  'Platform-locked': 'Plattformgebunden',
  'Docs & slides only': 'Nur Dokumente & Folien',
  'Unlimited Usage': 'Unbegrenzte Nutzung',
  'Credit-based limits': 'Kreditbasierte Limits',

  // NextDocs — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud servers.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. {alternative} verarbeitet alles auf deren Cloud-Servern.',
  'Pay only for your own LLM API usage. No $18\u2013$90/month subscription, no credit limits, no feature gates.':
    'Zahlen Sie nur f\u00fcr Ihre eigene LLM-API-Nutzung. Kein Abo f\u00fcr 18\u201390 $/Monat, keine Kreditlimits, keine Funktionsbeschr\u00e4nkungen.',
  'Beyond Document Generation': '\u00dcber Dokumentengenerierung hinaus',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating documents and slides.':
    'Koordinieren Sie spezialisierte Agenten-Teams f\u00fcr jede Aufgabe \u2014 Recherche, Schreiben, Analyse, Entwicklung. {alternative} ist auf die Generierung von Dokumenten und Folien beschr\u00e4nkt.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their platform with no BYOK option.':
    'Wechseln Sie zwischen OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} bindet Sie an deren Plattform ohne BYOK-Option.',

  // NextDocs — Pricing
  'Free tier limited to 500 credits':
    'Kostenloses Angebot auf 500 Credits begrenzt',
  'Pro plans from $18 to $90/month': 'Pro-Pl\u00e4ne von 18 bis 90 $/Monat',

  // NextDocs — Honest take
  'Need polished document and slide generation from prompts':
    'Ausgefeilte Dokument- und Foliengenerierung aus Prompts ben\u00f6tigen',
  'Want multi-variant output with brand kit consistency':
    'Mehrfachvarianten-Ausgabe mit Brand-Kit-Konsistenz w\u00fcnschen',
  'Prefer built-in export to PDF, Google Slides, and PowerPoint':
    'Integrierten Export nach PDF, Google Slides und PowerPoint bevorzugen',

  // Replit — TL;DR
  'Cloud (Replit infra)': 'Cloud (Replit-Infrastruktur)',
  'Single agent (app builder)': 'Einzelner Agent (App-Builder)',

  // Replit — Feature table
  'Limited daily credits': 'Begrenzte t\u00e4gliche Credits',

  // Replit — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Replit Agent processes everything on their cloud infrastructure.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. Replit Agent verarbeitet alles auf deren Cloud-Infrastruktur.',
  'Pay only for your own LLM API usage. No $17\u2013$100/month subscription, no credit limits, no surprise bills.':
    'Zahlen Sie nur f\u00fcr Ihre eigene LLM-API-Nutzung. Kein Abo f\u00fcr 17\u2013100 $/Monat, keine Kreditlimits, keine \u00dcberraschungsrechnungen.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-agent app building.':
    'Koordinieren Sie spezialisierte Agenten-Teams mit Abh\u00e4ngigkeitsaufl\u00f6sung und paralleler Ausf\u00fchrung. {alternative} konzentriert sich auf Einzelagenten-App-Erstellung.',

  // Replit — Pricing
  'Credit-based usage ($20\u2013$100)':
    'Kreditbasierte Nutzung (20\u2013100 $)',
  'Paid tiers for more builds': 'Kostenpflichtige Stufen f\u00fcr mehr Builds',

  // Replit — Honest take
  'Need one-click deployment and built-in hosting for apps':
    'Ein-Klick-Bereitstellung und integriertes Hosting f\u00fcr Apps brauchen',
  'Want an all-in-one IDE with instant infrastructure setup':
    'Eine All-in-One-IDE mit sofortiger Infrastruktur-Einrichtung w\u00fcnschen',
  'Prefer a managed platform for full-stack app generation':
    'Eine verwaltete Plattform f\u00fcr Full-Stack-App-Generierung bevorzugen',

  // Roma — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Python, no Docker, no setup.':
    'Vollst\u00e4ndige KI-Agenten-Orchestrierung in Ihrem Browser \u2014 kein Python, kein Docker, keine Einrichtung.',

  // Roma — TL;DR
  'Python + Docker setup': 'Python + Docker-Einrichtung',
  'Code-first / API-first': 'Code-first / API-first',
  'Python + DSPy framework': 'Python + DSPy-Framework',

  // Roma — Feature table
  'Recursive pipeline': 'Rekursive Pipeline',
  'OpenRouter + major providers': 'OpenRouter + gro\u00dfe Anbieter',

  // Roma — Advantages
  'No Python, no Docker, no DSPy \u2014 just open your browser. {alternative} requires a full Python environment with Docker.':
    'Kein Python, kein Docker, kein DSPy \u2014 einfach den Browser \u00f6ffnen. {alternative} erfordert eine vollst\u00e4ndige Python-Umgebung mit Docker.',
  'Full graphical UI with agent visualization and real-time workflow tracking. {alternative} is a code-first framework with a REST API.':
    'Vollst\u00e4ndige grafische Oberfl\u00e4che mit Agenten-Visualisierung und Echtzeit-Workflow-Tracking. {alternative} ist ein Code-first-Framework mit REST-API.',
  'Persistent memory system and knowledge base with human review. {alternative} focuses on execution pipelines without built-in memory.':
    'Persistentes Ged\u00e4chtnissystem und Wissensdatenbank mit menschlicher \u00dcberpr\u00fcfung. {alternative} konzentriert sich auf Ausf\u00fchrungspipelines ohne eingebautes Ged\u00e4chtnis.',
  'Works on any device including mobile \u2014 no install, no server infrastructure. Everything runs client-side as a PWA.':
    'Funktioniert auf jedem Ger\u00e4t einschlie\u00dflich Mobilger\u00e4ten \u2014 keine Installation, keine Server-Infrastruktur. Alles l\u00e4uft clientseitig als PWA.',

  // Roma — Pricing
  'Requires Python + Docker': 'Erfordert Python + Docker',
  'No visual UI \u2014 code-first only':
    'Keine visuelle Oberfl\u00e4che \u2014 nur Code-first',
  'Server infrastructure needed': 'Server-Infrastruktur erforderlich',
  'No built-in knowledge base': 'Keine integrierte Wissensdatenbank',

  // Roma — Honest take
  'Need recursive task decomposition with DSPy-based prediction strategies':
    'Rekursive Aufgabenzerlegung mit DSPy-basierten Vorhersagestrategien ben\u00f6tigen',
  'Want a programmable pipeline with Atomizer, Planner, Executor, and Verifier stages':
    'Eine programmierbare Pipeline mit Atomizer-, Planner-, Executor- und Verifier-Stufen w\u00fcnschen',
  'Prefer MLflow observability and E2B sandboxed code execution':
    'MLflow-Observability und E2B-Sandbox-Code-Ausf\u00fchrung bevorzugen',

  // RunnerH — TL;DR
  'Cloud-based processing': 'Cloud-basierte Verarbeitung',
  'Enterprise (contact sales)': 'Enterprise (Vertrieb kontaktieren)',
  'Computer-use agent': 'Computer-Nutzungs-Agent',

  // RunnerH — Feature table
  Partially: 'Teilweise',
  'Cloud API/demo': 'Cloud-API/Demo',
  'Sub-agent architecture': 'Sub-Agenten-Architektur',
  'Proprietary Holo models': 'Propriet\u00e4re Holo-Modelle',
  'Cross-Platform Automation': 'Plattform\u00fcbergreifende Automatisierung',
  'Browser-based': 'Browserbasiert',
  'Desktop, web & mobile': 'Desktop, Web & Mobil',
  'None (enterprise only)': 'Keine (nur Enterprise)',

  // RunnerH — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Runner H processes everything on H Company\u2019s cloud infrastructure.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. Runner H verarbeitet alles auf der Cloud-Infrastruktur von H Company.',
  'Pay only for your own LLM API usage. Runner H runs are \u201cextremely costly\u201d and require enterprise contracts.':
    'Zahlen Sie nur f\u00fcr Ihre eigene LLM-API-Nutzung. Runner-H-Ausf\u00fchrungen sind \u201e\u00e4u\u00dferst kostspielig\u201c und erfordern Enterprise-Vertr\u00e4ge.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-task computer-use automation.':
    'Koordinieren Sie spezialisierte Agenten-Teams mit Abh\u00e4ngigkeitsaufl\u00f6sung und paralleler Ausf\u00fchrung. {alternative} konzentriert sich auf Einzelaufgaben-Computer-Automatisierung.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into proprietary Holo models.':
    'Wechseln Sie zwischen OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} bindet Sie an propriet\u00e4re Holo-Modelle.',

  // RunnerH — Pricing
  'Extremely costly per run': 'Extrem kostspielig pro Ausf\u00fchrung',
  'No self-serve pricing': 'Keine Self-Service-Preise',
  'Locked to proprietary models': 'Gebunden an propriet\u00e4re Modelle',

  // RunnerH — Honest take
  'Need SOTA computer-use automation across desktop, web, and mobile':
    'SOTA-Computer-Nutzungs-Automatisierung \u00fcber Desktop, Web und Mobil ben\u00f6tigen',
  'Require cross-platform GUI interaction with visual grounding':
    'Plattform\u00fcbergreifende GUI-Interaktion mit visuellem Grounding erfordern',
  'Have an enterprise budget and need benchmark-leading task completion':
    'Ein Enterprise-Budget haben und Benchmark-f\u00fchrende Aufgabenabschlussraten ben\u00f6tigen',

  // Trace — TL;DR
  'Not listed (beta)': 'Nicht gelistet (Beta)',
  'Closed-source': 'Closed Source',

  // Trace — Feature table
  'Workflow-based': 'Workflow-basiert',
  Unknown: 'Unbekannt',
  Availability: 'Verf\u00fcgbarkeit',
  'Available now': 'Jetzt verf\u00fcgbar',
  'Beta / waitlist': 'Beta / Warteliste',
  'Not publicly listed': 'Nicht \u00f6ffentlich gelistet',

  // Trace — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Trace processes everything on their cloud infrastructure.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. Trace verarbeitet alles auf deren Cloud-Infrastruktur.',
  'Available & Free': 'Verf\u00fcgbar & kostenlos',
  'Use {productName} today at no cost \u2014 no waitlist, no beta access required. Trace is still in closed beta with undisclosed pricing.':
    'Nutzen Sie {productName} heute kostenlos \u2014 keine Warteliste, kein Beta-Zugang erforderlich. Trace ist noch in geschlossener Beta mit unbekannten Preisen.',
  'Open Source & Transparent': 'Open Source & transparent',
  'Fully open-source under MIT license \u2014 inspect, modify, and self-host. Trace is closed-source with no public codebase.':
    'Vollst\u00e4ndig Open Source unter MIT-Lizenz \u2014 pr\u00fcfen, \u00e4ndern und selbst hosten. Trace ist Closed Source ohne \u00f6ffentliche Codebasis.',
  'Works Offline': 'Funktioniert offline',
  'Run entirely in your browser without internet after initial load. Trace\u2019s cloud-based architecture requires a constant connection.':
    'L\u00e4uft nach dem ersten Laden vollst\u00e4ndig in Ihrem Browser ohne Internet. Traces cloudbasierte Architektur erfordert eine st\u00e4ndige Verbindung.',

  // Trace — Pricing
  'Closed beta / waitlist only': 'Nur geschlossene Beta / Warteliste',
  'Pricing not publicly available':
    'Preise nicht \u00f6ffentlich verf\u00fcgbar',
  'BYOK status unknown': 'BYOK-Status unbekannt',

  // Trace — Honest take
  'Need a knowledge-graph context engine for enterprise workflows':
    'Eine Knowledge-Graph-Kontext-Engine f\u00fcr Enterprise-Workflows ben\u00f6tigen',
  'Want built-in SLA monitoring and department-level coordination':
    'Integriertes SLA-Monitoring und abteilungs\u00fcbergreifende Koordination w\u00fcnschen',
  'Require deep Slack, Notion, Jira, and Google Drive integrations out of the box':
    'Tiefe Slack-, Notion-, Jira- und Google-Drive-Integrationen sofort einsatzbereit erfordern',

  // V7Go — Feature table
  'Document processing': 'Dokumentenverarbeitung',
  'Document processing only': 'Nur Dokumentenverarbeitung',
  'No free tier': 'Kein kostenloses Angebot',

  // V7Go — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes all documents on their cloud infrastructure.':
    'Alle Daten bleiben in Ihrem Browser \u2014 IndexedDB, verschl\u00fcsselte Tokens, keine Telemetrie. {alternative} verarbeitet alle Dokumente auf deren Cloud-Infrastruktur.',
  'Pay only for your own LLM API usage. No enterprise contracts, no per-page pricing, no sales calls required.':
    'Zahlen Sie nur f\u00fcr Ihre eigene LLM-API-Nutzung. Keine Enterprise-Vertr\u00e4ge, keine Preise pro Seite, keine Vertriebsgespr\u00e4che erforderlich.',
  'Beyond Document Processing': '\u00dcber Dokumentenverarbeitung hinaus',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused on document understanding and data extraction.':
    'Koordinieren Sie spezialisierte Agenten-Teams f\u00fcr jede Aufgabe \u2014 Recherche, Schreiben, Analyse, Entwicklung. {alternative} konzentriert sich auf Dokumentenverst\u00e4ndnis und Datenextraktion.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} uses their own platform-selected models with no choice.':
    'Wechseln Sie zwischen OpenAI, Anthropic, Gemini, Ollama, Mistral und mehr. {alternative} verwendet eigene plattformausgew\u00e4hlte Modelle ohne Wahlm\u00f6glichkeit.',

  // V7Go — Pricing
  'No free tier available': 'Kein kostenloses Angebot verf\u00fcgbar',
  'Enterprise-only pricing': 'Nur Enterprise-Preise',
  'Cloud-only document processing': 'Nur Cloud-Dokumentenverarbeitung',

  // V7Go — Honest take
  'Need specialized document understanding and data extraction at enterprise scale':
    'Spezialisiertes Dokumentenverst\u00e4ndnis und Datenextraktion im Enterprise-Ma\u00dfstab ben\u00f6tigen',
  'Want automated workflows for processing PDFs, images, and structured documents':
    'Automatisierte Workflows f\u00fcr die Verarbeitung von PDFs, Bildern und strukturierten Dokumenten w\u00fcnschen',
  'Require enterprise integrations and dedicated support for document automation':
    'Enterprise-Integrationen und dedizierten Support f\u00fcr Dokumentenautomatisierung erfordern',
}
