import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Hero
  'AI Augmentation for Everyone': 'L\u2019augmentation par l\u2019IA pour tous',
  '{product} is a browser-native AI agent orchestration platform. Delegate complex tasks to teams of specialised agents that plan, collaborate, and deliver — all running':
    '{product} est une plateforme d\u2019orchestration d\u2019agents IA native du navigateur. Déléguez des tâches complexes à des équipes d\u2019agents spécialisés qui planifient, collaborent et livrent — le tout fonctionnant',
  'entirely on your device': 'entièrement sur votre appareil',
  '\u201CAI augmentation shouldn\u2019t be a luxury for the few, but a fundamental tool available to all — where anyone can leverage the power of AI teams to amplify their capabilities and achieve their goals.\u201D':
    '\u201CL\u2019augmentation par l\u2019IA ne devrait pas être un luxe réservé à quelques-uns, mais un outil fondamental accessible à tous — où chacun peut exploiter la puissance des équipes d\u2019IA pour amplifier ses capacités et atteindre ses objectifs.\u201D',

  // Principles section
  Philosophy: 'Philosophie',
  'Built on Conviction': 'Bâti sur des convictions',
  'Three non-negotiable principles guide every decision we make.':
    'Trois principes non négociables guident chacune de nos décisions.',
  'Privacy by Design': 'Confidentialité par conception',
  'Every byte of your data stays on your device. No servers. No telemetry. No compromise.':
    'Chaque octet de vos données reste sur votre appareil. Aucun serveur. Aucune télémétrie. Aucun compromis.',
  'Universally Accessible': 'Universellement accessible',
  'A browser is all you need. No installation, no GPU, no special hardware — just open and create.':
    'Un navigateur suffit. Pas d\u2019installation, pas de GPU, pas de matériel spécial — ouvrez et créez.',
  'Open Source Forever': 'Open source pour toujours',
  'Built in the open, shaped by the community. Every line of code is yours to read, improve, and share.':
    'Construit en transparence, façonné par la communauté. Chaque ligne de code est vôtre à lire, améliorer et partager.',

  // Capabilities section
  Capabilities: 'Fonctionnalités',
  'Powerful by Design': 'Puissant par conception',
  'A depth of engineering so you can focus on what matters — your ideas.':
    'Une profondeur d\u2019ingénierie pour que vous puissiez vous concentrer sur l\u2019essentiel — vos idées.',
  'Multi-Agent Orchestration': 'Orchestration multi-agents',
  'Collective Intelligence': 'Intelligence collective',
  'Compose teams of specialised AI agents that plan, execute, and validate together — mirroring how the best human teams operate.':
    'Composez des équipes d\u2019agents IA spécialisés qui planifient, exécutent et valident ensemble — à l\u2019image des meilleures équipes humaines.',
  'Provider Independence': 'Indépendance des fournisseurs',
  'Your Models, Your Choice': 'Vos modèles, votre choix',
  'Seamlessly switch between OpenAI, Anthropic, Google Gemini, Mistral, Ollama, or any OpenAI-compatible endpoint. Never locked in.':
    'Basculez facilement entre OpenAI, Anthropic, Google Gemini, Mistral, Ollama ou tout endpoint compatible OpenAI. Jamais enfermé.',
  'Zero-Trust Architecture': 'Architecture Zero-Trust',
  'Security as a Foundation': 'La sécurité comme fondation',
  'Web Crypto API encrypts your tokens. Service Workers sandbox execution. IndexedDB keeps everything local. Defense in depth, by default.':
    'Web Crypto API chiffre vos jetons. Les Service Workers isolent l\u2019exécution. IndexedDB garde tout en local. Défense en profondeur, par défaut.',
  'Intelligent Task Analysis': 'Analyse intelligente des tâches',
  'Complexity, Simplified': 'La complexité, simplifiée',
  'An LLM-powered analyser breaks your request into requirements, recruits the right agents, resolves dependencies, and orchestrates delivery.':
    'Un analyseur propulsé par LLM décompose votre demande en exigences, recrute les bons agents, résout les dépendances et orchestre la livraison.',
  'Offline-First & P2P': 'Offline-First et P2P',
  'Works Anywhere': 'Fonctionne partout',
  'Fully functional without internet after first load. Optional Yjs-powered P2P sync lets you collaborate across devices without a central server.':
    'Entièrement fonctionnel sans internet après le premier chargement. La synchronisation P2P optionnelle via Yjs permet de collaborer entre appareils sans serveur central.',
  'Extensible by Nature': 'Extensible par nature',
  'Build on Top': 'Construisez par-dessus',
  'A marketplace of agents, tools, connectors, and apps — plus a sandboxed Extension Bridge so the community can create and share new capabilities.':
    'Un marketplace d\u2019agents, d\u2019outils, de connecteurs et d\u2019applications — plus un Extension Bridge sandboxé pour que la communauté puisse créer et partager de nouvelles fonctionnalités.',

  // How it works section
  'Getting Started': 'Premiers pas',
  'Four Steps to Delegation': 'Quatre étapes vers la délégation',
  'From prompt to polished output in minutes, not hours.':
    'Du prompt au livrable abouti en minutes, pas en heures.',
  'Configure your AI provider': 'Configurez votre fournisseur d\u2019IA',
  'Connect your preferred LLM — OpenAI, Anthropic, Gemini, Ollama, or any compatible endpoint.':
    'Connectez votre LLM préféré — OpenAI, Anthropic, Gemini, Ollama ou tout endpoint compatible.',
  'Describe your task': 'Décrivez votre tâche',
  'Tell DEVS what you need in natural language. Be ambitious — the orchestrator thrives on complexity.':
    'Dites à DEVS ce dont vous avez besoin en langage naturel. Soyez ambitieux — l\u2019orchestrateur excelle dans la complexité.',
  'Watch agents collaborate': 'Observez les agents collaborer',
  'See specialised agents plan, execute, and validate in real-time. Intervene, guide, or just observe.':
    'Voyez les agents spécialisés planifier, exécuter et valider en temps réel. Intervenez, guidez ou observez simplement.',
  'Receive & refine': 'Recevez et affinez',
  'Get structured artefacts — code, docs, analyses — and iterate with feedback until it\u2019s right.':
    'Obtenez des livrables structurés — code, docs, analyses — et itérez avec vos retours jusqu\u2019à satisfaction.',

  // Use cases section
  'For Everyone': 'Pour tous',
  'Built for Builders': 'Conçu pour ceux qui créent',
  'Whether you\u2019re writing code or writing prose — DEVS adapts to you.':
    'Que vous écriviez du code ou de la prose — DEVS s\u2019adapte à vous.',
  Students: 'Étudiants',
  'Research, study planning & assignment help':
    'Recherche, planification d\u2019études et aide aux devoirs',
  Developers: 'Développeurs',
  'Rapid prototyping, code generation & reviews':
    'Prototypage rapide, génération de code et revues',
  Creators: 'Créateurs',
  'Brainstorming, writing & content production':
    'Brainstorming, écriture et production de contenu',
  Researchers: 'Chercheurs',
  'Literature review, data analysis & hypothesis testing':
    'Revue de littérature, analyse de données et test d\u2019hypothèses',
  Managers: 'Managers',
  'Project planning, task breakdown & operations':
    'Planification de projets, découpage de tâches et opérations',
  Entrepreneurs: 'Entrepreneurs',
  'Idea validation, strategy & business planning':
    'Validation d\u2019idées, stratégie et business plan',

  // FAQ section
  FAQ: 'FAQ',
  'Common Questions': 'Questions fréquentes',
  'Is my data private?': 'Mes données sont-elles privées ?',
  'Absolutely. All processing happens locally in your browser. We never collect, transmit, or store any of your data. Your API keys are encrypted with the Web Crypto API and never leave your device.':
    'Absolument. Tout le traitement se fait localement dans votre navigateur. Nous ne collectons, transmettons ni ne stockons aucune de vos données. Vos clés API sont chiffrées avec la Web Crypto API et ne quittent jamais votre appareil.',
  'Which AI providers are supported?':
    'Quels fournisseurs d\u2019IA sont supportés ?',
  'We support {providers}, and any provider compatible with the OpenAI API specification. You can switch providers at any time without losing your conversations or data.':
    'Nous supportons {providers}, et tout fournisseur compatible avec la spécification de l\u2019API OpenAI. Vous pouvez changer de fournisseur à tout moment sans perdre vos conversations ni vos données.',
  'Do I need to install anything?': 'Dois-je installer quelque chose ?',
  'Nothing at all. DEVS is a Progressive Web App that runs entirely in your browser. You can optionally \u201Cinstall\u201D it to your home screen for a native-like experience, but it\u2019s never required.':
    'Rien du tout. DEVS est une Progressive Web App qui fonctionne entièrement dans votre navigateur. Vous pouvez optionnellement l\u2019\u201Cinstaller\u201D sur votre écran d\u2019accueil pour une expérience native, mais ce n\u2019est jamais obligatoire.',
  'Is this really free and open source?':
    'Est-ce vraiment gratuit et open source ?',
  'Yes — {license} licensed and always will be. The entire codebase is on GitHub. You can self-host, fork, or contribute. No premium tiers, no paywalls.':
    'Oui — sous licence {license} et ça le restera toujours. Tout le code source est sur GitHub. Vous pouvez l\u2019héberger, le fork ou y contribuer. Pas de niveaux premium, pas de paywall.',
  'Can I use it offline?': 'Puis-je l\u2019utiliser hors ligne ?',
  'After the first load, the Service Worker caches everything you need. You can create agents, manage knowledge, and review past conversations without any internet connection. LLM calls obviously require connectivity to the provider.':
    'Après le premier chargement, le Service Worker met en cache tout ce dont vous avez besoin. Vous pouvez créer des agents, gérer vos connaissances et consulter d\u2019anciennes conversations sans connexion internet. Les appels LLM nécessitent évidemment une connectivité au fournisseur.',
  'How does multi-agent orchestration work?':
    'Comment fonctionne l\u2019orchestration multi-agents ?',
  'When you describe a complex task, the built-in orchestrator analyses it, breaks it into subtasks, recruits specialised agents, resolves dependencies, and coordinates parallel execution — just like a well-run project team.':
    'Lorsque vous décrivez une tâche complexe, l\u2019orchestrateur intègre l\u2019analyse, la décompose en sous-tâches, recrute des agents spécialisés, résout les dépendances et coordonne l\u2019exécution parallèle — exactement comme une équipe de projet bien dirigée.',

  // CTA section
  'Shape the Future With Us': 'Façonnez l\u2019avenir avec nous',
  '{product} is built by people who believe technology should empower, not enclose. Every contribution — code, ideas, feedback — makes AI augmentation more accessible to the world.':
    '{product} est construit par des personnes qui croient que la technologie doit autonomiser, pas enfermer. Chaque contribution — code, idées, retours — rend l\u2019augmentation par l\u2019IA plus accessible au monde.',
  'View on GitHub': 'Voir sur GitHub',
  'Open an Issue': 'Ouvrir une issue',
  'Made with care for humans everywhere.':
    'Fait avec soin pour les humains du monde entier.',
}
