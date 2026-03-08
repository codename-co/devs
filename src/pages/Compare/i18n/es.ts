import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Hero
  Comparison: 'Comparación',
  '{productName} vs {alternative}': '{productName} vs {alternative}',
  'Full AI agent orchestration that runs in your browser — no cloud, no credits, no limits.':
    'Orquestación completa de agentes IA en tu navegador — sin nube, sin créditos, sin límites.',
  'Try {productName} Free →': 'Prueba {productName} gratis →',
  'View on GitHub': 'Ver en GitHub',

  // TL;DR
  Privacy: 'Privacidad',
  '100% client-side': '100% en el cliente',
  'Cloud (Meta infra)': 'Nube (infra de Meta)',
  Pricing: 'Precios',
  'Free forever': 'Gratis para siempre',
  'From $39/mo': 'Desde 39 $/mes',
  Orchestration: 'Orquestación',
  'Multi-agent teams': 'Equipos multi-agente',
  'Single agent': 'Agente único',

  // Feature table
  'Feature Comparison': 'Comparación de características',
  'Head-to-Head Comparison': 'Comparación cara a cara',
  Feature: 'Característica',

  // Feature names + devs + alt
  'Open Source': 'Código abierto',
  'MIT License': 'Licencia MIT',
  No: 'No',
  'Browser-Native': 'Nativo del navegador',
  Yes: 'Sí',
  'Web app (cloud)': 'App web (nube)',
  'Data Stays Local': 'Datos locales',
  'Multi-Agent Orchestration': 'Orquestación multi-agente',
  Advanced: 'Avanzada',
  'Bring Your Own Keys': 'Trae tus propias claves',
  'Offline Capable': 'Funciona sin conexión',
  'P2P Sync': 'Sincronización P2P',
  'Agent Memory': 'Memoria de agente',
  'Projects only': 'Solo proyectos',
  'LLM Provider Choice': 'Elección de proveedor LLM',
  '6+ providers': '6+ proveedores',
  'Locked to {alternative}': 'Bloqueado en {alternative}',
  'Free Tier': 'Plan gratuito',
  Unlimited: 'Ilimitado',
  '4,000 credits/mo': '4.000 créditos/mes',

  // Advantages
  'Why {productName}': 'Por qué {productName}',
  'Why Teams Choose {productName} over {alternative}':
    'Por qué los equipos eligen {productName} en vez de {alternative}',
  'True Privacy': 'Privacidad real',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Manus processes everything on Meta\u2019s cloud infrastructure.':
    'Todos los datos permanecen en tu navegador — IndexedDB, tokens cifrados, cero telemetría. Manus procesa todo en la infraestructura cloud de Meta.',
  'Zero Platform Cost': 'Cero coste de plataforma',
  'Pay only for your own LLM API usage. No $39/month subscription, no credit limits, no surprise bills.':
    'Paga solo por tu propio uso de API LLM. Sin suscripción de 39 $/mes, sin límites de créditos, sin facturas sorpresa.',
  'Multi-Agent Teams': 'Equipos multi-agente',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} runs a single agent per task.':
    'Coordina equipos de agentes especializados con resolución de dependencias y ejecución paralela. {alternative} ejecuta un solo agente por tarea.',
  'Provider Freedom': 'Libertad de proveedor',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own infrastructure.':
    'Cambia entre OpenAI, Anthropic, Gemini, Ollama, Mistral y más. {alternative} te encierra en su propia infraestructura.',

  // Pricing
  'Stop Paying for the Platform': 'Deja de pagar por la plataforma',
  '{productName}': '{productName}',
  '$0/mo': '0 $/mes',
  'Unlimited agents': 'Agentes ilimitados',
  'All features included': 'Todas las funciones incluidas',
  'Full data privacy': 'Privacidad total de datos',
  'BYOK \u2014 any LLM provider': 'BYOK — cualquier proveedor LLM',
  'Credit-based usage': 'Uso basado en créditos',
  'Paid tiers for more': 'Planes de pago para más',
  'Cloud-only processing': 'Procesamiento solo en la nube',
  'Locked to {alternative} infra': 'Bloqueado en la infra de {alternative}',

  // Honest take
  'Honest Take': 'Nuestra opinión honesta',
  'Who Should Choose What': 'Quién debería elegir qué',
  'Choose {productName} if you\u2026': 'Elige {productName} si\u2026',
  'Care about data privacy and sovereignty':
    'Te importa la privacidad y soberanía de los datos',
  'Want full control over LLM providers and costs':
    'Quieres control total sobre proveedores LLM y costes',
  'Need multi-agent orchestration with team coordination':
    'Necesitas orquestación multi-agente con coordinación de equipo',
  'Prefer open-source, self-hosted solutions':
    'Prefieres soluciones de código abierto y autoalojadas',
  'Want to work offline or in air-gapped environments':
    'Quieres trabajar sin conexión o en entornos aislados',
  'Consider {alternative} if you\u2026': 'Considera {alternative} si\u2026',
  'Want a polished, zero-config SaaS experience out of the box':
    'Quieres una experiencia SaaS lista para usar y sin configuración',
  'Prefer not to manage your own LLM API keys':
    'Prefieres no gestionar tus propias claves API LLM',
  'Need built-in Slack integration and scheduled tasks':
    'Necesitas integración nativa con Slack y tareas programadas',

  // OpenManus — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Python, no server, no setup.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin Python, sin servidor, sin configuraci\u00f3n.',

  // OpenManus — TL;DR
  'Python environment': 'Entorno Python',
  'Python framework': 'Framework Python',
  UX: 'UX',
  'Visual UI': 'Interfaz visual',
  'Command-line / code-first': 'L\u00ednea de comandos / c\u00f3digo primero',

  // OpenManus — Feature table
  'No (Python)': 'No (Python)',
  'Yes (self-hosted)': 'S\u00ed (autoalojado)',
  'Basic flows': 'Flujos b\u00e1sicos',
  'No (needs API)': 'No (necesita API)',
  'OpenAI-compatible': 'Compatible con OpenAI',

  // OpenManus — Advantages
  'Zero Setup': 'Sin configuración',
  'No Python, no dependencies, no virtual environments \u2014 just open a browser and start orchestrating agents instantly.':
    'Sin Python, sin dependencias, sin entornos virtuales \u2014 solo abre un navegador y comienza a orquestar agentes al instante.',
  'Visual Experience': 'Experiencia visual',
  'Full graphical UI with agent visualization, real-time workflow tracking, and drag-and-drop. {alternative} is a code-first, command-line tool.':
    'Interfaz gr\u00e1fica completa con visualizaci\u00f3n de agentes, seguimiento de flujo en tiempo real y arrastrar y soltar. {alternative} es una herramienta de l\u00ednea de comandos orientada al c\u00f3digo.',
  'Agent Memory & Learning': 'Memoria y aprendizaje de agentes',
  'Agents remember context across conversations with a persistent memory system and human review. {alternative} has no built-in memory layer.':
    'Los agentes recuerdan el contexto entre conversaciones con un sistema de memoria persistente y revisi\u00f3n humana. {alternative} no tiene capa de memoria integrada.',
  'Works on any device including mobile \u2014 no install, no server, no Python runtime. Everything runs client-side as a PWA.':
    'Funciona en cualquier dispositivo incluyendo m\u00f3vil \u2014 sin instalaci\u00f3n, sin servidor, sin entorno Python. Todo se ejecuta en el cliente como PWA.',

  // OpenManus — Pricing
  'Free (self-hosted)': 'Gratis (autoalojado)',
  'Requires Python environment': 'Requiere entorno Python',
  'No managed hosting': 'Sin alojamiento gestionado',
  'Setup & maintenance required':
    'Configuraci\u00f3n y mantenimiento requeridos',
  'CLI-first interface': 'Interfaz de l\u00ednea de comandos',

  // OpenManus — Honest take
  'Need Python-based extensibility and custom agent code':
    'Necesitas extensibilidad basada en Python y c\u00f3digo de agente personalizado',
  'Prefer a code-first approach over visual UI':
    'Prefieres un enfoque orientado al c\u00f3digo sobre interfaz visual',
  'Want A2A protocol support': 'Quieres soporte del protocolo A2A',

  // CTA
  'Ready to Take Control of Your AI Workflow?':
    '\u00bfListo para tomar el control de tu flujo de trabajo con IA?',
  'Start using {productName} for free \u2014 no account needed, no credit card, no server to set up.':
    'Empieza a usar {productName} gratis \u2014 sin cuenta, sin tarjeta de cr\u00e9dito, sin servidor que configurar.',
  'Get Started \u2192': 'Comenzar \u2192',
  'View Source on GitHub': 'Ver c\u00f3digo fuente en GitHub',

  // Lemon AI — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Node.js, no limits.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin Docker, sin Node.js, sin l\u00edmites.',

  // Lemon AI — TL;DR
  Setup: 'Configuraci\u00f3n',
  'Zero install (browser)': 'Sin instalaci\u00f3n (navegador)',
  'Docker + Node.js': 'Docker + Node.js',
  Architecture: 'Arquitectura',
  'Browser-native PWA': 'PWA nativa del navegador',
  'Desktop app (Vue + Node.js)': 'App de escritorio (Vue + Node.js)',

  // Lemon AI — Feature table
  'No (desktop app)': 'No (app de escritorio)',
  'Yes (Docker sandbox)': 'S\u00ed (sandbox Docker)',
  'Partial (local LLM only)': 'Parcial (solo LLM local)',
  'Self-evolving': 'Auto-evolutivo',
  'Free + subscription': 'Gratis + suscripci\u00f3n',

  // Lemon AI — Advantages
  'No Docker or Node.js needed, just open your browser. {alternative} requires a local Docker environment and Node.js backend to run.':
    'Sin necesidad de Docker ni Node.js, solo abre tu navegador. {alternative} requiere un entorno Docker local y un backend Node.js.',
  'Full team orchestration with dependency resolution, not just single agent. {alternative} runs one agent at a time.':
    'Orquestaci\u00f3n completa de equipos con resoluci\u00f3n de dependencias, no solo un agente \u00fanico. {alternative} ejecuta un solo agente a la vez.',
  'Works on any device, no installation, progressive web app. {alternative} is a desktop application built with Vue + Node.js.':
    'Funciona en cualquier dispositivo, sin instalaci\u00f3n, aplicaci\u00f3n web progresiva. {alternative} es una aplicaci\u00f3n de escritorio construida con Vue + Node.js.',
  'P2P Collaboration': 'Colaboraci\u00f3n P2P',
  'Cross-device sync via WebRTC, real-time collaboration. {alternative} has no built-in sync or collaboration features.':
    'Sincronizaci\u00f3n entre dispositivos v\u00eda WebRTC, colaboraci\u00f3n en tiempo real. {alternative} no tiene funciones de sincronizaci\u00f3n ni colaboraci\u00f3n integradas.',

  // Lemon AI — Pricing
  'Free + paid tiers': 'Gratis + niveles de pago',
  'Online subscription available': 'Suscripci\u00f3n en l\u00ednea disponible',
  'Requires Docker for sandbox': 'Requiere Docker para sandbox',
  'Node.js backend required': 'Backend Node.js requerido',
  'Single agent architecture': 'Arquitectura de agente \u00fanico',

  // Lemon AI — Honest take
  'Need Docker VM sandbox for safe code execution':
    'Necesitas sandbox Docker VM para ejecuci\u00f3n segura de c\u00f3digo',
  'Want built-in deep search and vibe coding':
    'Quieres b\u00fasqueda profunda integrada y vibe coding',
  'Prefer a self-evolving memory system':
    'Prefieres un sistema de memoria auto-evolutivo',

  // DeepChat — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no download, no Electron, no limits.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin descarga, sin Electron, sin l\u00edmites.',

  // DeepChat — TL;DR
  'Electron app download': 'Descarga de app Electron',
  'Single chat interface': 'Interfaz de chat \u00fanica',
  'Desktop app (Electron)': 'App de escritorio (Electron)',

  // DeepChat — Feature table
  'No (Electron desktop)': 'No (escritorio Electron)',
  'No (single chat)': 'No (chat \u00fanico)',
  'Yes (30+ providers)': 'S\u00ed (30+ proveedores)',
  'Yes (with Ollama)': 'S\u00ed (con Ollama)',
  '30+ providers': '30+ proveedores',

  // DeepChat — Advantages
  'Zero Install': 'Cero instalaci\u00f3n',
  'No download, no Electron app. Just open your browser on any device. {alternative} requires a desktop application download.':
    'Sin descarga, sin app Electron. Solo abre tu navegador en cualquier dispositivo. {alternative} requiere descargar una aplicaci\u00f3n de escritorio.',
  'Coordinate specialized agent teams with dependency resolution. {alternative} is a single-chat interface without orchestration.':
    'Coordina equipos de agentes especializados con resoluci\u00f3n de dependencias. {alternative} es una interfaz de chat \u00fanica sin orquestaci\u00f3n.',
  'Persistent agent memory with human review, categories, confidence levels. {alternative} has no memory system.':
    'Memoria de agente persistente con revisi\u00f3n humana, categor\u00edas, niveles de confianza. {alternative} no tiene sistema de memoria.',
  'Cross-device synchronization via Yjs/WebRTC. {alternative} is limited to one device.':
    'Sincronizaci\u00f3n entre dispositivos v\u00eda Yjs/WebRTC. {alternative} est\u00e1 limitado a un solo dispositivo.',

  // DeepChat — Pricing
  Free: 'Gratis',
  'Desktop-only (Electron)': 'Solo escritorio (Electron)',
  'No multi-agent orchestration': 'Sin orquestaci\u00f3n multi-agente',
  'No P2P sync or collaboration':
    'Sin sincronizaci\u00f3n P2P ni colaboraci\u00f3n',
  'No agent memory system': 'Sin sistema de memoria de agente',

  // DeepChat — Honest take
  'Prefer a native desktop app experience with multi-window UI':
    'Prefieres una experiencia de app de escritorio nativa con interfaz multi-ventana',
  'Need MCP tool calling and ACP agent protocol support':
    'Necesitas llamadas a herramientas MCP y soporte del protocolo de agente ACP',
  'Want built-in search enhancement (Brave, Google, Bing)':
    'Quieres mejora de b\u00fasqueda integrada (Brave, Google, Bing)',

  // HappyCapy — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no cloud sandbox, no credits, no limits.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin sandbox en la nube, sin cr\u00e9ditos, sin l\u00edmites.',

  // HappyCapy — TL;DR
  'Cloud sandbox': 'Sandbox en la nube',
  'From ${price}/mo': 'Desde ${price}/mes',
  'Closed source': 'C\u00f3digo cerrado',

  // HappyCapy — Feature table
  'No (cloud infra)': 'No (infra en la nube)',
  'Agent teams (preview)': 'Equipos de agentes (vista previa)',
  'Via skills': 'Mediante habilidades',
  '{alternative} models': 'Modelos de {alternative}',
  'Limited credits': 'Cr\u00e9ditos limitados',

  // HappyCapy — Advantages
  'All processing stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} runs everything on a cloud sandbox.':
    'Todo el procesamiento permanece en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. {alternative} ejecuta todo en un sandbox en la nube.',
  'No subscription, no credits. {alternative} starts at $17/mo and goes up to $200/mo for full features.':
    'Sin suscripci\u00f3n, sin cr\u00e9ditos. {alternative} empieza en 17 $/mes y llega hasta 200 $/mes para todas las funciones.',
  'Full MIT-licensed codebase \u2014 inspect, modify, self-host. {alternative} is closed source.':
    'C\u00f3digo completo con licencia MIT \u2014 inspecciona, modifica, autoaloja. {alternative} es de c\u00f3digo cerrado.',
  'Use any LLM provider \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their model access.':
    'Usa cualquier proveedor LLM \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral y m\u00e1s. {alternative} te encierra en su acceso a modelos.',

  // HappyCapy — Pricing
  'Closed-source platform': 'Plataforma de c\u00f3digo cerrado',
  'Locked to {alternative} models': 'Bloqueado en los modelos de {alternative}',

  // HappyCapy — Honest take
  'Want a managed cloud sandbox environment':
    'Quieres un entorno sandbox en la nube gestionado',
  'Need built-in email integration and scheduling':
    'Necesitas integraci\u00f3n de correo y programaci\u00f3n integradas',
  'Prefer access to 150+ models without managing API keys':
    'Prefieres acceso a m\u00e1s de 150 modelos sin gestionar claves API',

  // DeepChat — Feature table (shared)
  'Apache 2.0': 'Apache 2.0',

  // Kortix — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no database, no infrastructure.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin Docker, sin base de datos, sin infraestructura.',

  // Kortix — TL;DR
  'Self-hosted (Docker + Supabase)': 'Autoalojado (Docker + Supabase)',
  'Docker + Supabase stack': 'Stack Docker + Supabase',
  'Server-based (Python/FastAPI)': 'Basado en servidor (Python/FastAPI)',

  // Kortix — Feature table
  'Yes (custom license)': 'S\u00ed (licencia personalizada)',
  'No (Next.js dashboard)': 'No (panel Next.js)',
  'Self-hosted Supabase': 'Supabase autoalojado',
  'Single agent runtimes': 'Entornos de agente \u00fanico',
  'Yes (via LiteLLM)': 'S\u00ed (v\u00eda LiteLLM)',
  Limited: 'Limitado',
  'Multiple (via LiteLLM)': 'M\u00faltiples (v\u00eda LiteLLM)',
  'Zero Infrastructure': 'Cero infraestructura',
  'Requires Docker + Supabase': 'Requiere Docker + Supabase',

  // Kortix — Advantages
  'Open your browser and start working \u2014 no Docker, no Supabase, no FastAPI server. {alternative} requires a full infrastructure stack to self-host.':
    'Abre tu navegador y empieza a trabajar \u2014 sin Docker, sin Supabase, sin servidor FastAPI. {alternative} requiere una pila de infraestructura completa para autoalojar.',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. Sin servidor en absoluto, ni siquiera autoalojado.',
  'Works on any device with a browser \u2014 desktop, tablet, or mobile. No server requirements, no Docker containers, fully offline capable.':
    'Funciona en cualquier dispositivo con navegador \u2014 escritorio, tablet o m\u00f3vil. Sin requisitos de servidor, sin contenedores Docker, totalmente capaz sin conexi\u00f3n.',
  'No Infrastructure': 'Sin infraestructura',
  'No Docker containers, no PostgreSQL database, no Python backend to maintain. {alternative} needs ongoing server management and updates.':
    'Sin contenedores Docker, sin base de datos PostgreSQL, sin backend Python que mantener. {alternative} necesita gesti\u00f3n y actualizaciones continuas del servidor.',

  // Kortix — Pricing
  'Requires server hosting costs': 'Requiere costes de alojamiento de servidor',
  'Docker + Supabase infrastructure': 'Infraestructura Docker + Supabase',
  'Ongoing maintenance overhead': 'Sobrecarga de mantenimiento continuo',
  'Server administration required': 'Administraci\u00f3n de servidor requerida',

  // Kortix — Honest take
  'Need Docker-sandboxed code execution for agent runtimes':
    'Necesitas ejecuci\u00f3n de c\u00f3digo en sandbox Docker para entornos de agente',
  'Want server-side agent runtimes with persistent processes':
    'Quieres entornos de agente en servidor con procesos persistentes',
  'Need built-in browser automation via Playwright':
    'Necesitas automatizaci\u00f3n de navegador integrada v\u00eda Playwright',

  // AgenticSeek — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no setup.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin Docker, sin Python, sin configuraci\u00f3n.',

  // AgenticSeek — TL;DR
  'Docker + Python setup': 'Configuraci\u00f3n Docker + Python',
  'Single agent routing': 'Enrutamiento de agente \u00fanico',
  'Desktop (Python + Docker)': 'Escritorio (Python + Docker)',

  // AgenticSeek — Feature table
  'GPL-3.0': 'GPL-3.0',
  'No (Python + Docker)': 'No (Python + Docker)',
  'Smart routing': 'Enrutamiento inteligente',
  'Yes (local LLM)': 'S\u00ed (LLM local)',
  'Session recovery': 'Recuperaci\u00f3n de sesi\u00f3n',
  '8+ providers': '8+ proveedores',

  // AgenticSeek — Advantages
  'No Python, no Docker, no SearxNG \u2014 just open your browser. {alternative} requires a full Docker + Python environment.':
    'Sin Python, sin Docker, sin SearxNG \u2014 solo abre tu navegador. {alternative} requiere un entorno completo de Docker + Python.',
  'Full team orchestration with dependency resolution and parallel execution. {alternative} uses smart routing to a single agent.':
    'Orquestaci\u00f3n completa de equipos con resoluci\u00f3n de dependencias y ejecuci\u00f3n paralela. {alternative} usa enrutamiento inteligente hacia un solo agente.',
  'Works on any device including mobile. {alternative} is desktop-only with Python + Docker.':
    'Funciona en cualquier dispositivo incluyendo m\u00f3vil. {alternative} es solo escritorio con Python + Docker.',
  'Cross-device sync via Yjs/WebRTC. {alternative} has no collaboration features.':
    'Sincronizaci\u00f3n entre dispositivos v\u00eda Yjs/WebRTC. {alternative} no tiene funciones de colaboraci\u00f3n.',

  // AgenticSeek — Pricing
  'Requires Docker + Python': 'Requiere Docker + Python',
  'SearxNG setup needed': 'Configuraci\u00f3n de SearxNG necesaria',
  'Desktop only \u2014 no mobile': 'Solo escritorio \u2014 sin m\u00f3vil',
  'GPL-3.0 license (restrictive)': 'Licencia GPL-3.0 (restrictiva)',

  // AgenticSeek — Honest take
  'Need autonomous web browsing with stealth capabilities':
    'Necesitas navegaci\u00f3n web aut\u00f3noma con capacidades de sigilo',
  'Want local code execution in multiple languages (Python, C, Go, Java)':
    'Quieres ejecuci\u00f3n local de c\u00f3digo en m\u00faltiples lenguajes (Python, C, Go, Java)',
  'Prefer voice-enabled interaction with speech-to-text':
    'Prefieres interacci\u00f3n por voz con conversi\u00f3n de voz a texto',

  // Base44 — TL;DR
  'Cloud-based': 'Basado en la nube',
  'App generation': 'Generaci\u00f3n de apps',

  // Base44 — Feature table
  'Platform-selected': 'Seleccionado por la plataforma',
  'General-Purpose AI': 'IA de prop\u00f3sito general',
  'App building only': 'Solo construcci\u00f3n de apps',
  'Limited free tier': 'Plan gratuito limitado',

  // Base44 — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud infrastructure.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. {alternative} procesa todo en su infraestructura en la nube.',
  'Pay only for your own LLM API usage. No ${price}/month subscription, no feature gates, no surprise bills.':
    'Paga solo por tu propio uso de API LLM. Sin suscripci\u00f3n de ${price}/mes, sin restricciones de funciones, sin facturas sorpresa.',
  'Beyond App Building': 'M\u00e1s all\u00e1 de construir apps',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating apps.':
    'Coordina equipos de agentes especializados para cualquier tarea \u2014 investigaci\u00f3n, redacci\u00f3n, an\u00e1lisis, desarrollo. {alternative} se limita a generar apps.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} selects AI models for you with no choice.':
    'Cambia entre OpenAI, Anthropic, Gemini, Ollama, Mistral y m\u00e1s. {alternative} selecciona los modelos de IA por ti sin opci\u00f3n de elecci\u00f3n.',

  // Base44 — Pricing
  'Paid plans for more features': 'Planes de pago para m\u00e1s funciones',
  'No bring-your-own-key support': 'Sin soporte para traer tu propia clave',

  // Base44 — Honest take
  'Want to generate full-stack apps from natural language prompts':
    'Quieres generar apps full-stack a partir de instrucciones en lenguaje natural',
  'Prefer built-in hosting, auth, and database without setup':
    'Prefieres alojamiento, autenticaci\u00f3n y base de datos integrados sin configuraci\u00f3n',
  'Need one-click publish with custom domains and analytics':
    'Necesitas publicaci\u00f3n con un clic con dominios personalizados y anal\u00edticas',

  // ChatGPT — TL;DR
  'Cloud (OpenAI infra)': 'Nube (infra de OpenAI)',

  // ChatGPT — Feature table
  'Yes, with human review': 'S\u00ed, con revisi\u00f3n humana',
  'Locked to OpenAI': 'Bloqueado en OpenAI',
  'No \u2014 subscription required': 'No \u2014 suscripci\u00f3n requerida',

  // ChatGPT — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. ChatGPT Agent Mode processes everything on OpenAI\u2019s cloud infrastructure.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. ChatGPT Agent Mode procesa todo en la infraestructura en la nube de OpenAI.',
  'Pay only for your own LLM API usage. No $20\u2013$200/month subscription, no feature gates, no usage caps.':
    'Paga solo por tu propio uso de API LLM. Sin suscripci\u00f3n de 20\u2013200 $/mes, sin restricciones de funciones, sin l\u00edmites de uso.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into OpenAI\u2019s models only.':
    'Cambia entre OpenAI, Anthropic, Gemini, Ollama, Mistral y m\u00e1s. {alternative} te encierra solo en los modelos de OpenAI.',

  // ChatGPT — Pricing
  '$20/mo Plus or $200/mo Pro': '20 $/mes Plus o 200 $/mes Pro',
  'Locked to OpenAI models': 'Bloqueado en modelos de OpenAI',
  'No bring-your-own-key option': 'Sin opci\u00f3n de traer tu propia clave',

  // ChatGPT — Honest take
  'Want a polished, all-in-one ChatGPT experience with zero setup':
    'Quieres una experiencia ChatGPT todo en uno y pulida sin configuraci\u00f3n',
  'Need built-in browsing, code interpreter, and file analysis in one tool':
    'Necesitas navegaci\u00f3n, int\u00e9rprete de c\u00f3digo y an\u00e1lisis de archivos integrados en una sola herramienta',

  // DataKit — Hero
  'Full AI agent orchestration that runs in your browser \u2014 not just data analysis, but any task.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 no solo an\u00e1lisis de datos, sino cualquier tarea.',

  // DataKit — TL;DR
  Scope: 'Alcance',
  'Multi-agent platform': 'Plataforma multi-agente',
  'Data analysis tool': 'Herramienta de an\u00e1lisis de datos',
  'LLM Providers': 'Proveedores LLM',
  'Data-focused AI': 'IA enfocada en datos',
  Collaboration: 'Colaboraci\u00f3n',
  'P2P sync & teams': 'Sincronizaci\u00f3n P2P y equipos',
  'Single-user': 'Usuario \u00fanico',

  // DataKit — Feature table
  Likely: 'Probable',
  'Data analysis only': 'Solo an\u00e1lisis de datos',

  // DataKit — Advantages
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused solely on data file analysis.':
    'Coordina equipos de agentes especializados para cualquier tarea \u2014 investigaci\u00f3n, redacci\u00f3n, an\u00e1lisis, desarrollo. {alternative} se centra exclusivamente en el an\u00e1lisis de archivos de datos.',
  'Agent Memory & Knowledge': 'Memoria y conocimiento del agente',
  'Agents learn from conversations and access a full knowledge base. {alternative} has no memory or knowledge management.':
    'Los agentes aprenden de las conversaciones y acceden a una base de conocimiento completa. {alternative} no tiene gesti\u00f3n de memoria ni conocimiento.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} is limited to data-specific AI capabilities.':
    'Cambia entre OpenAI, Anthropic, Gemini, Ollama, Mistral y m\u00e1s. {alternative} est\u00e1 limitado a capacidades de IA espec\u00edficas para datos.',
  'Cross-device sync via Yjs/WebRTC for seamless teamwork. {alternative} is a single-user data analysis tool.':
    'Sincronizaci\u00f3n entre dispositivos v\u00eda Yjs/WebRTC para trabajo en equipo fluido. {alternative} es una herramienta de an\u00e1lisis de datos para un solo usuario.',

  // DataKit — Pricing
  'Free (open source)': 'Gratis (c\u00f3digo abierto)',
  'Data analysis only \u2014 no orchestration':
    'Solo an\u00e1lisis de datos \u2014 sin orquestaci\u00f3n',
  'No multi-agent collaboration': 'Sin colaboraci\u00f3n multi-agente',
  'No agent memory or knowledge base':
    'Sin memoria de agente ni base de conocimiento',
  'No P2P sync or cross-device support':
    'Sin sincronizaci\u00f3n P2P ni soporte entre dispositivos',

  // DataKit — Honest take
  'Need dedicated CSV, JSON, XLS, or Parquet file analysis with AI assistance':
    'Necesitas an\u00e1lisis dedicado de archivos CSV, JSON, XLS o Parquet con asistencia de IA',
  'Want a lightweight, focused tool specifically for local data exploration':
    'Quieres una herramienta ligera y enfocada espec\u00edficamente para exploraci\u00f3n local de datos',
  'Prefer a single-purpose data tool over a full orchestration platform':
    'Prefieres una herramienta de datos de prop\u00f3sito \u00fanico sobre una plataforma de orquestaci\u00f3n completa',

  // Dualite — TL;DR
  'From $29/mo': 'Desde 29 $/mes',
  'App/web builder': 'Constructor de apps/web',

  // Dualite — Feature table
  '5 messages': '5 mensajes',
  'Figma-to-Code': 'Figma a c\u00f3digo',

  // Dualite — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Dualite processes everything on their cloud servers.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. Dualite procesa todo en sus servidores en la nube.',
  'Pay only for your own LLM API usage. No $29\u2013$79/month subscription, no message limits, no surprise bills.':
    'Paga solo por tu propio uso de API LLM. Sin suscripci\u00f3n de 29\u201379 $/mes, sin l\u00edmites de mensajes, sin facturas sorpresa.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-prompt app generation.':
    'Coordina equipos de agentes especializados con resoluci\u00f3n de dependencias y ejecuci\u00f3n paralela. {alternative} se centra en la generaci\u00f3n de apps con un solo prompt.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own models.':
    'Cambia entre OpenAI, Anthropic, Gemini, Ollama, Mistral y m\u00e1s. {alternative} te encierra en sus propios modelos.',

  // Dualite — Pricing
  'Message-based limits': 'L\u00edmites basados en mensajes',
  '5 free messages only': 'Solo 5 mensajes gratuitos',

  // Dualite — Honest take
  'Need Figma-to-code conversion and app templates out of the box':
    'Necesitas conversi\u00f3n de Figma a c\u00f3digo y plantillas de apps listas para usar',
  'Want a visual app builder with authentication and backend included':
    'Quieres un constructor visual de apps con autenticaci\u00f3n y backend incluidos',
  'Prefer prompt-to-app generation over multi-agent orchestration':
    'Prefieres generaci\u00f3n de apps desde prompts sobre orquestaci\u00f3n multi-agente',

  // HugstonOne — Hero
  'Multi-agent orchestration in any browser \u2014 vs a Windows-only local inference app.':
    'Orquestaci\u00f3n multi-agente en cualquier navegador \u2014 vs una app de inferencia local solo para Windows.',

  // HugstonOne — TL;DR
  Platform: 'Plataforma',
  'Any browser, any OS': 'Cualquier navegador, cualquier SO',
  'Windows desktop only': 'Solo escritorio Windows',
  Agents: 'Agentes',
  'Multi-agent orchestration': 'Orquestaci\u00f3n multi-agente',
  'Single-model inference': 'Inferencia de modelo \u00fanico',
  'Proprietary (free)': 'Propietario (gratis)',

  // HugstonOne — Feature table
  'No (proprietary)': 'No (propietario)',
  'Cross-Platform': 'Multiplataforma',
  'Any OS with a browser': 'Cualquier SO con navegador',
  'Windows only': 'Solo Windows',
  'No \u2014 single-model only': 'No \u2014 solo modelo \u00fanico',
  'Cloud LLM Providers': 'Proveedores LLM en la nube',
  'None \u2014 local GGUF only': 'Ninguno \u2014 solo GGUF local',
  'Local Model Support': 'Soporte de modelos locales',
  'Via Ollama': 'V\u00eda Ollama',
  '10,000+ GGUF models': '10.000+ modelos GGUF',
  'Knowledge Base': 'Base de conocimiento',
  'Yes \u2014 fully local': 'S\u00ed \u2014 totalmente local',

  // HugstonOne — Advantages
  'Any Device, Any OS': 'Cualquier dispositivo, cualquier SO',
  'Works on Mac, Linux, Windows, tablets, and phones \u2014 anywhere you have a browser. {alternative} is locked to Windows desktops.':
    'Funciona en Mac, Linux, Windows, tablets y tel\u00e9fonos \u2014 en cualquier lugar donde tengas un navegador. {alternative} est\u00e1 limitado a escritorios Windows.',
  'Orchestrate entire teams of specialized AI agents that collaborate on complex tasks. {alternative} runs a single model at a time.':
    'Orquesta equipos completos de agentes de IA especializados que colaboran en tareas complejas. {alternative} ejecuta un solo modelo a la vez.',
  'Cloud + Local Models': 'Modelos en la nube + locales',
  'Access OpenAI, Anthropic, Gemini, Mistral, and more \u2014 plus local models via Ollama. {alternative} only supports local GGUF inference.':
    'Accede a OpenAI, Anthropic, Gemini, Mistral y m\u00e1s \u2014 adem\u00e1s de modelos locales v\u00eda Ollama. {alternative} solo soporta inferencia GGUF local.',
  'Open Source & Extensible': 'C\u00f3digo abierto y extensible',
  'Fully open-source under the MIT license with a marketplace, plugins, and community contributions. {alternative} is proprietary and closed.':
    'Totalmente de c\u00f3digo abierto bajo licencia MIT con marketplace, plugins y contribuciones de la comunidad. {alternative} es propietario y cerrado.',

  // HugstonOne — Pricing
  'Free (email required)': 'Gratis (requiere email)',
  'Windows only \u2014 no Mac or Linux': 'Solo Windows \u2014 sin Mac ni Linux',
  'No cloud LLM provider support': 'Sin soporte de proveedores LLM en la nube',
  'Proprietary \u2014 not open source':
    'Propietario \u2014 no es c\u00f3digo abierto',

  // HugstonOne — Honest take
  'Want a simple local GGUF inference app on Windows':
    'Quieres una app simple de inferencia GGUF local en Windows',
  'Need GPU-accelerated local model inference with image-to-text':
    'Necesitas inferencia local de modelos acelerada por GPU con imagen a texto',
  'Prefer a desktop app with an integrated code editor and live preview':
    'Prefieres una app de escritorio con editor de c\u00f3digo integrado y vista previa en vivo',

  // LlamaPen — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no download, no Ollama dependency, no limits.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin descarga, sin dependencia de Ollama, sin l\u00edmites.',

  // LlamaPen — TL;DR
  'Browser UI for Ollama': 'Interfaz de navegador para Ollama',

  // LlamaPen — Feature table
  'Provider Support': 'Soporte de proveedores',
  '6+ providers (cloud + local)': '6+ proveedores (nube + local)',
  'Ollama only': 'Solo Ollama',
  'Yes (Ollama web UI)': 'S\u00ed (interfaz web de Ollama)',
  'Yes (PWA)': 'S\u00ed (PWA)',
  'Requires Ollama running': 'Requiere Ollama en ejecuci\u00f3n',
  'Marketplace & Connectors': 'Marketplace y conectores',

  // LlamaPen — Advantages
  'Multi-Provider Freedom': 'Libertad multi-proveedor',
  'Connect to OpenAI, Anthropic, Gemini, Ollama, and more. {alternative} only works with a local Ollama instance.':
    'Con\u00e9ctate a OpenAI, Anthropic, Gemini, Ollama y m\u00e1s. {alternative} solo funciona con una instancia local de Ollama.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface.':
    'Coordina equipos de agentes especializados con resoluci\u00f3n de dependencias y ejecuci\u00f3n paralela. {alternative} es una interfaz de chat \u00fanica.',
  'Agent Memory & Knowledge Base': 'Memoria de agente y base de conocimiento',
  'Persistent memory with human review, plus a full knowledge base for document ingestion. {alternative} has neither.':
    'Memoria persistente con revisi\u00f3n humana, m\u00e1s una base de conocimiento completa para ingesta de documentos. {alternative} no tiene ninguna de las dos.',
  'P2P Sync & Ecosystem': 'Sincronizaci\u00f3n P2P y ecosistema',
  'Cross-device sync via Yjs/WebRTC, marketplace, connectors, and traces. {alternative} offers none of these.':
    'Sincronizaci\u00f3n entre dispositivos v\u00eda Yjs/WebRTC, marketplace, conectores y trazas. {alternative} no ofrece nada de esto.',

  // LlamaPen — Pricing
  'Ollama-only (no cloud providers)':
    'Solo Ollama (sin proveedores en la nube)',
  'No P2P sync or marketplace': 'Sin sincronizaci\u00f3n P2P ni marketplace',

  // LlamaPen — Honest take
  'Only use local Ollama models and want the simplest possible chat UI':
    'Solo usas modelos locales de Ollama y quieres la interfaz de chat m\u00e1s simple posible',
  'Don\u2019t need multi-agent orchestration or agent memory':
    'No necesitas orquestaci\u00f3n multi-agente ni memoria de agente',
  'Want a lightweight, zero-config interface exclusively for Ollama':
    'Quieres una interfaz ligera y sin configuraci\u00f3n exclusivamente para Ollama',

  // MiniMax — TL;DR
  'Cloud (MiniMax infra)': 'Nube (infra de MiniMax)',
  'Free tier + credits': 'Plan gratuito + cr\u00e9ditos',
  'Expert collection': 'Colecci\u00f3n de expertos',

  // MiniMax — Feature table
  'Credit-based': 'Basado en cr\u00e9ditos',

  // MiniMax — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. MiniMax Agent processes everything on their cloud infrastructure.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. MiniMax Agent procesa todo en su infraestructura en la nube.',
  'Pay only for your own LLM API usage. No credit system, no usage caps, no surprise bills.':
    'Paga solo por tu propio uso de API LLM. Sin sistema de cr\u00e9ditos, sin l\u00edmites de uso, sin facturas sorpresa.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} offers an expert collection but lacks true multi-agent orchestration.':
    'Coordina equipos de agentes especializados con resoluci\u00f3n de dependencias y ejecuci\u00f3n paralela. {alternative} ofrece una colecci\u00f3n de expertos pero carece de verdadera orquestaci\u00f3n multi-agente.',

  // MiniMax — Pricing
  'Free + credits': 'Gratis + cr\u00e9ditos',
  'Credit-based usage system': 'Sistema de uso basado en cr\u00e9ditos',
  'No bring-your-own-key': 'Sin opci\u00f3n de traer tu propia clave',

  // MiniMax — Honest take
  'Want ready-made chatbot deployment to Telegram, Discord, or Slack':
    'Quieres despliegue de chatbot listo para Telegram, Discord o Slack',
  'Need built-in PPT creation and website building tools':
    'Necesitas herramientas integradas de creaci\u00f3n de PPT y construcci\u00f3n de sitios web',
  'Prefer a zero-config SaaS with scheduled task execution':
    'Prefieres un SaaS sin configuraci\u00f3n con ejecuci\u00f3n programada de tareas',

  // NextDocs — TL;DR
  'From $18/mo': 'Desde 18 $/mes',
  'Document generation': 'Generaci\u00f3n de documentos',

  // NextDocs — Feature table
  'Platform-locked': 'Bloqueado en la plataforma',
  'Docs & slides only': 'Solo documentos y diapositivas',
  'Unlimited Usage': 'Uso ilimitado',
  'Credit-based limits': 'L\u00edmites basados en cr\u00e9ditos',

  // NextDocs — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud servers.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. {alternative} procesa todo en sus servidores en la nube.',
  'Pay only for your own LLM API usage. No $18\u2013$90/month subscription, no credit limits, no feature gates.':
    'Paga solo por tu propio uso de API LLM. Sin suscripci\u00f3n de 18\u201390 $/mes, sin l\u00edmites de cr\u00e9ditos, sin restricciones de funciones.',
  'Beyond Document Generation': 'M\u00e1s all\u00e1 de generar documentos',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating documents and slides.':
    'Coordina equipos de agentes especializados para cualquier tarea \u2014 investigaci\u00f3n, redacci\u00f3n, an\u00e1lisis, desarrollo. {alternative} se limita a generar documentos y diapositivas.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their platform with no BYOK option.':
    'Cambia entre OpenAI, Anthropic, Gemini, Ollama, Mistral y m\u00e1s. {alternative} te encierra en su plataforma sin opci\u00f3n BYOK.',

  // NextDocs — Pricing
  'Free tier limited to 500 credits':
    'Plan gratuito limitado a 500 cr\u00e9ditos',
  'Pro plans from $18 to $90/month': 'Planes Pro desde 18 hasta 90 $/mes',

  // NextDocs — Honest take
  'Need polished document and slide generation from prompts':
    'Necesitas generaci\u00f3n pulida de documentos y diapositivas a partir de prompts',
  'Want multi-variant output with brand kit consistency':
    'Quieres salida multivariante con consistencia de kit de marca',
  'Prefer built-in export to PDF, Google Slides, and PowerPoint':
    'Prefieres exportaci\u00f3n integrada a PDF, Google Slides y PowerPoint',

  // Replit — TL;DR
  'Cloud (Replit infra)': 'Nube (infra de Replit)',
  'Single agent (app builder)': 'Agente \u00fanico (constructor de apps)',

  // Replit — Feature table
  'Limited daily credits': 'Cr\u00e9ditos diarios limitados',

  // Replit — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Replit Agent processes everything on their cloud infrastructure.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. Replit Agent procesa todo en su infraestructura en la nube.',
  'Pay only for your own LLM API usage. No $17\u2013$100/month subscription, no credit limits, no surprise bills.':
    'Paga solo por tu propio uso de API LLM. Sin suscripci\u00f3n de 17\u2013100 $/mes, sin l\u00edmites de cr\u00e9ditos, sin facturas sorpresa.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-agent app building.':
    'Coordina equipos de agentes especializados con resoluci\u00f3n de dependencias y ejecuci\u00f3n paralela. {alternative} se centra en la construcci\u00f3n de apps con un solo agente.',

  // Replit — Pricing
  'Credit-based usage ($20\u2013$100)':
    'Uso basado en cr\u00e9ditos (20\u2013100 $)',
  'Paid tiers for more builds': 'Planes de pago para m\u00e1s compilaciones',

  // Replit — Honest take
  'Need one-click deployment and built-in hosting for apps':
    'Necesitas despliegue con un clic y alojamiento integrado para apps',
  'Want an all-in-one IDE with instant infrastructure setup':
    'Quieres un IDE todo en uno con configuraci\u00f3n de infraestructura instant\u00e1nea',
  'Prefer a managed platform for full-stack app generation':
    'Prefieres una plataforma gestionada para generaci\u00f3n de apps full-stack',

  // Roma — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Python, no Docker, no setup.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin Python, sin Docker, sin configuraci\u00f3n.',

  // Roma — TL;DR
  'Python + Docker setup': 'Configuraci\u00f3n Python + Docker',
  'Code-first / API-first': 'C\u00f3digo primero / API primero',
  'Python + DSPy framework': 'Framework Python + DSPy',

  // Roma — Feature table
  'Recursive pipeline': 'Pipeline recursivo',
  'OpenRouter + major providers': 'OpenRouter + proveedores principales',

  // Roma — Advantages
  'No Python, no Docker, no DSPy \u2014 just open your browser. {alternative} requires a full Python environment with Docker.':
    'Sin Python, sin Docker, sin DSPy \u2014 solo abre tu navegador. {alternative} requiere un entorno Python completo con Docker.',
  'Full graphical UI with agent visualization and real-time workflow tracking. {alternative} is a code-first framework with a REST API.':
    'Interfaz gr\u00e1fica completa con visualizaci\u00f3n de agentes y seguimiento de flujo en tiempo real. {alternative} es un framework orientado al c\u00f3digo con API REST.',
  'Persistent memory system and knowledge base with human review. {alternative} focuses on execution pipelines without built-in memory.':
    'Sistema de memoria persistente y base de conocimiento con revisi\u00f3n humana. {alternative} se centra en pipelines de ejecuci\u00f3n sin memoria integrada.',
  'Works on any device including mobile \u2014 no install, no server infrastructure. Everything runs client-side as a PWA.':
    'Funciona en cualquier dispositivo incluyendo m\u00f3vil \u2014 sin instalaci\u00f3n, sin infraestructura de servidor. Todo se ejecuta en el cliente como PWA.',

  // Roma — Pricing
  'Requires Python + Docker': 'Requiere Python + Docker',
  'No visual UI \u2014 code-first only':
    'Sin interfaz visual \u2014 solo c\u00f3digo primero',
  'Server infrastructure needed': 'Infraestructura de servidor necesaria',
  'No built-in knowledge base': 'Sin base de conocimiento integrada',

  // Roma — Honest take
  'Need recursive task decomposition with DSPy-based prediction strategies':
    'Necesitas descomposici\u00f3n recursiva de tareas con estrategias de predicci\u00f3n basadas en DSPy',
  'Want a programmable pipeline with Atomizer, Planner, Executor, and Verifier stages':
    'Quieres un pipeline programable con etapas Atomizer, Planner, Executor y Verifier',
  'Prefer MLflow observability and E2B sandboxed code execution':
    'Prefieres observabilidad MLflow y ejecuci\u00f3n de c\u00f3digo en sandbox E2B',

  // RunnerH — TL;DR
  'Cloud-based processing': 'Procesamiento basado en la nube',
  'Enterprise (contact sales)': 'Empresa (contactar ventas)',
  'Computer-use agent': 'Agente de uso de ordenador',

  // RunnerH — Feature table
  Partially: 'Parcialmente',
  'Cloud API/demo': 'API/demo en la nube',
  'Sub-agent architecture': 'Arquitectura de sub-agentes',
  'Proprietary Holo models': 'Modelos Holo propietarios',
  'Cross-Platform Automation': 'Automatizaci\u00f3n multiplataforma',
  'Browser-based': 'Basado en navegador',
  'Desktop, web & mobile': 'Escritorio, web y m\u00f3vil',
  'None (enterprise only)': 'Ninguno (solo empresas)',

  // RunnerH — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Runner H processes everything on H Company\u2019s cloud infrastructure.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. Runner H procesa todo en la infraestructura en la nube de H Company.',
  'Pay only for your own LLM API usage. Runner H runs are \u201cextremely costly\u201d and require enterprise contracts.':
    'Paga solo por tu propio uso de API LLM. Las ejecuciones de Runner H son \u201cextremadamente costosas\u201d y requieren contratos empresariales.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-task computer-use automation.':
    'Coordina equipos de agentes especializados con resoluci\u00f3n de dependencias y ejecuci\u00f3n paralela. {alternative} se centra en la automatizaci\u00f3n de uso de ordenador para tareas individuales.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into proprietary Holo models.':
    'Cambia entre OpenAI, Anthropic, Gemini, Ollama, Mistral y m\u00e1s. {alternative} te encierra en los modelos propietarios Holo.',

  // RunnerH — Pricing
  'Extremely costly per run': 'Extremadamente costoso por ejecuci\u00f3n',
  'No self-serve pricing': 'Sin precios de autoservicio',
  'Locked to proprietary models': 'Bloqueado en modelos propietarios',

  // RunnerH — Honest take
  'Need SOTA computer-use automation across desktop, web, and mobile':
    'Necesitas automatizaci\u00f3n de uso de ordenador SOTA en escritorio, web y m\u00f3vil',
  'Require cross-platform GUI interaction with visual grounding':
    'Requieres interacci\u00f3n GUI multiplataforma con fundamentaci\u00f3n visual',
  'Have an enterprise budget and need benchmark-leading task completion':
    'Tienes un presupuesto empresarial y necesitas completar tareas l\u00edder en benchmarks',

  // Trace — TL;DR
  'Not listed (beta)': 'No listado (beta)',
  'Closed-source': 'C\u00f3digo cerrado',

  // Trace — Feature table
  'Workflow-based': 'Basado en flujos de trabajo',
  Unknown: 'Desconocido',
  Availability: 'Disponibilidad',
  'Available now': 'Disponible ahora',
  'Beta / waitlist': 'Beta / lista de espera',
  'Not publicly listed': 'No listado p\u00fablicamente',

  // Trace — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Trace processes everything on their cloud infrastructure.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. Trace procesa todo en su infraestructura en la nube.',
  'Available & Free': 'Disponible y gratuito',
  'Use {productName} today at no cost \u2014 no waitlist, no beta access required. Trace is still in closed beta with undisclosed pricing.':
    'Usa {productName} hoy sin coste \u2014 sin lista de espera, sin acceso beta requerido. Trace a\u00fan est\u00e1 en beta cerrada con precios no revelados.',
  'Open Source & Transparent': 'C\u00f3digo abierto y transparente',
  'Fully open-source under MIT license \u2014 inspect, modify, and self-host. Trace is closed-source with no public codebase.':
    'Totalmente de c\u00f3digo abierto bajo licencia MIT \u2014 inspecciona, modifica y autoaloja. Trace es de c\u00f3digo cerrado sin repositorio p\u00fablico.',
  'Works Offline': 'Funciona sin conexi\u00f3n',
  'Run entirely in your browser without internet after initial load. Trace\u2019s cloud-based architecture requires a constant connection.':
    'Ejecuta todo en tu navegador sin internet tras la carga inicial. La arquitectura basada en la nube de Trace requiere una conexi\u00f3n constante.',

  // Trace — Pricing
  'Closed beta / waitlist only': 'Solo beta cerrada / lista de espera',
  'Pricing not publicly available': 'Precios no disponibles p\u00fablicamente',
  'BYOK status unknown': 'Estado BYOK desconocido',

  // Trace — Honest take
  'Need a knowledge-graph context engine for enterprise workflows':
    'Necesitas un motor de contexto basado en grafos de conocimiento para flujos empresariales',
  'Want built-in SLA monitoring and department-level coordination':
    'Quieres monitorizaci\u00f3n de SLA integrada y coordinaci\u00f3n a nivel de departamento',
  'Require deep Slack, Notion, Jira, and Google Drive integrations out of the box':
    'Requieres integraciones profundas con Slack, Notion, Jira y Google Drive listas para usar',

  // V7Go — Feature table
  'Document processing': 'Procesamiento de documentos',
  'Document processing only': 'Solo procesamiento de documentos',
  'No free tier': 'Sin plan gratuito',

  // V7Go — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes all documents on their cloud infrastructure.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. {alternative} procesa todos los documentos en su infraestructura en la nube.',
  'Pay only for your own LLM API usage. No enterprise contracts, no per-page pricing, no sales calls required.':
    'Paga solo por tu propio uso de API LLM. Sin contratos empresariales, sin precios por p\u00e1gina, sin llamadas de ventas requeridas.',
  'Beyond Document Processing':
    'M\u00e1s all\u00e1 del procesamiento de documentos',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused on document understanding and data extraction.':
    'Coordina equipos de agentes especializados para cualquier tarea \u2014 investigaci\u00f3n, redacci\u00f3n, an\u00e1lisis, desarrollo. {alternative} se centra en la comprensi\u00f3n de documentos y extracci\u00f3n de datos.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} uses their own platform-selected models with no choice.':
    'Cambia entre OpenAI, Anthropic, Gemini, Ollama, Mistral y m\u00e1s. {alternative} usa sus propios modelos seleccionados por la plataforma sin opci\u00f3n de elecci\u00f3n.',

  // V7Go — Pricing
  'No free tier available': 'Sin plan gratuito disponible',
  'Enterprise-only pricing': 'Precios solo para empresas',
  'Cloud-only document processing':
    'Procesamiento de documentos solo en la nube',

  // V7Go — Honest take
  'Need specialized document understanding and data extraction at enterprise scale':
    'Necesitas comprensi\u00f3n especializada de documentos y extracci\u00f3n de datos a escala empresarial',
  'Want automated workflows for processing PDFs, images, and structured documents':
    'Quieres flujos automatizados para procesar PDF, im\u00e1genes y documentos estructurados',
  'Require enterprise integrations and dedicated support for document automation':
    'Requieres integraciones empresariales y soporte dedicado para automatizaci\u00f3n de documentos',

  // Open WebUI
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no server to maintain.':
    'Orquestaci\u00f3n completa de agentes IA en tu navegador \u2014 sin Docker, sin Python, sin servidor que mantener.',
  'Docker + Python stack': 'Stack Docker + Python',
  'Self-hosted server required': 'Servidor auto-alojado requerido',
  'Open WebUI License': 'Licencia Open WebUI',
  'No (server required)': 'No (servidor requerido)',
  Experimental: 'Experimental',
  'OpenAI-compatible APIs + Ollama': 'APIs compatibles con OpenAI + Ollama',
  'Unlimited (self-hosted)': 'Ilimitado (auto-alojado)',
  'True Zero Infrastructure': 'Cero Infraestructura',
  'Open your browser and start working \u2014 no Docker, no Python, no database, no server to maintain. {alternative} requires Docker, Python, and a database backend to self-host.':
    'Abre tu navegador y comienza a trabajar \u2014 sin Docker, sin Python, sin base de datos, sin servidor que mantener. {alternative} requiere Docker, Python y una base de datos para auto-alojarse.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface without multi-agent orchestration.':
    'Coordina equipos de agentes especializados con resoluci\u00f3n de dependencias y ejecuci\u00f3n paralela. {alternative} es una interfaz de chat \u00fanico sin orquestaci\u00f3n multi-agente.',
  'Serverless Privacy': 'Privacidad sin Servidor',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one. {alternative} requires a running server that stores your data.':
    'Todos los datos permanecen en tu navegador \u2014 IndexedDB, tokens cifrados, cero telemetr\u00eda. Sin servidor alguno, ni siquiera auto-alojado. {alternative} requiere un servidor en ejecuci\u00f3n que almacena tus datos.',
  'Cross-device synchronization via Yjs/WebRTC with no central server. {alternative} requires Redis and a database for multi-user support.':
    'Sincronizaci\u00f3n entre dispositivos v\u00eda Yjs/WebRTC sin servidor central. {alternative} requiere Redis y una base de datos para soporte multi-usuario.',
  'Requires Docker + Python infrastructure':
    'Requiere infraestructura Docker + Python',
  'Enterprise plans for advanced features':
    'Planes empresariales para funciones avanzadas',
  'Need advanced RAG with vector database options (ChromaDB, PGVector, Qdrant)':
    'Necesitas RAG avanzado con opciones de bases de datos vectoriales (ChromaDB, PGVector, Qdrant)',
  'Want enterprise features like RBAC, LDAP, SSO, and horizontal scaling':
    'Quieres funciones empresariales como RBAC, LDAP, SSO y escalado horizontal',
  'Need image generation, voice/video calls, and a Pipelines plugin framework':
    'Necesitas generaci\u00f3n de im\u00e1genes, llamadas de voz/video y un framework de plugins Pipelines',
}
