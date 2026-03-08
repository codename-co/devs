import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Hero
  Comparison: 'Comparaison',
  '{productName} vs {alternative}': '{productName} vs {alternative}',
  'Full AI agent orchestration that runs in your browser — no cloud, no credits, no limits.':
    'Orchestration complète d\u2019agents IA dans votre navigateur — sans cloud, sans crédits, sans limites.',
  'Try {productName} Free →': 'Essayer {productName} gratuitement →',
  'View on GitHub': 'Voir sur GitHub',

  // TL;DR
  Privacy: 'Confidentialité',
  '100% client-side': '100% côté client',
  'Cloud (Meta infra)': 'Cloud (infra Meta)',
  Pricing: 'Tarification',
  'Free forever': 'Gratuit pour toujours',
  'From $39/mo': 'À partir de 39 $/mois',
  Orchestration: 'Orchestration',
  'Multi-agent teams': 'Équipes multi-agents',
  'Single agent': 'Agent unique',

  // Feature table
  'Feature Comparison': 'Comparaison des fonctionnalités',
  'Head-to-Head Comparison': 'Comparaison face à face',
  Feature: 'Fonctionnalité',

  // Feature names + devs + alt
  'Open Source': 'Open Source',
  'MIT License': 'Licence MIT',
  No: 'Non',
  'Browser-Native': 'Natif navigateur',
  Yes: 'Oui',
  'Web app (cloud)': 'Application web (cloud)',
  'Data Stays Local': 'Données locales',
  'Multi-Agent Orchestration': 'Orchestration multi-agents',
  Advanced: 'Avancée',
  'Bring Your Own Keys': 'Apportez vos propres clés',
  'Offline Capable': 'Fonctionne hors ligne',
  'P2P Sync': 'Synchronisation P2P',
  'Agent Memory': 'Mémoire d\u2019agent',
  'Projects only': 'Projets uniquement',
  'LLM Provider Choice': 'Choix du fournisseur LLM',
  '6+ providers': '6+ fournisseurs',
  'Locked to {alternative}': 'Verrouillé sur {alternative}',
  'Free Tier': 'Offre gratuite',
  Unlimited: 'Illimité',
  '4,000 credits/mo': '4 000 crédits/mois',

  // Advantages
  'Why {productName}': 'Pourquoi {productName}',
  'Why Teams Choose {productName} over {alternative}':
    'Pourquoi les équipes choisissent {productName} plutôt que {alternative}',
  'True Privacy': 'Vraie confidentialité',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Manus processes everything on Meta\u2019s cloud infrastructure.':
    'Toutes les données restent dans votre navigateur — IndexedDB, jetons chiffrés, zéro télémétrie. Manus traite tout sur l\u2019infrastructure cloud de Meta.',
  'Zero Platform Cost': 'Zéro coût de plateforme',
  'Pay only for your own LLM API usage. No $39/month subscription, no credit limits, no surprise bills.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Pas d\u2019abonnement à 39 $/mois, pas de limites de crédits, pas de factures surprises.',
  'Multi-Agent Teams': 'Équipes multi-agents',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} runs a single agent per task.':
    'Coordonnez des équipes d\u2019agents spécialisés avec résolution de dépendances et exécution parallèle. {alternative} exécute un seul agent par tâche.',
  'Provider Freedom': 'Liberté de fournisseur',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own infrastructure.':
    'Passez d\u2019OpenAI à Anthropic, Gemini, Ollama, Mistral et plus encore. {alternative} vous enferme dans sa propre infrastructure.',

  // Pricing
  'Stop Paying for the Platform': 'Arrêtez de payer pour la plateforme',
  '{productName}': '{productName}',
  '$0/mo': '0 $/mois',
  'Unlimited agents': 'Agents illimités',
  'All features included': 'Toutes les fonctionnalités incluses',
  'Full data privacy': 'Confidentialité totale des données',
  'BYOK \u2014 any LLM provider': 'BYOK — n\u2019importe quel fournisseur LLM',
  'Credit-based usage': 'Utilisation par crédits',
  'Paid tiers for more': 'Abonnements payants pour plus',
  'Cloud-only processing': 'Traitement cloud uniquement',
  'Locked to {alternative} infra': 'Verrouillé sur l\u2019infra {alternative}',

  // Honest take
  'Honest Take': 'Notre avis honnête',
  'Who Should Choose What': 'Qui devrait choisir quoi',
  'Choose {productName} if you\u2026': 'Choisissez {productName} si vous\u2026',
  'Care about data privacy and sovereignty':
    'Tenez à la confidentialité et à la souveraineté des données',
  'Want full control over LLM providers and costs':
    'Voulez un contrôle total sur les fournisseurs LLM et les coûts',
  'Need multi-agent orchestration with team coordination':
    'Avez besoin d\u2019orchestration multi-agents avec coordination d\u2019équipe',
  'Prefer open-source, self-hosted solutions':
    'Préférez les solutions open source et auto-hébergées',
  'Want to work offline or in air-gapped environments':
    'Voulez travailler hors ligne ou en environnement isolé',
  'Consider {alternative} if you\u2026':
    'Envisagez {alternative} si vous\u2026',
  'Want a polished, zero-config SaaS experience out of the box':
    'Voulez une expérience SaaS clé en main et sans configuration',
  'Prefer not to manage your own LLM API keys':
    'Préférez ne pas gérer vos propres clés API LLM',
  'Need built-in Slack integration and scheduled tasks':
    'Avez besoin d\u2019une intégration Slack native et de tâches planifiées',

  // OpenManus — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Python, no server, no setup.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 sans Python, sans serveur, sans installation.',

  // OpenManus — TL;DR
  Setup: 'Installation',
  'Zero install (browser)': 'Z\u00e9ro installation (navigateur)',
  'Python environment': 'Environnement Python',
  Architecture: 'Architecture',
  'Browser-native PWA': 'PWA native navigateur',
  'Python framework': 'Framework Python',
  UX: 'UX',
  'Visual UI': 'Interface visuelle',
  'Command-line / code-first': 'Ligne de commande / code d\u2019abord',

  // OpenManus — Feature table
  'No (Python)': 'Non (Python)',
  'Yes (self-hosted)': 'Oui (auto-h\u00e9berg\u00e9)',
  'Basic flows': 'Flux basiques',
  'No (needs API)': 'Non (n\u00e9cessite une API)',
  'OpenAI-compatible': 'Compatible OpenAI',

  // OpenManus — Advantages
  'Zero Setup': 'Z\u00e9ro configuration',
  'No Python, no dependencies, no virtual environments \u2014 just open a browser and start orchestrating agents instantly.':
    'Pas de Python, pas de d\u00e9pendances, pas d\u2019environnements virtuels \u2014 ouvrez simplement un navigateur et commencez \u00e0 orchestrer des agents instantan\u00e9ment.',
  'Visual Experience': 'Exp\u00e9rience visuelle',
  'Full graphical UI with agent visualization, real-time workflow tracking, and drag-and-drop. {alternative} is a code-first, command-line tool.':
    'Interface graphique compl\u00e8te avec visualisation des agents, suivi du workflow en temps r\u00e9el et glisser-d\u00e9poser. {alternative} est un outil en ligne de commande orient\u00e9 code.',
  'Agent Memory & Learning': 'M\u00e9moire et apprentissage des agents',
  'Agents remember context across conversations with a persistent memory system and human review. {alternative} has no built-in memory layer.':
    'Les agents se souviennent du contexte entre les conversations gr\u00e2ce \u00e0 un syst\u00e8me de m\u00e9moire persistante et une revue humaine. {alternative} n\u2019a pas de couche de m\u00e9moire int\u00e9gr\u00e9e.',
  'Works on any device including mobile \u2014 no install, no server, no Python runtime. Everything runs client-side as a PWA.':
    'Fonctionne sur tout appareil y compris mobile \u2014 sans installation, sans serveur, sans runtime Python. Tout s\u2019ex\u00e9cute c\u00f4t\u00e9 client en tant que PWA.',

  // OpenManus — Pricing
  'Free (self-hosted)': 'Gratuit (auto-h\u00e9berg\u00e9)',
  'Requires Python environment': 'N\u00e9cessite un environnement Python',
  'No managed hosting': 'Pas d\u2019h\u00e9bergement g\u00e9r\u00e9',
  'Setup & maintenance required': 'Installation et maintenance requises',
  'CLI-first interface': 'Interface en ligne de commande',

  // OpenManus — Honest take
  'Need Python-based extensibility and custom agent code':
    'Avez besoin d\u2019extensibilit\u00e9 Python et de code d\u2019agent personnalis\u00e9',
  'Prefer a code-first approach over visual UI':
    'Pr\u00e9f\u00e9rez une approche orient\u00e9e code plut\u00f4t qu\u2019une interface visuelle',
  'Want A2A protocol support': 'Voulez le support du protocole A2A',

  // DeepChat — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no download, no Electron, no limits.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 sans t\u00e9l\u00e9chargement, sans Electron, sans limites.',

  // DeepChat — TL;DR
  'Electron app download': 'T\u00e9l\u00e9chargement d\u2019app Electron',
  'Single chat interface': 'Interface de chat unique',
  'Desktop app (Electron)': 'Application de bureau (Electron)',

  // DeepChat — Feature table
  'Apache 2.0': 'Apache 2.0',
  'No (Electron desktop)': 'Non (bureau Electron)',
  'No (single chat)': 'Non (chat unique)',
  'Yes (30+ providers)': 'Oui (30+ fournisseurs)',
  'Yes (with Ollama)': 'Oui (avec Ollama)',
  '30+ providers': '30+ fournisseurs',

  // DeepChat — Advantages
  'Zero Install': 'Z\u00e9ro installation',
  'No download, no Electron app. Just open your browser on any device. {alternative} requires a desktop application download.':
    'Pas de t\u00e9l\u00e9chargement, pas d\u2019app Electron. Ouvrez simplement votre navigateur sur n\u2019importe quel appareil. {alternative} n\u00e9cessite le t\u00e9l\u00e9chargement d\u2019une application de bureau.',
  'Coordinate specialized agent teams with dependency resolution. {alternative} is a single-chat interface without orchestration.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s avec r\u00e9solution de d\u00e9pendances. {alternative} est une interface de chat unique sans orchestration.',
  'Persistent agent memory with human review, categories, confidence levels. {alternative} has no memory system.':
    'M\u00e9moire d\u2019agent persistante avec revue humaine, cat\u00e9gories, niveaux de confiance. {alternative} n\u2019a pas de syst\u00e8me de m\u00e9moire.',
  'Cross-device synchronization via Yjs/WebRTC. {alternative} is limited to one device.':
    'Synchronisation inter-appareils via Yjs/WebRTC. {alternative} est limit\u00e9 \u00e0 un seul appareil.',

  // DeepChat — Pricing
  Free: 'Gratuit',
  'Desktop-only (Electron)': 'Bureau uniquement (Electron)',
  'No multi-agent orchestration': 'Pas d\u2019orchestration multi-agents',
  'No P2P sync or collaboration': 'Pas de synchronisation P2P ni collaboration',
  'No agent memory system': 'Pas de syst\u00e8me de m\u00e9moire d\u2019agent',

  // DeepChat — Honest take
  'Prefer a native desktop app experience with multi-window UI':
    'Pr\u00e9f\u00e9rez une exp\u00e9rience d\u2019application de bureau native avec une interface multi-fen\u00eatres',
  'Need MCP tool calling and ACP agent protocol support':
    'Avez besoin d\u2019appels d\u2019outils MCP et du support du protocole d\u2019agent ACP',
  'Want built-in search enhancement (Brave, Google, Bing)':
    'Voulez une am\u00e9lioration de recherche int\u00e9gr\u00e9e (Brave, Google, Bing)',

  // Kortix — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no database, no infrastructure.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 sans Docker, sans base de donn\u00e9es, sans infrastructure.',

  // Kortix — TL;DR
  'Self-hosted (Docker + Supabase)':
    'Auto-h\u00e9berg\u00e9 (Docker + Supabase)',
  'Docker + Supabase stack': 'Stack Docker + Supabase',
  'Server-based (Python/FastAPI)': 'Bas\u00e9 serveur (Python/FastAPI)',

  // Kortix — Feature table
  'Yes (custom license)': 'Oui (licence personnalis\u00e9e)',
  'No (Next.js dashboard)': 'Non (tableau de bord Next.js)',
  'Self-hosted Supabase': 'Supabase auto-h\u00e9berg\u00e9',
  'Single agent runtimes': 'Runtimes agent unique',
  'Yes (via LiteLLM)': 'Oui (via LiteLLM)',
  Limited: 'Limit\u00e9',
  'Multiple (via LiteLLM)': 'Multiples (via LiteLLM)',
  'Zero Infrastructure': 'Z\u00e9ro infrastructure',
  'Requires Docker + Supabase': 'N\u00e9cessite Docker + Supabase',

  // Kortix — Advantages
  'Open your browser and start working \u2014 no Docker, no Supabase, no FastAPI server. {alternative} requires a full infrastructure stack to self-host.':
    'Ouvrez votre navigateur et commencez \u00e0 travailler \u2014 sans Docker, sans Supabase, sans serveur FastAPI. {alternative} n\u00e9cessite une infrastructure compl\u00e8te pour l\u2019auto-h\u00e9bergement.',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. Aucun serveur du tout, m\u00eame pas auto-h\u00e9berg\u00e9.',
  'Works on any device with a browser \u2014 desktop, tablet, or mobile. No server requirements, no Docker containers, fully offline capable.':
    'Fonctionne sur tout appareil avec un navigateur \u2014 bureau, tablette ou mobile. Aucune exigence serveur, aucun conteneur Docker, enti\u00e8rement capable hors ligne.',
  'No Infrastructure': 'Aucune infrastructure',
  'No Docker containers, no PostgreSQL database, no Python backend to maintain. {alternative} needs ongoing server management and updates.':
    'Aucun conteneur Docker, aucune base PostgreSQL, aucun backend Python \u00e0 maintenir. {alternative} n\u00e9cessite une gestion serveur et des mises \u00e0 jour continues.',

  // Kortix — Pricing
  'Requires server hosting costs':
    'N\u00e9cessite des co\u00fbts d\u2019h\u00e9bergement serveur',
  'Docker + Supabase infrastructure': 'Infrastructure Docker + Supabase',
  'Ongoing maintenance overhead': 'Charge de maintenance continue',
  'Server administration required': 'Administration serveur requise',

  // Kortix — Honest take
  'Need Docker-sandboxed code execution for agent runtimes':
    'Avez besoin d\u2019ex\u00e9cution de code sandbox\u00e9e Docker pour les runtimes d\u2019agents',
  'Want server-side agent runtimes with persistent processes':
    'Voulez des runtimes d\u2019agents c\u00f4t\u00e9 serveur avec des processus persistants',
  'Need built-in browser automation via Playwright':
    'Avez besoin d\u2019automatisation navigateur int\u00e9gr\u00e9e via Playwright',

  // CTA
  'Ready to Take Control of Your AI Workflow?':
    'Pr\u00eat \u00e0 prendre le contr\u00f4le de votre workflow IA ?',
  'Start using {productName} for free \u2014 no account needed, no credit card, no server to set up.':
    'Commencez \u00e0 utiliser {productName} gratuitement \u2014 pas de compte requis, pas de carte bancaire, pas de serveur \u00e0 configurer.',
  'Get Started \u2192': 'Commencer \u2192',
  'View Source on GitHub': 'Voir le code source sur GitHub',

  // Lemon AI — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Node.js, no limits.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 sans Docker, sans Node.js, sans limites.',

  // Lemon AI — TL;DR
  'Docker + Node.js': 'Docker + Node.js',
  'Desktop app (Vue + Node.js)': 'Application de bureau (Vue + Node.js)',

  // Lemon AI — Feature table
  'No (desktop app)': 'Non (application de bureau)',
  'Yes (Docker sandbox)': 'Oui (sandbox Docker)',
  'Partial (local LLM only)': 'Partiel (LLM local uniquement)',
  'Self-evolving': 'Auto-\u00e9volutif',
  'Free + subscription': 'Gratuit + abonnement',

  // Lemon AI — Advantages
  'No Docker or Node.js needed, just open your browser. {alternative} requires a local Docker environment and Node.js backend to run.':
    'Pas de Docker ni de Node.js n\u00e9cessaire, ouvrez simplement votre navigateur. {alternative} n\u00e9cessite un environnement Docker local et un backend Node.js.',
  'Full team orchestration with dependency resolution, not just single agent. {alternative} runs one agent at a time.':
    'Orchestration d\u2019\u00e9quipe compl\u00e8te avec r\u00e9solution de d\u00e9pendances, pas seulement un agent unique. {alternative} ex\u00e9cute un seul agent \u00e0 la fois.',
  'Works on any device, no installation, progressive web app. {alternative} is a desktop application built with Vue + Node.js.':
    'Fonctionne sur tout appareil, sans installation, application web progressive. {alternative} est une application de bureau construite avec Vue + Node.js.',
  'P2P Collaboration': 'Collaboration P2P',
  'Cross-device sync via WebRTC, real-time collaboration. {alternative} has no built-in sync or collaboration features.':
    'Synchronisation multi-appareils via WebRTC, collaboration en temps r\u00e9el. {alternative} n\u2019a pas de fonctionnalit\u00e9s de synchronisation ou de collaboration int\u00e9gr\u00e9es.',

  // Lemon AI — Pricing
  'Free + paid tiers': 'Gratuit + niveaux payants',
  'Online subscription available': 'Abonnement en ligne disponible',
  'Requires Docker for sandbox': 'N\u00e9cessite Docker pour le sandbox',
  'Node.js backend required': 'Backend Node.js requis',
  'Single agent architecture': 'Architecture \u00e0 agent unique',

  // Lemon AI — Honest take
  'Need Docker VM sandbox for safe code execution':
    'Avez besoin d\u2019un sandbox Docker VM pour une ex\u00e9cution de code s\u00e9curis\u00e9e',
  'Want built-in deep search and vibe coding':
    'Voulez une recherche approfondie int\u00e9gr\u00e9e et du vibe coding',
  'Prefer a self-evolving memory system':
    'Pr\u00e9f\u00e9rez un syst\u00e8me de m\u00e9moire auto-\u00e9volutif',

  // HappyCapy — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no cloud sandbox, no credits, no limits.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 sans sandbox cloud, sans cr\u00e9dits, sans limites.',

  // HappyCapy — TL;DR
  'Cloud sandbox': 'Sandbox cloud',
  'From ${price}/mo': '\u00c0 partir de ${price}/mois',
  'Closed source': 'Code ferm\u00e9',

  // HappyCapy — Feature table
  'No (cloud infra)': 'Non (infra cloud)',
  'Agent teams (preview)': '\u00c9quipes d\u2019agents (aper\u00e7u)',
  'Via skills': 'Via comp\u00e9tences',
  '{alternative} models': 'Mod\u00e8les {alternative}',
  'Limited credits': 'Cr\u00e9dits limit\u00e9s',

  // HappyCapy — Advantages
  'All processing stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} runs everything on a cloud sandbox.':
    'Tout le traitement reste dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. {alternative} ex\u00e9cute tout dans un sandbox cloud.',
  'No subscription, no credits. {alternative} starts at $17/mo and goes up to $200/mo for full features.':
    'Pas d\u2019abonnement, pas de cr\u00e9dits. {alternative} commence \u00e0 17 $/mois et monte jusqu\u2019\u00e0 200 $/mois pour toutes les fonctionnalit\u00e9s.',
  'Full MIT-licensed codebase \u2014 inspect, modify, self-host. {alternative} is closed source.':
    'Code source complet sous licence MIT \u2014 inspectez, modifiez, auto-h\u00e9bergez. {alternative} est \u00e0 code ferm\u00e9.',
  'Use any LLM provider \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their model access.':
    'Utilisez n\u2019importe quel fournisseur LLM \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral et plus. {alternative} vous enferme dans son acc\u00e8s aux mod\u00e8les.',

  // HappyCapy — Pricing
  'Closed-source platform': 'Plateforme \u00e0 code ferm\u00e9',
  'Locked to {alternative} models':
    'Verrouill\u00e9 sur les mod\u00e8les {alternative}',

  // HappyCapy — Honest take
  'Want a managed cloud sandbox environment':
    'Voulez un environnement sandbox cloud g\u00e9r\u00e9',
  'Need built-in email integration and scheduling':
    'Avez besoin d\u2019une int\u00e9gration e-mail native et de planification',
  'Prefer access to 150+ models without managing API keys':
    'Pr\u00e9f\u00e9rez l\u2019acc\u00e8s \u00e0 150+ mod\u00e8les sans g\u00e9rer de cl\u00e9s API',

  // AgenticSeek — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no setup.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 sans Docker, sans Python, sans installation.',

  // AgenticSeek — TL;DR
  'Docker + Python setup': 'Installation Docker + Python',
  'Single agent routing': 'Routage agent unique',
  'Desktop (Python + Docker)': 'Bureau (Python + Docker)',

  // AgenticSeek — Feature table
  'GPL-3.0': 'GPL-3.0',
  'No (Python + Docker)': 'Non (Python + Docker)',
  'Smart routing': 'Routage intelligent',
  'Yes (local LLM)': 'Oui (LLM local)',
  'Session recovery': 'R\u00e9cup\u00e9ration de session',
  '8+ providers': '8+ fournisseurs',

  // AgenticSeek — Advantages
  'No Python, no Docker, no SearxNG \u2014 just open your browser. {alternative} requires a full Docker + Python environment.':
    'Pas de Python, pas de Docker, pas de SearxNG \u2014 ouvrez simplement votre navigateur. {alternative} n\u00e9cessite un environnement Docker + Python complet.',
  'Full team orchestration with dependency resolution and parallel execution. {alternative} uses smart routing to a single agent.':
    'Orchestration d\u2019\u00e9quipe compl\u00e8te avec r\u00e9solution de d\u00e9pendances et ex\u00e9cution parall\u00e8le. {alternative} utilise un routage intelligent vers un seul agent.',
  'Works on any device including mobile. {alternative} is desktop-only with Python + Docker.':
    'Fonctionne sur tout appareil y compris mobile. {alternative} est limit\u00e9 au bureau avec Python + Docker.',
  'Cross-device sync via Yjs/WebRTC. {alternative} has no collaboration features.':
    'Synchronisation inter-appareils via Yjs/WebRTC. {alternative} n\u2019a pas de fonctionnalit\u00e9s de collaboration.',

  // AgenticSeek — Pricing
  'Requires Docker + Python': 'N\u00e9cessite Docker + Python',
  'SearxNG setup needed': 'Installation SearxNG requise',
  'Desktop only \u2014 no mobile': 'Bureau uniquement \u2014 pas de mobile',
  'GPL-3.0 license (restrictive)': 'Licence GPL-3.0 (restrictive)',

  // AgenticSeek — Honest take
  'Need autonomous web browsing with stealth capabilities':
    'Avez besoin de navigation web autonome avec capacit\u00e9s furtives',
  'Want local code execution in multiple languages (Python, C, Go, Java)':
    'Voulez l\u2019ex\u00e9cution locale de code dans plusieurs langages (Python, C, Go, Java)',
  'Prefer voice-enabled interaction with speech-to-text':
    'Pr\u00e9f\u00e9rez l\u2019interaction vocale avec reconnaissance vocale',

  // Base44 — TL;DR
  'Cloud-based': 'Bas\u00e9 cloud',
  'App generation': 'G\u00e9n\u00e9ration d\u2019apps',

  // Base44 — Feature table
  'Platform-selected': 'S\u00e9lectionn\u00e9 par la plateforme',
  'General-Purpose AI': 'IA g\u00e9n\u00e9raliste',
  'App building only': 'Cr\u00e9ation d\u2019apps uniquement',
  'Limited free tier': 'Offre gratuite limit\u00e9e',

  // Base44 — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud infrastructure.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. {alternative} traite tout sur son infrastructure cloud.',
  'Pay only for your own LLM API usage. No ${price}/month subscription, no feature gates, no surprise bills.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Pas d\u2019abonnement \u00e0 ${price}/mois, pas de restrictions de fonctionnalit\u00e9s, pas de factures surprises.',
  'Beyond App Building': 'Au-del\u00e0 de la cr\u00e9ation d\u2019apps',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating apps.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s pour toute t\u00e2che \u2014 recherche, r\u00e9daction, analyse, d\u00e9veloppement. {alternative} se limite \u00e0 la g\u00e9n\u00e9ration d\u2019apps.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} selects AI models for you with no choice.':
    'Passez d\u2019OpenAI \u00e0 Anthropic, Gemini, Ollama, Mistral et plus. {alternative} s\u00e9lectionne les mod\u00e8les IA pour vous sans choix.',

  // Base44 — Pricing
  'Paid plans for more features':
    'Abonnements payants pour plus de fonctionnalit\u00e9s',
  'No bring-your-own-key support': 'Pas de support BYOK',

  // Base44 — Honest take
  'Want to generate full-stack apps from natural language prompts':
    'Voulez g\u00e9n\u00e9rer des apps full-stack \u00e0 partir de prompts en langage naturel',
  'Prefer built-in hosting, auth, and database without setup':
    'Pr\u00e9f\u00e9rez l\u2019h\u00e9bergement, l\u2019authentification et la base de donn\u00e9es int\u00e9gr\u00e9s sans configuration',
  'Need one-click publish with custom domains and analytics':
    'Avez besoin de publication en un clic avec domaines personnalis\u00e9s et analytiques',

  // ChatGPT — TL;DR
  'Cloud (OpenAI infra)': 'Cloud (infra OpenAI)',

  // ChatGPT — Feature table
  'Yes, with human review': 'Oui, avec revue humaine',
  'Locked to OpenAI': 'Verrouill\u00e9 sur OpenAI',
  'No \u2014 subscription required': 'Non \u2014 abonnement requis',

  // ChatGPT — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. ChatGPT Agent Mode processes everything on OpenAI\u2019s cloud infrastructure.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. Le mode Agent de ChatGPT traite tout sur l\u2019infrastructure cloud d\u2019OpenAI.',
  'Pay only for your own LLM API usage. No $20\u2013$200/month subscription, no feature gates, no usage caps.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Pas d\u2019abonnement \u00e0 20\u2013200 $/mois, pas de restrictions de fonctionnalit\u00e9s, pas de plafonds d\u2019utilisation.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into OpenAI\u2019s models only.':
    'Passez d\u2019OpenAI \u00e0 Anthropic, Gemini, Ollama, Mistral et plus. {alternative} vous enferme dans les mod\u00e8les OpenAI uniquement.',

  // ChatGPT — Pricing
  '$20/mo Plus or $200/mo Pro': '20 $/mois Plus ou 200 $/mois Pro',
  'Locked to OpenAI models': 'Verrouill\u00e9 sur les mod\u00e8les OpenAI',
  'No bring-your-own-key option': 'Pas d\u2019option BYOK',

  // ChatGPT — Honest take
  'Want a polished, all-in-one ChatGPT experience with zero setup':
    'Voulez une exp\u00e9rience ChatGPT compl\u00e8te et cl\u00e9 en main sans configuration',
  'Need built-in browsing, code interpreter, and file analysis in one tool':
    'Avez besoin de navigation web, interpr\u00e9teur de code et analyse de fichiers int\u00e9gr\u00e9s dans un seul outil',

  // DataKit — Hero
  'Full AI agent orchestration that runs in your browser \u2014 not just data analysis, but any task.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 pas seulement l\u2019analyse de donn\u00e9es, mais toute t\u00e2che.',

  // DataKit — TL;DR
  Scope: 'Port\u00e9e',
  'Multi-agent platform': 'Plateforme multi-agents',
  'Data analysis tool': 'Outil d\u2019analyse de donn\u00e9es',
  'LLM Providers': 'Fournisseurs LLM',
  'Data-focused AI': 'IA orient\u00e9e donn\u00e9es',
  Collaboration: 'Collaboration',
  'P2P sync & teams': 'Synchro P2P et \u00e9quipes',
  'Single-user': 'Mono-utilisateur',

  // DataKit — Feature table
  Likely: 'Probable',
  'Data analysis only': 'Analyse de donn\u00e9es uniquement',

  // DataKit — Advantages
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused solely on data file analysis.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s pour toute t\u00e2che \u2014 recherche, r\u00e9daction, analyse, d\u00e9veloppement. {alternative} se concentre uniquement sur l\u2019analyse de fichiers de donn\u00e9es.',
  'Agent Memory & Knowledge': 'M\u00e9moire et connaissances des agents',
  'Agents learn from conversations and access a full knowledge base. {alternative} has no memory or knowledge management.':
    'Les agents apprennent des conversations et acc\u00e8dent \u00e0 une base de connaissances compl\u00e8te. {alternative} n\u2019a pas de gestion de m\u00e9moire ni de connaissances.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} is limited to data-specific AI capabilities.':
    'Passez d\u2019OpenAI \u00e0 Anthropic, Gemini, Ollama, Mistral et plus. {alternative} est limit\u00e9 aux capacit\u00e9s IA sp\u00e9cifiques aux donn\u00e9es.',
  'Cross-device sync via Yjs/WebRTC for seamless teamwork. {alternative} is a single-user data analysis tool.':
    'Synchronisation inter-appareils via Yjs/WebRTC pour un travail d\u2019\u00e9quipe fluide. {alternative} est un outil d\u2019analyse de donn\u00e9es mono-utilisateur.',

  // DataKit — Pricing
  'Free (open source)': 'Gratuit (open source)',
  'Data analysis only \u2014 no orchestration':
    'Analyse de donn\u00e9es uniquement \u2014 pas d\u2019orchestration',
  'No multi-agent collaboration': 'Pas de collaboration multi-agents',
  'No agent memory or knowledge base':
    'Pas de m\u00e9moire d\u2019agent ni de base de connaissances',
  'No P2P sync or cross-device support':
    'Pas de synchro P2P ni de support multi-appareils',

  // DataKit — Honest take
  'Need dedicated CSV, JSON, XLS, or Parquet file analysis with AI assistance':
    'Avez besoin d\u2019analyse d\u00e9di\u00e9e de fichiers CSV, JSON, XLS ou Parquet avec assistance IA',
  'Want a lightweight, focused tool specifically for local data exploration':
    'Voulez un outil l\u00e9ger et cibl\u00e9 sp\u00e9cifiquement pour l\u2019exploration locale de donn\u00e9es',
  'Prefer a single-purpose data tool over a full orchestration platform':
    'Pr\u00e9f\u00e9rez un outil de donn\u00e9es mono-fonction \u00e0 une plateforme d\u2019orchestration compl\u00e8te',

  // Dualite — TL;DR
  'From $29/mo': '\u00c0 partir de 29 $/mois',
  'App/web builder': 'Cr\u00e9ateur d\u2019apps/web',

  // Dualite — Feature table
  '5 messages': '5 messages',
  'Figma-to-Code': 'Figma vers code',

  // Dualite — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Dualite processes everything on their cloud servers.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. Dualite traite tout sur ses serveurs cloud.',
  'Pay only for your own LLM API usage. No $29\u2013$79/month subscription, no message limits, no surprise bills.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Pas d\u2019abonnement \u00e0 29\u201379 $/mois, pas de limites de messages, pas de factures surprises.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-prompt app generation.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s avec r\u00e9solution de d\u00e9pendances et ex\u00e9cution parall\u00e8le. {alternative} se concentre sur la g\u00e9n\u00e9ration d\u2019apps en un seul prompt.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own models.':
    'Passez d\u2019OpenAI \u00e0 Anthropic, Gemini, Ollama, Mistral et plus. {alternative} vous enferme dans ses propres mod\u00e8les.',

  // Dualite — Pricing
  'Message-based limits': 'Limites bas\u00e9es sur les messages',
  '5 free messages only': '5 messages gratuits uniquement',

  // Dualite — Honest take
  'Need Figma-to-code conversion and app templates out of the box':
    'Avez besoin de conversion Figma vers code et de mod\u00e8les d\u2019apps cl\u00e9 en main',
  'Want a visual app builder with authentication and backend included':
    'Voulez un cr\u00e9ateur d\u2019apps visuel avec authentification et backend inclus',
  'Prefer prompt-to-app generation over multi-agent orchestration':
    'Pr\u00e9f\u00e9rez la g\u00e9n\u00e9ration d\u2019apps par prompt \u00e0 l\u2019orchestration multi-agents',

  // HugstonOne — Hero
  'Multi-agent orchestration in any browser \u2014 vs a Windows-only local inference app.':
    'Orchestration multi-agents dans n\u2019importe quel navigateur \u2014 vs une app d\u2019inf\u00e9rence locale Windows uniquement.',

  // HugstonOne — TL;DR
  Platform: 'Plateforme',
  'Any browser, any OS': 'Tout navigateur, tout OS',
  'Windows desktop only': 'Bureau Windows uniquement',
  Agents: 'Agents',
  'Multi-agent orchestration': 'Orchestration multi-agents',
  'Single-model inference': 'Inf\u00e9rence mono-mod\u00e8le',
  'Proprietary (free)': 'Propri\u00e9taire (gratuit)',

  // HugstonOne — Feature table
  'No (proprietary)': 'Non (propri\u00e9taire)',
  'Cross-Platform': 'Multi-plateforme',
  'Any OS with a browser': 'Tout OS avec un navigateur',
  'Windows only': 'Windows uniquement',
  'No \u2014 single-model only': 'Non \u2014 mono-mod\u00e8le uniquement',
  'Cloud LLM Providers': 'Fournisseurs LLM cloud',
  'None \u2014 local GGUF only': 'Aucun \u2014 GGUF local uniquement',
  'Local Model Support': 'Support de mod\u00e8les locaux',
  'Via Ollama': 'Via Ollama',
  '10,000+ GGUF models': '10 000+ mod\u00e8les GGUF',
  'Knowledge Base': 'Base de connaissances',
  'Yes \u2014 fully local': 'Oui \u2014 enti\u00e8rement local',

  // HugstonOne — Advantages
  'Any Device, Any OS': 'Tout appareil, tout OS',
  'Works on Mac, Linux, Windows, tablets, and phones \u2014 anywhere you have a browser. {alternative} is locked to Windows desktops.':
    'Fonctionne sur Mac, Linux, Windows, tablettes et t\u00e9l\u00e9phones \u2014 partout o\u00f9 vous avez un navigateur. {alternative} est limit\u00e9 aux bureaux Windows.',
  'Orchestrate entire teams of specialized AI agents that collaborate on complex tasks. {alternative} runs a single model at a time.':
    'Orchestrez des \u00e9quipes enti\u00e8res d\u2019agents IA sp\u00e9cialis\u00e9s qui collaborent sur des t\u00e2ches complexes. {alternative} ex\u00e9cute un seul mod\u00e8le \u00e0 la fois.',
  'Cloud + Local Models': 'Mod\u00e8les cloud + locaux',
  'Access OpenAI, Anthropic, Gemini, Mistral, and more \u2014 plus local models via Ollama. {alternative} only supports local GGUF inference.':
    'Acc\u00e9dez \u00e0 OpenAI, Anthropic, Gemini, Mistral et plus \u2014 ainsi qu\u2019aux mod\u00e8les locaux via Ollama. {alternative} ne supporte que l\u2019inf\u00e9rence GGUF locale.',
  'Open Source & Extensible': 'Open source et extensible',
  'Fully open-source under the MIT license with a marketplace, plugins, and community contributions. {alternative} is proprietary and closed.':
    'Enti\u00e8rement open source sous licence MIT avec marketplace, plugins et contributions communautaires. {alternative} est propri\u00e9taire et ferm\u00e9.',

  // HugstonOne — Pricing
  'Free (email required)': 'Gratuit (e-mail requis)',
  'Windows only \u2014 no Mac or Linux':
    'Windows uniquement \u2014 pas de Mac ni Linux',
  'No cloud LLM provider support': 'Pas de support fournisseur LLM cloud',
  'Proprietary \u2014 not open source':
    'Propri\u00e9taire \u2014 pas open source',

  // HugstonOne — Honest take
  'Want a simple local GGUF inference app on Windows':
    'Voulez une app d\u2019inf\u00e9rence GGUF locale simple sur Windows',
  'Need GPU-accelerated local model inference with image-to-text':
    'Avez besoin d\u2019inf\u00e9rence de mod\u00e8les locaux acc\u00e9l\u00e9r\u00e9e par GPU avec image-vers-texte',
  'Prefer a desktop app with an integrated code editor and live preview':
    'Pr\u00e9f\u00e9rez une app de bureau avec \u00e9diteur de code int\u00e9gr\u00e9 et aper\u00e7u en direct',

  // LlamaPen — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no download, no Ollama dependency, no limits.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 sans t\u00e9l\u00e9chargement, sans d\u00e9pendance Ollama, sans limites.',

  // LlamaPen — TL;DR
  'Browser UI for Ollama': 'Interface navigateur pour Ollama',

  // LlamaPen — Feature table
  'Provider Support': 'Support fournisseurs',
  '6+ providers (cloud + local)': '6+ fournisseurs (cloud + local)',
  'Ollama only': 'Ollama uniquement',
  'Yes (Ollama web UI)': 'Oui (interface web Ollama)',
  'Yes (PWA)': 'Oui (PWA)',
  'Requires Ollama running':
    'N\u00e9cessite Ollama en cours d\u2019ex\u00e9cution',
  'Marketplace & Connectors': 'Marketplace et connecteurs',

  // LlamaPen — Advantages
  'Multi-Provider Freedom': 'Libert\u00e9 multi-fournisseurs',
  'Connect to OpenAI, Anthropic, Gemini, Ollama, and more. {alternative} only works with a local Ollama instance.':
    'Connectez-vous \u00e0 OpenAI, Anthropic, Gemini, Ollama et plus. {alternative} ne fonctionne qu\u2019avec une instance Ollama locale.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s avec r\u00e9solution de d\u00e9pendances et ex\u00e9cution parall\u00e8le. {alternative} est une interface de chat unique.',
  'Agent Memory & Knowledge Base':
    'M\u00e9moire d\u2019agent et base de connaissances',
  'Persistent memory with human review, plus a full knowledge base for document ingestion. {alternative} has neither.':
    'M\u00e9moire persistante avec revue humaine, plus une base de connaissances compl\u00e8te pour l\u2019ingestion de documents. {alternative} n\u2019a ni l\u2019un ni l\u2019autre.',
  'P2P Sync & Ecosystem': 'Synchro P2P et \u00e9cosyst\u00e8me',
  'Cross-device sync via Yjs/WebRTC, marketplace, connectors, and traces. {alternative} offers none of these.':
    'Synchronisation inter-appareils via Yjs/WebRTC, marketplace, connecteurs et traces. {alternative} n\u2019offre rien de tout cela.',

  // LlamaPen — Pricing
  'Ollama-only (no cloud providers)':
    'Ollama uniquement (pas de fournisseurs cloud)',
  'No P2P sync or marketplace': 'Pas de synchro P2P ni de marketplace',

  // LlamaPen — Honest take
  'Only use local Ollama models and want the simplest possible chat UI':
    'N\u2019utilisez que des mod\u00e8les Ollama locaux et voulez l\u2019interface de chat la plus simple possible',
  'Don\u2019t need multi-agent orchestration or agent memory':
    'N\u2019avez pas besoin d\u2019orchestration multi-agents ni de m\u00e9moire d\u2019agent',
  'Want a lightweight, zero-config interface exclusively for Ollama':
    'Voulez une interface l\u00e9g\u00e8re et sans configuration exclusivement pour Ollama',

  // MiniMax — TL;DR
  'Cloud (MiniMax infra)': 'Cloud (infra MiniMax)',
  'Free tier + credits': 'Offre gratuite + cr\u00e9dits',
  'Expert collection': 'Collection d\u2019experts',

  // MiniMax — Feature table
  'Credit-based': 'Bas\u00e9 sur les cr\u00e9dits',

  // MiniMax — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. MiniMax Agent processes everything on their cloud infrastructure.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. MiniMax Agent traite tout sur son infrastructure cloud.',
  'Pay only for your own LLM API usage. No credit system, no usage caps, no surprise bills.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Pas de syst\u00e8me de cr\u00e9dits, pas de plafonds d\u2019utilisation, pas de factures surprises.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} offers an expert collection but lacks true multi-agent orchestration.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s avec r\u00e9solution de d\u00e9pendances et ex\u00e9cution parall\u00e8le. {alternative} propose une collection d\u2019experts mais manque de v\u00e9ritable orchestration multi-agents.',

  // MiniMax — Pricing
  'Free + credits': 'Gratuit + cr\u00e9dits',
  'Credit-based usage system':
    'Syst\u00e8me d\u2019utilisation par cr\u00e9dits',
  'No bring-your-own-key': 'Pas de BYOK',

  // MiniMax — Honest take
  'Want ready-made chatbot deployment to Telegram, Discord, or Slack':
    'Voulez un d\u00e9ploiement de chatbot cl\u00e9 en main sur Telegram, Discord ou Slack',
  'Need built-in PPT creation and website building tools':
    'Avez besoin d\u2019outils de cr\u00e9ation PPT et de sites web int\u00e9gr\u00e9s',
  'Prefer a zero-config SaaS with scheduled task execution':
    'Pr\u00e9f\u00e9rez un SaaS sans configuration avec ex\u00e9cution de t\u00e2ches planifi\u00e9es',

  // NextDocs — TL;DR
  'From $18/mo': '\u00c0 partir de 18 $/mois',
  'Document generation': 'G\u00e9n\u00e9ration de documents',

  // NextDocs — Feature table
  'Platform-locked': 'Verrouill\u00e9 sur la plateforme',
  'Docs & slides only': 'Documents et diapositives uniquement',
  'Unlimited Usage': 'Utilisation illimit\u00e9e',
  'Credit-based limits': 'Limites bas\u00e9es sur les cr\u00e9dits',

  // NextDocs — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud servers.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. {alternative} traite tout sur ses serveurs cloud.',
  'Pay only for your own LLM API usage. No $18\u2013$90/month subscription, no credit limits, no feature gates.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Pas d\u2019abonnement \u00e0 18\u201390 $/mois, pas de limites de cr\u00e9dits, pas de restrictions de fonctionnalit\u00e9s.',
  'Beyond Document Generation':
    'Au-del\u00e0 de la g\u00e9n\u00e9ration de documents',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating documents and slides.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s pour toute t\u00e2che \u2014 recherche, r\u00e9daction, analyse, d\u00e9veloppement. {alternative} se limite \u00e0 la g\u00e9n\u00e9ration de documents et diapositives.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their platform with no BYOK option.':
    'Passez d\u2019OpenAI \u00e0 Anthropic, Gemini, Ollama, Mistral et plus. {alternative} vous enferme dans sa plateforme sans option BYOK.',

  // NextDocs — Pricing
  'Free tier limited to 500 credits':
    'Offre gratuite limit\u00e9e \u00e0 500 cr\u00e9dits',
  'Pro plans from $18 to $90/month': 'Abonnements Pro de 18 \u00e0 90 $/mois',

  // NextDocs — Honest take
  'Need polished document and slide generation from prompts':
    'Avez besoin de g\u00e9n\u00e9ration soign\u00e9e de documents et diapositives \u00e0 partir de prompts',
  'Want multi-variant output with brand kit consistency':
    'Voulez des sorties multi-variantes avec coh\u00e9rence de charte graphique',
  'Prefer built-in export to PDF, Google Slides, and PowerPoint':
    'Pr\u00e9f\u00e9rez l\u2019export int\u00e9gr\u00e9 vers PDF, Google Slides et PowerPoint',

  // Replit — TL;DR
  'Cloud (Replit infra)': 'Cloud (infra Replit)',
  'Single agent (app builder)': 'Agent unique (cr\u00e9ateur d\u2019apps)',

  // Replit — Feature table
  'Limited daily credits': 'Cr\u00e9dits quotidiens limit\u00e9s',

  // Replit — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Replit Agent processes everything on their cloud infrastructure.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. Replit Agent traite tout sur son infrastructure cloud.',
  'Pay only for your own LLM API usage. No $17\u2013$100/month subscription, no credit limits, no surprise bills.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Pas d\u2019abonnement \u00e0 17\u2013100 $/mois, pas de limites de cr\u00e9dits, pas de factures surprises.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-agent app building.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s avec r\u00e9solution de d\u00e9pendances et ex\u00e9cution parall\u00e8le. {alternative} se concentre sur la cr\u00e9ation d\u2019apps avec un agent unique.',

  // Replit — Pricing
  'Credit-based usage ($20\u2013$100)':
    'Utilisation par cr\u00e9dits (20\u2013100 $)',
  'Paid tiers for more builds': 'Abonnements payants pour plus de builds',

  // Replit — Honest take
  'Need one-click deployment and built-in hosting for apps':
    'Avez besoin de d\u00e9ploiement en un clic et d\u2019h\u00e9bergement int\u00e9gr\u00e9 pour les apps',
  'Want an all-in-one IDE with instant infrastructure setup':
    'Voulez un IDE tout-en-un avec configuration d\u2019infrastructure instantan\u00e9e',
  'Prefer a managed platform for full-stack app generation':
    'Pr\u00e9f\u00e9rez une plateforme g\u00e9r\u00e9e pour la g\u00e9n\u00e9ration d\u2019apps full-stack',

  // Roma — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Python, no Docker, no setup.':
    'Orchestration compl\u00e8te d\u2019agents IA dans votre navigateur \u2014 sans Python, sans Docker, sans installation.',

  // Roma — TL;DR
  'Python + Docker setup': 'Installation Python + Docker',
  'Code-first / API-first': 'Code d\u2019abord / API d\u2019abord',
  'Python + DSPy framework': 'Framework Python + DSPy',

  // Roma — Feature table
  'Recursive pipeline': 'Pipeline r\u00e9cursif',
  'OpenRouter + major providers': 'OpenRouter + fournisseurs majeurs',

  // Roma — Advantages
  'No Python, no Docker, no DSPy \u2014 just open your browser. {alternative} requires a full Python environment with Docker.':
    'Pas de Python, pas de Docker, pas de DSPy \u2014 ouvrez simplement votre navigateur. {alternative} n\u00e9cessite un environnement Python complet avec Docker.',
  'Full graphical UI with agent visualization and real-time workflow tracking. {alternative} is a code-first framework with a REST API.':
    'Interface graphique compl\u00e8te avec visualisation des agents et suivi du workflow en temps r\u00e9el. {alternative} est un framework orient\u00e9 code avec une API REST.',
  'Persistent memory system and knowledge base with human review. {alternative} focuses on execution pipelines without built-in memory.':
    'Syst\u00e8me de m\u00e9moire persistante et base de connaissances avec revue humaine. {alternative} se concentre sur les pipelines d\u2019ex\u00e9cution sans m\u00e9moire int\u00e9gr\u00e9e.',
  'Works on any device including mobile \u2014 no install, no server infrastructure. Everything runs client-side as a PWA.':
    'Fonctionne sur tout appareil y compris mobile \u2014 sans installation, sans infrastructure serveur. Tout s\u2019ex\u00e9cute c\u00f4t\u00e9 client en tant que PWA.',

  // Roma — Pricing
  'Requires Python + Docker': 'N\u00e9cessite Python + Docker',
  'No visual UI \u2014 code-first only':
    'Pas d\u2019interface visuelle \u2014 orient\u00e9 code uniquement',
  'Server infrastructure needed': 'Infrastructure serveur n\u00e9cessaire',
  'No built-in knowledge base':
    'Pas de base de connaissances int\u00e9gr\u00e9e',

  // Roma — Honest take
  'Need recursive task decomposition with DSPy-based prediction strategies':
    'Avez besoin de d\u00e9composition r\u00e9cursive de t\u00e2ches avec strat\u00e9gies de pr\u00e9diction bas\u00e9es sur DSPy',
  'Want a programmable pipeline with Atomizer, Planner, Executor, and Verifier stages':
    'Voulez un pipeline programmable avec les \u00e9tapes Atomizer, Planner, Executor et Verifier',
  'Prefer MLflow observability and E2B sandboxed code execution':
    'Pr\u00e9f\u00e9rez l\u2019observabilit\u00e9 MLflow et l\u2019ex\u00e9cution de code sandbox\u00e9e E2B',

  // RunnerH — TL;DR
  'Cloud-based processing': 'Traitement bas\u00e9 cloud',
  'Enterprise (contact sales)': 'Entreprise (contacter les ventes)',
  'Computer-use agent': 'Agent d\u2019utilisation d\u2019ordinateur',

  // RunnerH — Feature table
  Partially: 'Partiellement',
  'Cloud API/demo': 'API cloud / d\u00e9mo',
  'Sub-agent architecture': 'Architecture sous-agents',
  'Proprietary Holo models': 'Mod\u00e8les Holo propri\u00e9taires',
  'Cross-Platform Automation': 'Automatisation multi-plateforme',
  'Browser-based': 'Bas\u00e9 navigateur',
  'Desktop, web & mobile': 'Bureau, web et mobile',
  'None (enterprise only)': 'Aucun (entreprise uniquement)',

  // RunnerH — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Runner H processes everything on H Company\u2019s cloud infrastructure.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. Runner H traite tout sur l\u2019infrastructure cloud de H Company.',
  'Pay only for your own LLM API usage. Runner H runs are \u201cextremely costly\u201d and require enterprise contracts.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Les ex\u00e9cutions de Runner H sont \u00ab extr\u00eamement co\u00fbteuses \u00bb et n\u00e9cessitent des contrats entreprise.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-task computer-use automation.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s avec r\u00e9solution de d\u00e9pendances et ex\u00e9cution parall\u00e8le. {alternative} se concentre sur l\u2019automatisation mono-t\u00e2che de l\u2019utilisation d\u2019ordinateur.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into proprietary Holo models.':
    'Passez d\u2019OpenAI \u00e0 Anthropic, Gemini, Ollama, Mistral et plus. {alternative} vous enferme dans les mod\u00e8les Holo propri\u00e9taires.',

  // RunnerH — Pricing
  'Extremely costly per run':
    'Extr\u00eamement co\u00fbteux par ex\u00e9cution',
  'No self-serve pricing': 'Pas de tarification en libre-service',
  'Locked to proprietary models':
    'Verrouill\u00e9 sur les mod\u00e8les propri\u00e9taires',

  // RunnerH — Honest take
  'Need SOTA computer-use automation across desktop, web, and mobile':
    'Avez besoin d\u2019automatisation SOTA de l\u2019utilisation d\u2019ordinateur sur bureau, web et mobile',
  'Require cross-platform GUI interaction with visual grounding':
    'N\u00e9cessitez une interaction GUI multi-plateforme avec ancrage visuel',
  'Have an enterprise budget and need benchmark-leading task completion':
    'Avez un budget entreprise et avez besoin d\u2019un taux de compl\u00e9tion de t\u00e2ches de r\u00e9f\u00e9rence',

  // Trace — TL;DR
  'Not listed (beta)': 'Non list\u00e9 (b\u00eata)',
  'Closed-source': 'Code ferm\u00e9',

  // Trace — Feature table
  'Workflow-based': 'Bas\u00e9 workflows',
  Unknown: 'Inconnu',
  Availability: 'Disponibilit\u00e9',
  'Available now': 'Disponible maintenant',
  'Beta / waitlist': 'B\u00eata / liste d\u2019attente',
  'Not publicly listed': 'Non list\u00e9 publiquement',

  // Trace — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Trace processes everything on their cloud infrastructure.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. Trace traite tout sur son infrastructure cloud.',
  'Available & Free': 'Disponible et gratuit',
  'Use {productName} today at no cost \u2014 no waitlist, no beta access required. Trace is still in closed beta with undisclosed pricing.':
    'Utilisez {productName} aujourd\u2019hui sans frais \u2014 pas de liste d\u2019attente, pas d\u2019acc\u00e8s b\u00eata requis. Trace est encore en b\u00eata ferm\u00e9e avec une tarification non divulgu\u00e9e.',
  'Open Source & Transparent': 'Open source et transparent',
  'Fully open-source under MIT license \u2014 inspect, modify, and self-host. Trace is closed-source with no public codebase.':
    'Enti\u00e8rement open source sous licence MIT \u2014 inspectez, modifiez et auto-h\u00e9bergez. Trace est \u00e0 code ferm\u00e9 sans base de code publique.',
  'Works Offline': 'Fonctionne hors ligne',
  'Run entirely in your browser without internet after initial load. Trace\u2019s cloud-based architecture requires a constant connection.':
    'Fonctionne enti\u00e8rement dans votre navigateur sans internet apr\u00e8s le chargement initial. L\u2019architecture cloud de Trace n\u00e9cessite une connexion permanente.',

  // Trace — Pricing
  'Closed beta / waitlist only':
    'B\u00eata ferm\u00e9e / liste d\u2019attente uniquement',
  'Pricing not publicly available': 'Tarification non disponible publiquement',
  'BYOK status unknown': 'Statut BYOK inconnu',

  // Trace — Honest take
  'Need a knowledge-graph context engine for enterprise workflows':
    'Avez besoin d\u2019un moteur de contexte par graphe de connaissances pour les workflows entreprise',
  'Want built-in SLA monitoring and department-level coordination':
    'Voulez une surveillance SLA int\u00e9gr\u00e9e et une coordination au niveau des d\u00e9partements',
  'Require deep Slack, Notion, Jira, and Google Drive integrations out of the box':
    'N\u00e9cessitez des int\u00e9grations approfondies Slack, Notion, Jira et Google Drive cl\u00e9 en main',

  // V7Go — Feature table
  'Document processing': 'Traitement de documents',
  'Document processing only': 'Traitement de documents uniquement',
  'No free tier': 'Pas d\u2019offre gratuite',

  // V7Go — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes all documents on their cloud infrastructure.':
    'Toutes les donn\u00e9es restent dans votre navigateur \u2014 IndexedDB, jetons chiffr\u00e9s, z\u00e9ro t\u00e9l\u00e9m\u00e9trie. {alternative} traite tous les documents sur son infrastructure cloud.',
  'Pay only for your own LLM API usage. No enterprise contracts, no per-page pricing, no sales calls required.':
    'Payez uniquement votre propre utilisation d\u2019API LLM. Pas de contrats entreprise, pas de tarification \u00e0 la page, pas d\u2019appels commerciaux requis.',
  'Beyond Document Processing': 'Au-del\u00e0 du traitement de documents',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused on document understanding and data extraction.':
    'Coordonnez des \u00e9quipes d\u2019agents sp\u00e9cialis\u00e9s pour toute t\u00e2che \u2014 recherche, r\u00e9daction, analyse, d\u00e9veloppement. {alternative} se concentre sur la compr\u00e9hension de documents et l\u2019extraction de donn\u00e9es.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} uses their own platform-selected models with no choice.':
    'Passez d\u2019OpenAI \u00e0 Anthropic, Gemini, Ollama, Mistral et plus. {alternative} utilise ses propres mod\u00e8les s\u00e9lectionn\u00e9s par la plateforme sans choix.',

  // V7Go — Pricing
  'No free tier available': 'Pas d\u2019offre gratuite disponible',
  'Enterprise-only pricing': 'Tarification entreprise uniquement',
  'Cloud-only document processing': 'Traitement de documents cloud uniquement',

  // V7Go — Honest take
  'Need specialized document understanding and data extraction at enterprise scale':
    'Avez besoin de compr\u00e9hension sp\u00e9cialis\u00e9e de documents et d\u2019extraction de donn\u00e9es \u00e0 l\u2019\u00e9chelle entreprise',
  'Want automated workflows for processing PDFs, images, and structured documents':
    'Voulez des workflows automatis\u00e9s pour le traitement de PDF, images et documents structur\u00e9s',
  'Require enterprise integrations and dedicated support for document automation':
    'N\u00e9cessitez des int\u00e9grations entreprise et un support d\u00e9di\u00e9 pour l\u2019automatisation de documents',
}
