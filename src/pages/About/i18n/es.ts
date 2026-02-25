import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Hero
  'AI Augmentation for Everyone': 'Aumento de IA para todos',
  '{product} is a browser-native AI agent orchestration platform. Delegate complex tasks to teams of specialised agents that plan, collaborate, and deliver — all running':
    '{product} es una plataforma de orquestación de agentes de IA nativa del navegador. Delega tareas complejas a equipos de agentes especializados que planifican, colaboran y entregan — todo funcionando',
  'entirely on your device': 'completamente en tu dispositivo',
  '\u201CAI augmentation shouldn\u2019t be a luxury for the few, but a fundamental tool available to all — where anyone can leverage the power of AI teams to amplify their capabilities and achieve their goals.\u201D':
    '\u201CEl aumento de IA no debería ser un lujo para unos pocos, sino una herramienta fundamental disponible para todos — donde cualquiera pueda aprovechar el poder de los equipos de IA para amplificar sus capacidades y alcanzar sus objetivos.\u201D',

  // Principles section
  Philosophy: 'Filosofía',
  'Built on Conviction': 'Construido sobre convicciones',
  'Three non-negotiable principles guide every decision we make.':
    'Tres principios innegociables guían cada decisión que tomamos.',
  'Privacy by Design': 'Privacidad por diseño',
  'Every byte of your data stays on your device. No servers. No telemetry. No compromise.':
    'Cada byte de tus datos permanece en tu dispositivo. Sin servidores. Sin telemetría. Sin compromisos.',
  'Universally Accessible': 'Universalmente accesible',
  'A browser is all you need. No installation, no GPU, no special hardware — just open and create.':
    'Un navegador es todo lo que necesitas. Sin instalación, sin GPU, sin hardware especial — solo abre y crea.',
  'Open Source Forever': 'Código abierto para siempre',
  'Built in the open, shaped by the community. Every line of code is yours to read, improve, and share.':
    'Construido en abierto, moldeado por la comunidad. Cada línea de código es tuya para leer, mejorar y compartir.',

  // Capabilities section
  Capabilities: 'Capacidades',
  'Powerful by Design': 'Poderoso por diseño',
  'A depth of engineering so you can focus on what matters — your ideas.':
    'Una profundidad de ingeniería para que puedas concentrarte en lo que importa — tus ideas.',
  'Multi-Agent Orchestration': 'Orquestación multi-agente',
  'Collective Intelligence': 'Inteligencia colectiva',
  'Compose teams of specialised AI agents that plan, execute, and validate together — mirroring how the best human teams operate.':
    'Compón equipos de agentes IA especializados que planifican, ejecutan y validan juntos — reflejando cómo operan los mejores equipos humanos.',
  'Provider Independence': 'Independencia del proveedor',
  'Your Models, Your Choice': 'Tus modelos, tu elección',
  'Seamlessly switch between OpenAI, Anthropic, Google Gemini, Mistral, Ollama, or any OpenAI-compatible endpoint. Never locked in.':
    'Cambia sin problemas entre OpenAI, Anthropic, Google Gemini, Mistral, Ollama o cualquier endpoint compatible con OpenAI. Nunca encerrado.',
  'Zero-Trust Architecture': 'Arquitectura Zero-Trust',
  'Security as a Foundation': 'Seguridad como base',
  'Web Crypto API encrypts your tokens. Service Workers sandbox execution. IndexedDB keeps everything local. Defense in depth, by default.':
    'Web Crypto API cifra tus tokens. Los Service Workers aíslan la ejecución. IndexedDB mantiene todo local. Defensa en profundidad, por defecto.',
  'Intelligent Task Analysis': 'Análisis inteligente de tareas',
  'Complexity, Simplified': 'Complejidad, simplificada',
  'An LLM-powered analyser breaks your request into requirements, recruits the right agents, resolves dependencies, and orchestrates delivery.':
    'Un analizador impulsado por LLM desglosa tu solicitud en requisitos, recluta los agentes correctos, resuelve dependencias y orquesta la entrega.',
  'Offline-First & P2P': 'Offline-First y P2P',
  'Works Anywhere': 'Funciona en cualquier lugar',
  'Fully functional without internet after first load. Optional Yjs-powered P2P sync lets you collaborate across devices without a central server.':
    'Totalmente funcional sin internet tras la primera carga. La sincronización P2P opcional con Yjs te permite colaborar entre dispositivos sin servidor central.',
  'Extensible by Nature': 'Extensible por naturaleza',
  'Build on Top': 'Construye encima',
  'A marketplace of agents, tools, connectors, and apps — plus a sandboxed Extension Bridge so the community can create and share new capabilities.':
    'Un marketplace de agentes, herramientas, conectores y apps — más un Extension Bridge aislado para que la comunidad pueda crear y compartir nuevas capacidades.',

  // How it works section
  'Getting Started': 'Primeros pasos',
  'Four Steps to Delegation': 'Cuatro pasos hacia la delegación',
  'From prompt to polished output in minutes, not hours.':
    'Del prompt al resultado pulido en minutos, no horas.',
  'Configure your AI provider': 'Configura tu proveedor de IA',
  'Connect your preferred LLM — OpenAI, Anthropic, Gemini, Ollama, or any compatible endpoint.':
    'Conecta tu LLM preferido — OpenAI, Anthropic, Gemini, Ollama o cualquier endpoint compatible.',
  'Describe your task': 'Describe tu tarea',
  'Tell DEVS what you need in natural language. Be ambitious — the orchestrator thrives on complexity.':
    'Dile a DEVS lo que necesitas en lenguaje natural. Sé ambicioso — el orquestador prospera con la complejidad.',
  'Watch agents collaborate': 'Observa a los agentes colaborar',
  'See specialised agents plan, execute, and validate in real-time. Intervene, guide, or just observe.':
    'Observa cómo los agentes especializados planifican, ejecutan y validan en tiempo real. Intervén, guía o simplemente observa.',
  'Receive & refine': 'Recibe y refina',
  'Get structured artefacts — code, docs, analyses — and iterate with feedback until it\u2019s right.':
    'Obtén artefactos estructurados — código, docs, análisis — e itera con retroalimentación hasta que esté correcto.',

  // Use cases section
  'For Everyone': 'Para todos',
  'Built for Builders': 'Construido para creadores',
  'Whether you\u2019re writing code or writing prose — DEVS adapts to you.':
    'Ya sea que escribas código o prosa — DEVS se adapta a ti.',
  Students: 'Estudiantes',
  'Research, study planning & assignment help':
    'Investigación, planificación de estudios y ayuda con tareas',
  Developers: 'Desarrolladores',
  'Rapid prototyping, code generation & reviews':
    'Prototipado rápido, generación de código y revisiones',
  Creators: 'Creadores',
  'Brainstorming, writing & content production':
    'Lluvia de ideas, escritura y producción de contenido',
  Researchers: 'Investigadores',
  'Literature review, data analysis & hypothesis testing':
    'Revisión de literatura, análisis de datos y pruebas de hipótesis',
  Managers: 'Gerentes',
  'Project planning, task breakdown & operations':
    'Planificación de proyectos, desglose de tareas y operaciones',
  Entrepreneurs: 'Emprendedores',
  'Idea validation, strategy & business planning':
    'Validación de ideas, estrategia y planificación de negocios',

  // FAQ section
  FAQ: 'FAQ',
  'Common Questions': 'Preguntas frecuentes',
  'Is my data private?': '¿Mis datos son privados?',
  'Absolutely. All processing happens locally in your browser. We never collect, transmit, or store any of your data. Your API keys are encrypted with the Web Crypto API and never leave your device.':
    'Absolutamente. Todo el procesamiento ocurre localmente en tu navegador. Nunca recopilamos, transmitimos ni almacenamos ninguno de tus datos. Tus claves API están cifradas con la Web Crypto API y nunca abandonan tu dispositivo.',
  'Which AI providers are supported?':
    '¿Qué proveedores de IA son compatibles?',
  'We support {providers}, and any provider compatible with the OpenAI API specification. You can switch providers at any time without losing your conversations or data.':
    'Soportamos {providers}, y cualquier proveedor compatible con la especificación de la API de OpenAI. Puedes cambiar de proveedor en cualquier momento sin perder tus conversaciones o datos.',
  'Do I need to install anything?': '¿Necesito instalar algo?',
  'Nothing at all. DEVS is a Progressive Web App that runs entirely in your browser. You can optionally \u201Cinstall\u201D it to your home screen for a native-like experience, but it\u2019s never required.':
    'Nada en absoluto. DEVS es una Progressive Web App que funciona completamente en tu navegador. Opcionalmente puedes \u201Cinstalarla\u201D en tu pantalla de inicio para una experiencia nativa, pero nunca es obligatorio.',
  'Is this really free and open source?':
    '¿Es realmente gratuito y de código abierto?',
  'Yes — {license} licensed and always will be. The entire codebase is on GitHub. You can self-host, fork, or contribute. No premium tiers, no paywalls.':
    'Sí — con licencia {license} y siempre lo será. Todo el código fuente está en GitHub. Puedes autoalojar, hacer fork o contribuir. Sin niveles premium, sin muros de pago.',
  'Can I use it offline?': '¿Puedo usarlo sin conexión?',
  'After the first load, the Service Worker caches everything you need. You can create agents, manage knowledge, and review past conversations without any internet connection. LLM calls obviously require connectivity to the provider.':
    'Tras la primera carga, el Service Worker almacena en caché todo lo que necesitas. Puedes crear agentes, gestionar conocimiento y revisar conversaciones pasadas sin conexión a internet. Las llamadas LLM obviamente requieren conectividad con el proveedor.',
  'How does multi-agent orchestration work?':
    '¿Cómo funciona la orquestación multi-agente?',
  'When you describe a complex task, the built-in orchestrator analyses it, breaks it into subtasks, recruits specialised agents, resolves dependencies, and coordinates parallel execution — just like a well-run project team.':
    'Cuando describes una tarea compleja, el orquestador integrado la analiza, la divide en subtareas, recluta agentes especializados, resuelve dependencias y coordina la ejecución paralela — como un equipo de proyecto bien dirigido.',

  // CTA section
  'Shape the Future With Us': 'Forma el futuro con nosotros',
  '{product} is built by people who believe technology should empower, not enclose. Every contribution — code, ideas, feedback — makes AI augmentation more accessible to the world.':
    '{product} está construido por personas que creen que la tecnología debe empoderar, no encerrar. Cada contribución — código, ideas, feedback — hace que el aumento de IA sea más accesible para el mundo.',
  'View on GitHub': 'Ver en GitHub',
  'Open an Issue': 'Abrir un Issue',
  'Made with care for humans everywhere.':
    'Hecho con cariño para humanos en todas partes.',
}
