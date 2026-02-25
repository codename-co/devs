import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Hero
  'AI Augmentation for Everyone': 'KI-Augmentierung für alle',
  '{product} is a browser-native AI agent orchestration platform. Delegate complex tasks to teams of specialised agents that plan, collaborate, and deliver — all running':
    '{product} ist eine browsernative KI-Agenten-Orchestrierungsplattform. Delegieren Sie komplexe Aufgaben an Teams spezialisierter Agenten, die planen, zusammenarbeiten und liefern — alles läuft',
  'entirely on your device': 'vollständig auf Ihrem Gerät',
  '\u201CAI augmentation shouldn\u2019t be a luxury for the few, but a fundamental tool available to all — where anyone can leverage the power of AI teams to amplify their capabilities and achieve their goals.\u201D':
    '\u201CKI-Augmentierung sollte kein Luxus für wenige sein, sondern ein grundlegendes Werkzeug für alle — wo jeder die Kraft von KI-Teams nutzen kann, um seine Fähigkeiten zu verstärken und seine Ziele zu erreichen.\u201D',

  // Principles section
  Philosophy: 'Philosophie',
  'Built on Conviction': 'Auf Überzeugung gebaut',
  'Three non-negotiable principles guide every decision we make.':
    'Drei unverhandelbare Prinzipien leiten jede unserer Entscheidungen.',
  'Privacy by Design': 'Datenschutz durch Design',
  'Every byte of your data stays on your device. No servers. No telemetry. No compromise.':
    'Jedes Byte Ihrer Daten bleibt auf Ihrem Gerät. Keine Server. Keine Telemetrie. Kein Kompromiss.',
  'Universally Accessible': 'Universell zugänglich',
  'A browser is all you need. No installation, no GPU, no special hardware — just open and create.':
    'Ein Browser ist alles, was Sie brauchen. Keine Installation, keine GPU, keine spezielle Hardware — einfach öffnen und erstellen.',
  'Open Source Forever': 'Für immer Open Source',
  'Built in the open, shaped by the community. Every line of code is yours to read, improve, and share.':
    'Offen gebaut, von der Community geformt. Jede Zeile Code gehört Ihnen zum Lesen, Verbessern und Teilen.',

  // Capabilities section
  Capabilities: 'Funktionen',
  'Powerful by Design': 'Leistungsstark durch Design',
  'A depth of engineering so you can focus on what matters — your ideas.':
    'Eine Tiefe an Ingenieurskunst, damit Sie sich auf das Wesentliche konzentrieren können — Ihre Ideen.',
  'Multi-Agent Orchestration': 'Multi-Agenten-Orchestrierung',
  'Collective Intelligence': 'Kollektive Intelligenz',
  'Compose teams of specialised AI agents that plan, execute, and validate together — mirroring how the best human teams operate.':
    'Stellen Sie Teams spezialisierter KI-Agenten zusammen, die gemeinsam planen, ausführen und validieren — so wie die besten menschlichen Teams arbeiten.',
  'Provider Independence': 'Anbieterunabhängigkeit',
  'Your Models, Your Choice': 'Ihre Modelle, Ihre Wahl',
  'Seamlessly switch between OpenAI, Anthropic, Google Gemini, Mistral, Ollama, or any OpenAI-compatible endpoint. Never locked in.':
    'Wechseln Sie nahtlos zwischen OpenAI, Anthropic, Google Gemini, Mistral, Ollama oder jedem OpenAI-kompatiblen Endpunkt. Niemals eingesperrt.',
  'Zero-Trust Architecture': 'Zero-Trust-Architektur',
  'Security as a Foundation': 'Sicherheit als Fundament',
  'Web Crypto API encrypts your tokens. Service Workers sandbox execution. IndexedDB keeps everything local. Defense in depth, by default.':
    'Web Crypto API verschlüsselt Ihre Tokens. Service Workers isolieren die Ausführung. IndexedDB hält alles lokal. Tiefenverteidigung, standardmäßig.',
  'Intelligent Task Analysis': 'Intelligente Aufgabenanalyse',
  'Complexity, Simplified': 'Komplexität, vereinfacht',
  'An LLM-powered analyser breaks your request into requirements, recruits the right agents, resolves dependencies, and orchestrates delivery.':
    'Ein LLM-gestützter Analysator zerlegt Ihre Anfrage in Anforderungen, rekrutiert die richtigen Agenten, löst Abhängigkeiten auf und orchestriert die Lieferung.',
  'Offline-First & P2P': 'Offline-First & P2P',
  'Works Anywhere': 'Funktioniert überall',
  'Fully functional without internet after first load. Optional Yjs-powered P2P sync lets you collaborate across devices without a central server.':
    'Voll funktionsfähig ohne Internet nach dem ersten Laden. Optionale Yjs-gestützte P2P-Synchronisation ermöglicht geräteübergreifende Zusammenarbeit ohne zentralen Server.',
  'Extensible by Nature': 'Von Natur aus erweiterbar',
  'Build on Top': 'Darauf aufbauen',
  'A marketplace of agents, tools, connectors, and apps — plus a sandboxed Extension Bridge so the community can create and share new capabilities.':
    'Ein Marktplatz für Agenten, Tools, Konnektoren und Apps — plus eine sandboxed Extension Bridge, damit die Community neue Fähigkeiten erstellen und teilen kann.',

  // How it works section
  'Getting Started': 'Erste Schritte',
  'Four Steps to Delegation': 'Vier Schritte zur Delegation',
  'From prompt to polished output in minutes, not hours.':
    'Vom Prompt zum fertigen Ergebnis in Minuten, nicht Stunden.',
  'Configure your AI provider': 'Konfigurieren Sie Ihren KI-Anbieter',
  'Connect your preferred LLM — OpenAI, Anthropic, Gemini, Ollama, or any compatible endpoint.':
    'Verbinden Sie Ihr bevorzugtes LLM — OpenAI, Anthropic, Gemini, Ollama oder jeden kompatiblen Endpunkt.',
  'Describe your task': 'Beschreiben Sie Ihre Aufgabe',
  'Tell DEVS what you need in natural language. Be ambitious — the orchestrator thrives on complexity.':
    'Sagen Sie DEVS in natürlicher Sprache, was Sie brauchen. Seien Sie ambitioniert — der Orchestrator lebt von Komplexität.',
  'Watch agents collaborate': 'Beobachten Sie die Zusammenarbeit der Agenten',
  'See specialised agents plan, execute, and validate in real-time. Intervene, guide, or just observe.':
    'Sehen Sie, wie spezialisierte Agenten in Echtzeit planen, ausführen und validieren. Greifen Sie ein, leiten Sie an oder beobachten Sie einfach.',
  'Receive & refine': 'Empfangen und verfeinern',
  'Get structured artefacts — code, docs, analyses — and iterate with feedback until it\u2019s right.':
    'Erhalten Sie strukturierte Artefakte — Code, Docs, Analysen — und iterieren Sie mit Feedback, bis es stimmt.',

  // Use cases section
  'For Everyone': 'Für alle',
  'Built for Builders': 'Gebaut für Macher',
  'Whether you\u2019re writing code or writing prose — DEVS adapts to you.':
    'Ob Sie Code oder Prosa schreiben — DEVS passt sich Ihnen an.',
  Students: 'Studierende',
  'Research, study planning & assignment help':
    'Recherche, Studienplanung und Aufgabenhilfe',
  Developers: 'Entwickler',
  'Rapid prototyping, code generation & reviews':
    'Schnelles Prototyping, Code-Generierung und Reviews',
  Creators: 'Kreative',
  'Brainstorming, writing & content production':
    'Brainstorming, Schreiben und Content-Produktion',
  Researchers: 'Forscher',
  'Literature review, data analysis & hypothesis testing':
    'Literaturrecherche, Datenanalyse und Hypothesentests',
  Managers: 'Manager',
  'Project planning, task breakdown & operations':
    'Projektplanung, Aufgabenaufteilung und Betrieb',
  Entrepreneurs: 'Unternehmer',
  'Idea validation, strategy & business planning':
    'Ideenvalidierung, Strategie und Geschäftsplanung',

  // FAQ section
  FAQ: 'FAQ',
  'Common Questions': 'Häufige Fragen',
  'Is my data private?': 'Sind meine Daten privat?',
  'Absolutely. All processing happens locally in your browser. We never collect, transmit, or store any of your data. Your API keys are encrypted with the Web Crypto API and never leave your device.':
    'Absolut. Die gesamte Verarbeitung erfolgt lokal in Ihrem Browser. Wir sammeln, übertragen oder speichern niemals Ihre Daten. Ihre API-Schlüssel werden mit der Web Crypto API verschlüsselt und verlassen niemals Ihr Gerät.',
  'Which AI providers are supported?': 'Welche KI-Anbieter werden unterstützt?',
  'We support {providers}, and any provider compatible with the OpenAI API specification. You can switch providers at any time without losing your conversations or data.':
    'Wir unterstützen {providers} und jeden Anbieter, der mit der OpenAI-API-Spezifikation kompatibel ist. Sie können jederzeit den Anbieter wechseln, ohne Gespräche oder Daten zu verlieren.',
  'Do I need to install anything?': 'Muss ich etwas installieren?',
  'Nothing at all. DEVS is a Progressive Web App that runs entirely in your browser. You can optionally \u201Cinstall\u201D it to your home screen for a native-like experience, but it\u2019s never required.':
    'Überhaupt nichts. DEVS ist eine Progressive Web App, die vollständig in Ihrem Browser läuft. Sie können sie optional auf Ihrem Startbildschirm \u201Cinstallieren\u201D für ein natives Erlebnis, aber es ist nie erforderlich.',
  'Is this really free and open source?':
    'Ist das wirklich kostenlos und Open Source?',
  'Yes — {license} licensed and always will be. The entire codebase is on GitHub. You can self-host, fork, or contribute. No premium tiers, no paywalls.':
    'Ja — {license}-lizenziert und wird es immer bleiben. Der gesamte Code ist auf GitHub. Sie können selbst hosten, forken oder beitragen. Keine Premium-Stufen, keine Paywalls.',
  'Can I use it offline?': 'Kann ich es offline nutzen?',
  'After the first load, the Service Worker caches everything you need. You can create agents, manage knowledge, and review past conversations without any internet connection. LLM calls obviously require connectivity to the provider.':
    'Nach dem ersten Laden speichert der Service Worker alles, was Sie brauchen. Sie können Agenten erstellen, Wissen verwalten und vergangene Gespräche durchsehen — ohne Internetverbindung. LLM-Aufrufe erfordern natürlich eine Verbindung zum Anbieter.',
  'How does multi-agent orchestration work?':
    'Wie funktioniert die Multi-Agenten-Orchestrierung?',
  'When you describe a complex task, the built-in orchestrator analyses it, breaks it into subtasks, recruits specialised agents, resolves dependencies, and coordinates parallel execution — just like a well-run project team.':
    'Wenn Sie eine komplexe Aufgabe beschreiben, analysiert der integrierte Orchestrator sie, zerlegt sie in Unteraufgaben, rekrutiert spezialisierte Agenten, löst Abhängigkeiten auf und koordiniert die parallele Ausführung — genau wie ein gut geführtes Projektteam.',

  // CTA section
  'Shape the Future With Us': 'Gestalten Sie die Zukunft mit uns',
  '{product} is built by people who believe technology should empower, not enclose. Every contribution — code, ideas, feedback — makes AI augmentation more accessible to the world.':
    '{product} wird von Menschen gebaut, die glauben, dass Technologie ermächtigen, nicht einschränken sollte. Jeder Beitrag — Code, Ideen, Feedback — macht KI-Augmentierung für die Welt zugänglicher.',
  'View on GitHub': 'Auf GitHub ansehen',
  'Open an Issue': 'Issue eröffnen',
  'Made with care for humans everywhere.':
    'Mit Sorgfalt für Menschen überall gemacht.',
}
