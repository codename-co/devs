import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Hero
  Comparison: 'Comparison',
  '{productName} vs {alternative}': '{productName} مقابل {alternative}',
  'Full AI agent orchestration that runs in your browser — no cloud, no credits, no limits.':
    'تنسيق كامل لوكلاء الذكاء الاصطناعي يعمل في متصفحك — بدون سحابة، بدون أرصدة، بدون حدود.',
  'Try {productName} Free →': 'جرّب {productName} مجانًا →',
  'View on GitHub': 'عرض على GitHub',
  // TL;DR
  Privacy: 'Privacy',
  '100% client-side': '100% من جانب العميل',
  'Cloud (Meta infra)': 'سحابة (بنية Meta التحتية)',
  Pricing: 'Pricing',
  'Free forever': 'مجاني للأبد',
  'From $39/mo': 'من 39 $/شهر',
  Orchestration: 'Orchestration',
  'Multi-agent teams': 'فرق متعددة الوكلاء',
  'Single agent': 'وكيل واحد',
  // Feature table
  'Feature Comparison': 'مقارنة الميزات',
  'Head-to-Head Comparison': 'مقارنة مباشرة',
  Feature: 'Feature',
  // Feature names + devs + alt
  'Open Source': 'مفتوح المصدر',
  'MIT License': 'رخصة MIT',
  No: 'No',
  'Browser-Native': 'أصلي في المتصفح',
  Yes: 'Yes',
  'Web app (cloud)': 'تطبيق ويب (سحابة)',
  'Data Stays Local': 'البيانات تبقى محلية',
  'Multi-Agent Orchestration': 'تنسيق متعدد الوكلاء',
  Advanced: 'Advanced',
  'Bring Your Own Keys': 'أحضر مفاتيحك الخاصة',
  'Offline Capable': 'يعمل بدون اتصال',
  'P2P Sync': 'مزامنة نظير لنظير',
  'Agent Memory': 'ذاكرة الوكيل',
  'Projects only': 'المشاريع فقط',
  'LLM Provider Choice': 'اختيار مزود LLM',
  '6+ providers': '6+ مزودين',
  'Locked to {alternative}': 'مقيد بـ {alternative}',
  'Free Tier': 'الخطة المجانية',
  Unlimited: 'Unlimited',
  '4,000 credits/mo': '4,000 رصيد/شهر',
  // Advantages
  'Why {productName}': 'لماذا {productName}',
  'Why Teams Choose {productName} over {alternative}':
    'لماذا تختار الفرق {productName} بدلاً من {alternative}',
  'True Privacy': 'خصوصية حقيقية',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Manus processes everything on Meta\u2019s cloud infrastructure.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Manus processes everything on Meta\u2019s cloud infrastructure.',
  'Zero Platform Cost': 'بدون تكلفة منصة',
  'Pay only for your own LLM API usage. No $39/month subscription, no credit limits, no surprise bills.':
    'ادفع فقط مقابل استخدامك الخاص لواجهة LLM API. بدون اشتراك 39 $/شهر، بدون حدود أرصدة، بدون فواتير مفاجئة.',
  'Multi-Agent Teams': 'فرق متعددة الوكلاء',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} runs a single agent per task.':
    'نسّق فرق وكلاء متخصصة مع حل التبعيات والتنفيذ المتوازي. يشغّل {alternative} وكيلاً واحداً لكل مهمة.',
  'Provider Freedom': 'حرية اختيار المزود',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own infrastructure.':
    'انتقل بين OpenAI وAnthropic وGemini وOllama وMistral والمزيد. يقيدك {alternative} ببنيته التحتية الخاصة.',
  // Pricing
  'Stop Paying for the Platform': 'توقف عن الدفع مقابل المنصة',
  '{productName}': '{productName}',
  '$0/mo': '0 $/شهر',
  'Unlimited agents': 'وكلاء غير محدودين',
  'All features included': 'جميع الميزات مضمّنة',
  'Full data privacy': 'خصوصية بيانات كاملة',
  'BYOK \u2014 any LLM provider': 'BYOK \u2014 any LLM provider',
  'Credit-based usage': 'استخدام قائم على الأرصدة',
  'Paid tiers for more': 'خطط مدفوعة للمزيد',
  'Cloud-only processing': 'معالجة سحابية فقط',
  'Locked to {alternative} infra': 'مقيد ببنية {alternative} التحتية',
  // Honest take
  'Honest Take': 'رأي صريح',
  'Who Should Choose What': 'من يجب أن يختار ماذا',
  'Choose {productName} if you\u2026': 'Choose {productName} if you\u2026',
  'Care about data privacy and sovereignty': 'تهتم بخصوصية البيانات وسيادتها',
  'Want full control over LLM providers and costs':
    'تريد تحكمًا كاملاً بمزودي LLM والتكاليف',
  'Need multi-agent orchestration with team coordination':
    'تحتاج تنسيق وكلاء متعددين مع تنسيق الفريق',
  'Prefer open-source, self-hosted solutions':
    'تفضل الحلول مفتوحة المصدر والمستضافة ذاتيًا',
  'Want to work offline or in air-gapped environments':
    'تريد العمل بدون اتصال أو في بيئات معزولة',
  'Consider {alternative} if you\u2026': 'Consider {alternative} if you\u2026',
  'Want a polished, zero-config SaaS experience out of the box':
    'تريد تجربة SaaS جاهزة ومصقولة بدون إعداد',
  'Prefer not to manage your own LLM API keys':
    'تفضل عدم إدارة مفاتيح LLM API الخاصة بك',
  'Need built-in Slack integration and scheduled tasks':
    'تحتاج تكامل Slack مدمج ومهام مجدولة',
  // OpenManus — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Python, no server, no setup.':
    'Full AI agent orchestration that runs in your browser \u2014 no Python, no server, no setup.',
  // OpenManus — TL;DR
  Setup: 'Setup',
  'Zero install (browser)': 'بدون تثبيت (متصفح)',
  'Python environment': 'بيئة Python',
  Architecture: 'Architecture',
  'Browser-native PWA': 'PWA أصلي للمتصفح',
  'Python framework': 'إطار عمل Python',
  UX: 'UX',
  'Visual UI': 'واجهة مرئية',
  'Command-line / code-first': 'سطر الأوامر / الكود أولاً',
  // OpenManus — Feature table
  'No (Python)': 'لا (Python)',
  'Yes (self-hosted)': 'نعم (مستضاف ذاتياً)',
  'Basic flows': 'تدفقات أساسية',
  'No (needs API)': 'لا (يحتاج API)',
  'OpenAI-compatible': 'متوافق مع OpenAI',
  // OpenManus — Advantages
  'Zero Setup': 'بدون إعداد',
  'No Python, no dependencies, no virtual environments \u2014 just open a browser and start orchestrating agents instantly.':
    'No Python, no dependencies, no virtual environments \u2014 just open a browser and start orchestrating agents instantly.',
  'Visual Experience': 'تجربة مرئية',
  'Full graphical UI with agent visualization, real-time workflow tracking, and drag-and-drop. {alternative} is a code-first, command-line tool.':
    'واجهة رسومية كاملة مع عرض الوكلاء، وتتبع سير العمل في الوقت الفعلي، والسحب والإفلات. {alternative} هو أداة سطر أوامر موجهة للكود.',
  'Agent Memory & Learning': 'ذاكرة وتعلم الوكيل',
  'Agents remember context across conversations with a persistent memory system and human review. {alternative} has no built-in memory layer.':
    'يتذكر الوكلاء السياق عبر المحادثات بنظام ذاكرة دائم ومراجعة بشرية. {alternative} لا يحتوي على طبقة ذاكرة مدمجة.',
  'Works on any device including mobile \u2014 no install, no server, no Python runtime. Everything runs client-side as a PWA.':
    'Works on any device including mobile \u2014 no install, no server, no Python runtime. Everything runs client-side as a PWA.',
  // OpenManus — Pricing
  'Free (self-hosted)': 'مجاني (مستضاف ذاتياً)',
  'Requires Python environment': 'يتطلب بيئة Python',
  'No managed hosting': 'بدون استضافة مدارة',
  'Setup & maintenance required': 'يتطلب إعداد وصيانة',
  'CLI-first interface': 'واجهة سطر أوامر',
  // OpenManus — Honest take
  'Need Python-based extensibility and custom agent code':
    'تحتاج قابلية توسيع بـ Python وكود وكيل مخصص',
  'Prefer a code-first approach over visual UI':
    'تفضل نهج الكود أولاً على الواجهة المرئية',
  'Want A2A protocol support': 'تريد دعم بروتوكول A2A',
  // DeepChat — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no download, no Electron, no limits.':
    'Full AI agent orchestration that runs in your browser \u2014 no download, no Electron, no limits.',
  // DeepChat — TL;DR
  'Electron app download': 'تنزيل تطبيق Electron',
  'Single chat interface': 'واجهة دردشة واحدة',
  'Desktop app (Electron)': 'تطبيق سطح مكتب (Electron)',
  // DeepChat — Feature table
  'Apache 2.0': 'Apache 2.0',
  'No (Electron desktop)': 'لا (سطح مكتب Electron)',
  'No (single chat)': 'لا (دردشة واحدة)',
  'Yes (30+ providers)': 'نعم (30+ مزود)',
  'Yes (with Ollama)': 'نعم (مع Ollama)',
  '30+ providers': '30+ مزود',
  // DeepChat — Advantages
  'Zero Install': 'بدون تثبيت',
  'No download, no Electron app. Just open your browser on any device. {alternative} requires a desktop application download.':
    'بدون تنزيل، بدون تطبيق Electron. فقط افتح متصفحك على أي جهاز. {alternative} يتطلب تنزيل تطبيق سطح مكتب.',
  'Coordinate specialized agent teams with dependency resolution. {alternative} is a single-chat interface without orchestration.':
    'نسق فرق وكلاء متخصصين مع حل التبعيات. {alternative} هو واجهة دردشة واحدة بدون تنسيق.',
  'Persistent agent memory with human review, categories, confidence levels. {alternative} has no memory system.':
    'ذاكرة وكيل دائمة مع مراجعة بشرية، فئات، مستويات ثقة. {alternative} ليس لديه نظام ذاكرة.',
  'Cross-device synchronization via Yjs/WebRTC. {alternative} is limited to one device.':
    'مزامنة عبر الأجهزة عبر Yjs/WebRTC. {alternative} مقتصر على جهاز واحد.',
  // DeepChat — Pricing
  Free: 'Free',
  'Desktop-only (Electron)': 'سطح مكتب فقط (Electron)',
  'No multi-agent orchestration': 'بدون تنسيق متعدد الوكلاء',
  'No P2P sync or collaboration': 'بدون مزامنة P2P أو تعاون',
  'No agent memory system': 'بدون نظام ذاكرة وكيل',
  // DeepChat — Honest take
  'Prefer a native desktop app experience with multi-window UI':
    'تفضل تجربة تطبيق سطح مكتب أصلي مع واجهة متعددة النوافذ',
  'Need MCP tool calling and ACP agent protocol support':
    'تحتاج استدعاء أدوات MCP ودعم بروتوكول وكيل ACP',
  'Want built-in search enhancement (Brave, Google, Bing)':
    'تريد تحسين بحث مدمج (Brave، Google، Bing)',
  // Kortix — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no database, no infrastructure.':
    'Full AI agent orchestration that runs in your browser \u2014 no Docker, no database, no infrastructure.',
  // Kortix — TL;DR
  'Self-hosted (Docker + Supabase)': 'Self-hosted (Docker + Supabase)',
  'Docker + Supabase stack': 'Docker + Supabase stack',
  'Server-based (Python/FastAPI)': 'Server-based (Python/FastAPI)',
  // Kortix — Feature table
  'Yes (custom license)': 'Yes (custom license)',
  'No (Next.js dashboard)': 'No (Next.js dashboard)',
  'Self-hosted Supabase': 'Self-hosted Supabase',
  'Single agent runtimes': 'Single agent runtimes',
  'Yes (via LiteLLM)': 'Yes (via LiteLLM)',
  Limited: 'Limited',
  'Multiple (via LiteLLM)': 'Multiple (via LiteLLM)',
  'Zero Infrastructure': 'Zero Infrastructure',
  'Requires Docker + Supabase': 'Requires Docker + Supabase',
  // Kortix — Advantages
  'Open your browser and start working \u2014 no Docker, no Supabase, no FastAPI server. {alternative} requires a full infrastructure stack to self-host.':
    'Open your browser and start working \u2014 no Docker, no Supabase, no FastAPI server. {alternative} requires a full infrastructure stack to self-host.',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one.',
  'Works on any device with a browser \u2014 desktop, tablet, or mobile. No server requirements, no Docker containers, fully offline capable.':
    'Works on any device with a browser \u2014 desktop, tablet, or mobile. No server requirements, no Docker containers, fully offline capable.',
  'No Infrastructure': 'No Infrastructure',
  'No Docker containers, no PostgreSQL database, no Python backend to maintain. {alternative} needs ongoing server management and updates.':
    'No Docker containers, no PostgreSQL database, no Python backend to maintain. {alternative} needs ongoing server management and updates.',
  // Kortix — Pricing
  'Requires server hosting costs': 'Requires server hosting costs',
  'Docker + Supabase infrastructure': 'Docker + Supabase infrastructure',
  'Ongoing maintenance overhead': 'Ongoing maintenance overhead',
  'Server administration required': 'Server administration required',
  // Kortix — Honest take
  'Need Docker-sandboxed code execution for agent runtimes':
    'Need Docker-sandboxed code execution for agent runtimes',
  'Want server-side agent runtimes with persistent processes':
    'Want server-side agent runtimes with persistent processes',
  'Need built-in browser automation via Playwright':
    'Need built-in browser automation via Playwright',
  // CTA
  'Ready to Take Control of Your AI Workflow?':
    'مستعد للتحكم في سير عمل الذكاء الاصطناعي الخاص بك؟',
  'Start using {productName} for free \u2014 no account needed, no credit card, no server to set up.':
    'Start using {productName} for free \u2014 no account needed, no credit card, no server to set up.',
  'Get Started \u2192': 'Get Started \u2192',
  'View Source on GitHub': 'عرض الكود المصدري على GitHub',
  // Lemon AI — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Node.js, no limits.':
    'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Node.js, no limits.',
  // Lemon AI — TL;DR
  'Docker + Node.js': 'Docker + Node.js',
  'Desktop app (Vue + Node.js)': 'تطبيق سطح المكتب (Vue + Node.js)',
  // Lemon AI — Feature table
  'No (desktop app)': 'لا (تطبيق سطح المكتب)',
  'Yes (Docker sandbox)': 'نعم (صندوق رمل Docker)',
  'Partial (local LLM only)': 'جزئي (LLM محلي فقط)',
  'Self-evolving': 'ذاتي التطور',
  'Free + subscription': 'مجاني + اشتراك',
  // Lemon AI — Advantages
  'No Docker or Node.js needed, just open your browser. {alternative} requires a local Docker environment and Node.js backend to run.':
    'لا حاجة لـ Docker أو Node.js، فقط افتح متصفحك. {alternative} يتطلب بيئة Docker محلية وخلفية Node.js.',
  'Full team orchestration with dependency resolution, not just single agent. {alternative} runs one agent at a time.':
    'تنسيق فريق كامل مع حل التبعيات، ليس مجرد وكيل واحد. {alternative} يشغل وكيلًا واحدًا في كل مرة.',
  'Works on any device, no installation, progressive web app. {alternative} is a desktop application built with Vue + Node.js.':
    'يعمل على أي جهاز، بدون تثبيت، تطبيق ويب تقدمي. {alternative} هو تطبيق سطح مكتب مبني بـ Vue + Node.js.',
  'P2P Collaboration': 'تعاون P2P',
  'Cross-device sync via WebRTC, real-time collaboration. {alternative} has no built-in sync or collaboration features.':
    'مزامنة عبر الأجهزة عبر WebRTC، تعاون في الوقت الفعلي. {alternative} لا يحتوي على ميزات مزامنة أو تعاون مدمجة.',
  // Lemon AI — Pricing
  'Free + paid tiers': 'مجاني + مستويات مدفوعة',
  'Online subscription available': 'اشتراك عبر الإنترنت متاح',
  'Requires Docker for sandbox': 'يتطلب Docker للصندوق الرملي',
  'Node.js backend required': 'خلفية Node.js مطلوبة',
  'Single agent architecture': 'هندسة وكيل واحد',
  // Lemon AI — Honest take
  'Need Docker VM sandbox for safe code execution':
    'تحتاج صندوق رمل Docker VM لتنفيذ الكود بأمان',
  'Want built-in deep search and vibe coding':
    'تريد بحثًا عميقًا مدمجًا و vibe coding',
  'Prefer a self-evolving memory system': 'تفضل نظام ذاكرة ذاتي التطور',
  // HappyCapy — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no cloud sandbox, no credits, no limits.':
    'Full AI agent orchestration that runs in your browser \u2014 no cloud sandbox, no credits, no limits.',
  // HappyCapy — TL;DR
  'Cloud sandbox': 'Cloud sandbox',
  'From ${price}/mo': 'From ${price}/mo',
  'Closed source': 'Closed source',
  // HappyCapy — Feature table
  'No (cloud infra)': 'No (cloud infra)',
  'Agent teams (preview)': 'Agent teams (preview)',
  'Via skills': 'Via skills',
  '{alternative} models': '{alternative} models',
  'Limited credits': 'Limited credits',
  // HappyCapy — Advantages
  'All processing stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} runs everything on a cloud sandbox.':
    'All processing stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} runs everything on a cloud sandbox.',
  'No subscription, no credits. {alternative} starts at $17/mo and goes up to $200/mo for full features.':
    'No subscription, no credits. {alternative} starts at $17/mo and goes up to $200/mo for full features.',
  'Full MIT-licensed codebase \u2014 inspect, modify, self-host. {alternative} is closed source.':
    'Full MIT-licensed codebase \u2014 inspect, modify, self-host. {alternative} is closed source.',
  'Use any LLM provider \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their model access.':
    'Use any LLM provider \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their model access.',
  // HappyCapy — Pricing
  'Closed-source platform': 'Closed-source platform',
  'Locked to {alternative} models': 'Locked to {alternative} models',
  // HappyCapy — Honest take
  'Want a managed cloud sandbox environment':
    'Want a managed cloud sandbox environment',
  'Need built-in email integration and scheduling':
    'Need built-in email integration and scheduling',
  'Prefer access to 150+ models without managing API keys':
    'Prefer access to 150+ models without managing API keys',
  // AgenticSeek — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no setup.':
    'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no setup.',
  // AgenticSeek — TL;DR
  'Docker + Python setup': 'Docker + Python setup',
  'Single agent routing': 'Single agent routing',
  'Desktop (Python + Docker)': 'Desktop (Python + Docker)',
  // AgenticSeek — Feature table
  'GPL-3.0': 'GPL-3.0',
  'No (Python + Docker)': 'No (Python + Docker)',
  'Smart routing': 'Smart routing',
  'Yes (local LLM)': 'Yes (local LLM)',
  'Session recovery': 'Session recovery',
  '8+ providers': '8+ providers',
  // AgenticSeek — Advantages
  'No Python, no Docker, no SearxNG \u2014 just open your browser. {alternative} requires a full Docker + Python environment.':
    'No Python, no Docker, no SearxNG \u2014 just open your browser. {alternative} requires a full Docker + Python environment.',
  'Full team orchestration with dependency resolution and parallel execution. {alternative} uses smart routing to a single agent.':
    'Full team orchestration with dependency resolution and parallel execution. {alternative} uses smart routing to a single agent.',
  'Works on any device including mobile. {alternative} is desktop-only with Python + Docker.':
    'Works on any device including mobile. {alternative} is desktop-only with Python + Docker.',
  'Cross-device sync via Yjs/WebRTC. {alternative} has no collaboration features.':
    'Cross-device sync via Yjs/WebRTC. {alternative} has no collaboration features.',
  // AgenticSeek — Pricing
  'Requires Docker + Python': 'Requires Docker + Python',
  'SearxNG setup needed': 'SearxNG setup needed',
  'Desktop only \u2014 no mobile': 'Desktop only \u2014 no mobile',
  'GPL-3.0 license (restrictive)': 'GPL-3.0 license (restrictive)',
  // AgenticSeek — Honest take
  'Need autonomous web browsing with stealth capabilities':
    'Need autonomous web browsing with stealth capabilities',
  'Want local code execution in multiple languages (Python, C, Go, Java)':
    'Want local code execution in multiple languages (Python, C, Go, Java)',
  'Prefer voice-enabled interaction with speech-to-text':
    'Prefer voice-enabled interaction with speech-to-text',
  // Base44 — TL;DR
  'Cloud-based': 'Cloud-based',
  'App generation': 'App generation',
  // Base44 — Feature table
  'Platform-selected': 'Platform-selected',
  'General-Purpose AI': 'General-Purpose AI',
  'App building only': 'App building only',
  'Limited free tier': 'Limited free tier',
  // Base44 — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud infrastructure.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud infrastructure.',
  'Pay only for your own LLM API usage. No ${price}/month subscription, no feature gates, no surprise bills.':
    'Pay only for your own LLM API usage. No ${price}/month subscription, no feature gates, no surprise bills.',
  'Beyond App Building': 'Beyond App Building',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating apps.':
    'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating apps.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} selects AI models for you with no choice.':
    'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} selects AI models for you with no choice.',
  // Base44 — Pricing
  'Paid plans for more features': 'Paid plans for more features',
  'No bring-your-own-key support': 'No bring-your-own-key support',
  // Base44 — Honest take
  'Want to generate full-stack apps from natural language prompts':
    'Want to generate full-stack apps from natural language prompts',
  'Prefer built-in hosting, auth, and database without setup':
    'Prefer built-in hosting, auth, and database without setup',
  'Need one-click publish with custom domains and analytics':
    'Need one-click publish with custom domains and analytics',
  // ChatGPT — TL;DR
  'Cloud (OpenAI infra)': 'Cloud (OpenAI infra)',
  // ChatGPT — Feature table
  'Yes, with human review': 'Yes, with human review',
  'Locked to OpenAI': 'Locked to OpenAI',
  'No \u2014 subscription required': 'No \u2014 subscription required',
  // ChatGPT — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. ChatGPT Agent Mode processes everything on OpenAI\u2019s cloud infrastructure.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. ChatGPT Agent Mode processes everything on OpenAI\u2019s cloud infrastructure.',
  'Pay only for your own LLM API usage. No $20\u2013$200/month subscription, no feature gates, no usage caps.':
    'Pay only for your own LLM API usage. No $20\u2013$200/month subscription, no feature gates, no usage caps.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into OpenAI\u2019s models only.':
    'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into OpenAI\u2019s models only.',
  // ChatGPT — Pricing
  '$20/mo Plus or $200/mo Pro': '$20/mo Plus or $200/mo Pro',
  'Locked to OpenAI models': 'Locked to OpenAI models',
  'No bring-your-own-key option': 'No bring-your-own-key option',
  // ChatGPT — Honest take
  'Want a polished, all-in-one ChatGPT experience with zero setup':
    'Want a polished, all-in-one ChatGPT experience with zero setup',
  'Need built-in browsing, code interpreter, and file analysis in one tool':
    'Need built-in browsing, code interpreter, and file analysis in one tool',
  // DataKit — Hero
  'Full AI agent orchestration that runs in your browser \u2014 not just data analysis, but any task.':
    'Full AI agent orchestration that runs in your browser \u2014 not just data analysis, but any task.',
  // DataKit — TL;DR
  Scope: 'Scope',
  'Multi-agent platform': 'Multi-agent platform',
  'Data analysis tool': 'Data analysis tool',
  'LLM Providers': 'LLM Providers',
  'Data-focused AI': 'Data-focused AI',
  Collaboration: 'Collaboration',
  'P2P sync & teams': 'P2P sync & teams',
  'Single-user': 'Single-user',
  // DataKit — Feature table
  Likely: 'Likely',
  'Data analysis only': 'Data analysis only',
  // DataKit — Advantages
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused solely on data file analysis.':
    'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused solely on data file analysis.',
  'Agent Memory & Knowledge': 'Agent Memory & Knowledge',
  'Agents learn from conversations and access a full knowledge base. {alternative} has no memory or knowledge management.':
    'Agents learn from conversations and access a full knowledge base. {alternative} has no memory or knowledge management.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} is limited to data-specific AI capabilities.':
    'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} is limited to data-specific AI capabilities.',
  'Cross-device sync via Yjs/WebRTC for seamless teamwork. {alternative} is a single-user data analysis tool.':
    'Cross-device sync via Yjs/WebRTC for seamless teamwork. {alternative} is a single-user data analysis tool.',
  // DataKit — Pricing
  'Free (open source)': 'Free (open source)',
  'Data analysis only \u2014 no orchestration':
    'Data analysis only \u2014 no orchestration',
  'No multi-agent collaboration': 'No multi-agent collaboration',
  'No agent memory or knowledge base': 'No agent memory or knowledge base',
  'No P2P sync or cross-device support': 'No P2P sync or cross-device support',
  // DataKit — Honest take
  'Need dedicated CSV, JSON, XLS, or Parquet file analysis with AI assistance':
    'Need dedicated CSV, JSON, XLS, or Parquet file analysis with AI assistance',
  'Want a lightweight, focused tool specifically for local data exploration':
    'Want a lightweight, focused tool specifically for local data exploration',
  'Prefer a single-purpose data tool over a full orchestration platform':
    'Prefer a single-purpose data tool over a full orchestration platform',
  // Dualite — TL;DR
  'From $29/mo': 'From $29/mo',
  'App/web builder': 'App/web builder',
  // Dualite — Feature table
  '5 messages': '5 messages',
  'Figma-to-Code': 'Figma-to-Code',
  // Dualite — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Dualite processes everything on their cloud servers.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Dualite processes everything on their cloud servers.',
  'Pay only for your own LLM API usage. No $29\u2013$79/month subscription, no message limits, no surprise bills.':
    'Pay only for your own LLM API usage. No $29\u2013$79/month subscription, no message limits, no surprise bills.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-prompt app generation.':
    'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-prompt app generation.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own models.':
    'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own models.',
  // Dualite — Pricing
  'Message-based limits': 'Message-based limits',
  '5 free messages only': '5 free messages only',
  // Dualite — Honest take
  'Need Figma-to-code conversion and app templates out of the box':
    'Need Figma-to-code conversion and app templates out of the box',
  'Want a visual app builder with authentication and backend included':
    'Want a visual app builder with authentication and backend included',
  'Prefer prompt-to-app generation over multi-agent orchestration':
    'Prefer prompt-to-app generation over multi-agent orchestration',
  // HugstonOne — Hero
  'Multi-agent orchestration in any browser \u2014 vs a Windows-only local inference app.':
    'Multi-agent orchestration in any browser \u2014 vs a Windows-only local inference app.',
  // HugstonOne — TL;DR
  Platform: 'Platform',
  'Any browser, any OS': 'Any browser, any OS',
  'Windows desktop only': 'Windows desktop only',
  Agents: 'Agents',
  'Multi-agent orchestration': 'Multi-agent orchestration',
  'Single-model inference': 'Single-model inference',
  'Proprietary (free)': 'Proprietary (free)',
  // HugstonOne — Feature table
  'No (proprietary)': 'No (proprietary)',
  'Cross-Platform': 'Cross-Platform',
  'Any OS with a browser': 'Any OS with a browser',
  'Windows only': 'Windows only',
  'No \u2014 single-model only': 'No \u2014 single-model only',
  'Cloud LLM Providers': 'Cloud LLM Providers',
  'None \u2014 local GGUF only': 'None \u2014 local GGUF only',
  'Local Model Support': 'Local Model Support',
  'Via Ollama': 'Via Ollama',
  '10,000+ GGUF models': '10,000+ GGUF models',
  'Knowledge Base': 'Knowledge Base',
  'Yes \u2014 fully local': 'Yes \u2014 fully local',
  // HugstonOne — Advantages
  'Any Device, Any OS': 'Any Device, Any OS',
  'Works on Mac, Linux, Windows, tablets, and phones \u2014 anywhere you have a browser. {alternative} is locked to Windows desktops.':
    'Works on Mac, Linux, Windows, tablets, and phones \u2014 anywhere you have a browser. {alternative} is locked to Windows desktops.',
  'Orchestrate entire teams of specialized AI agents that collaborate on complex tasks. {alternative} runs a single model at a time.':
    'Orchestrate entire teams of specialized AI agents that collaborate on complex tasks. {alternative} runs a single model at a time.',
  'Cloud + Local Models': 'Cloud + Local Models',
  'Access OpenAI, Anthropic, Gemini, Mistral, and more \u2014 plus local models via Ollama. {alternative} only supports local GGUF inference.':
    'Access OpenAI, Anthropic, Gemini, Mistral, and more \u2014 plus local models via Ollama. {alternative} only supports local GGUF inference.',
  'Open Source & Extensible': 'Open Source & Extensible',
  'Fully open-source under the MIT license with a marketplace, plugins, and community contributions. {alternative} is proprietary and closed.':
    'Fully open-source under the MIT license with a marketplace, plugins, and community contributions. {alternative} is proprietary and closed.',
  // HugstonOne — Pricing
  'Free (email required)': 'Free (email required)',
  'Windows only \u2014 no Mac or Linux': 'Windows only \u2014 no Mac or Linux',
  'No cloud LLM provider support': 'No cloud LLM provider support',
  'Proprietary \u2014 not open source': 'Proprietary \u2014 not open source',
  // HugstonOne — Honest take
  'Want a simple local GGUF inference app on Windows':
    'Want a simple local GGUF inference app on Windows',
  'Need GPU-accelerated local model inference with image-to-text':
    'Need GPU-accelerated local model inference with image-to-text',
  'Prefer a desktop app with an integrated code editor and live preview':
    'Prefer a desktop app with an integrated code editor and live preview',
  // LlamaPen — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no download, no Ollama dependency, no limits.':
    'Full AI agent orchestration that runs in your browser \u2014 no download, no Ollama dependency, no limits.',
  // LlamaPen — TL;DR
  'Browser UI for Ollama': 'Browser UI for Ollama',
  // LlamaPen — Feature table
  'Provider Support': 'Provider Support',
  '6+ providers (cloud + local)': '6+ providers (cloud + local)',
  'Ollama only': 'Ollama only',
  'Yes (Ollama web UI)': 'Yes (Ollama web UI)',
  'Yes (PWA)': 'Yes (PWA)',
  'Requires Ollama running': 'Requires Ollama running',
  'Marketplace & Connectors': 'Marketplace & Connectors',
  // LlamaPen — Advantages
  'Multi-Provider Freedom': 'Multi-Provider Freedom',
  'Connect to OpenAI, Anthropic, Gemini, Ollama, and more. {alternative} only works with a local Ollama instance.':
    'Connect to OpenAI, Anthropic, Gemini, Ollama, and more. {alternative} only works with a local Ollama instance.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface.':
    'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface.',
  'Agent Memory & Knowledge Base': 'Agent Memory & Knowledge Base',
  'Persistent memory with human review, plus a full knowledge base for document ingestion. {alternative} has neither.':
    'Persistent memory with human review, plus a full knowledge base for document ingestion. {alternative} has neither.',
  'P2P Sync & Ecosystem': 'P2P Sync & Ecosystem',
  'Cross-device sync via Yjs/WebRTC, marketplace, connectors, and traces. {alternative} offers none of these.':
    'Cross-device sync via Yjs/WebRTC, marketplace, connectors, and traces. {alternative} offers none of these.',
  // LlamaPen — Pricing
  'Ollama-only (no cloud providers)': 'Ollama-only (no cloud providers)',
  'No P2P sync or marketplace': 'No P2P sync or marketplace',
  // LlamaPen — Honest take
  'Only use local Ollama models and want the simplest possible chat UI':
    'Only use local Ollama models and want the simplest possible chat UI',
  'Don\u2019t need multi-agent orchestration or agent memory':
    'Don\u2019t need multi-agent orchestration or agent memory',
  'Want a lightweight, zero-config interface exclusively for Ollama':
    'Want a lightweight, zero-config interface exclusively for Ollama',
  // MiniMax — TL;DR
  'Cloud (MiniMax infra)': 'Cloud (MiniMax infra)',
  'Free tier + credits': 'Free tier + credits',
  'Expert collection': 'Expert collection',
  // MiniMax — Feature table
  'Credit-based': 'Credit-based',
  // MiniMax — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. MiniMax Agent processes everything on their cloud infrastructure.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. MiniMax Agent processes everything on their cloud infrastructure.',
  'Pay only for your own LLM API usage. No credit system, no usage caps, no surprise bills.':
    'Pay only for your own LLM API usage. No credit system, no usage caps, no surprise bills.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} offers an expert collection but lacks true multi-agent orchestration.':
    'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} offers an expert collection but lacks true multi-agent orchestration.',
  // MiniMax — Pricing
  'Free + credits': 'Free + credits',
  'Credit-based usage system': 'Credit-based usage system',
  'No bring-your-own-key': 'No bring-your-own-key',
  // MiniMax — Honest take
  'Want ready-made chatbot deployment to Telegram, Discord, or Slack':
    'Want ready-made chatbot deployment to Telegram, Discord, or Slack',
  'Need built-in PPT creation and website building tools':
    'Need built-in PPT creation and website building tools',
  'Prefer a zero-config SaaS with scheduled task execution':
    'Prefer a zero-config SaaS with scheduled task execution',
  // NextDocs — TL;DR
  'From $18/mo': 'From $18/mo',
  'Document generation': 'Document generation',
  // NextDocs — Feature table
  'Platform-locked': 'Platform-locked',
  'Docs & slides only': 'Docs & slides only',
  'Unlimited Usage': 'Unlimited Usage',
  'Credit-based limits': 'Credit-based limits',
  // NextDocs — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud servers.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud servers.',
  'Pay only for your own LLM API usage. No $18\u2013$90/month subscription, no credit limits, no feature gates.':
    'Pay only for your own LLM API usage. No $18\u2013$90/month subscription, no credit limits, no feature gates.',
  'Beyond Document Generation': 'Beyond Document Generation',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating documents and slides.':
    'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating documents and slides.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their platform with no BYOK option.':
    'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their platform with no BYOK option.',
  // NextDocs — Pricing
  'Free tier limited to 500 credits': 'Free tier limited to 500 credits',
  'Pro plans from $18 to $90/month': 'Pro plans from $18 to $90/month',
  // NextDocs — Honest take
  'Need polished document and slide generation from prompts':
    'Need polished document and slide generation from prompts',
  'Want multi-variant output with brand kit consistency':
    'Want multi-variant output with brand kit consistency',
  'Prefer built-in export to PDF, Google Slides, and PowerPoint':
    'Prefer built-in export to PDF, Google Slides, and PowerPoint',
  // Replit — TL;DR
  'Cloud (Replit infra)': 'Cloud (Replit infra)',
  'Single agent (app builder)': 'Single agent (app builder)',
  // Replit — Feature table
  'Limited daily credits': 'Limited daily credits',
  // Replit — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Replit Agent processes everything on their cloud infrastructure.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Replit Agent processes everything on their cloud infrastructure.',
  'Pay only for your own LLM API usage. No $17\u2013$100/month subscription, no credit limits, no surprise bills.':
    'Pay only for your own LLM API usage. No $17\u2013$100/month subscription, no credit limits, no surprise bills.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-agent app building.':
    'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-agent app building.',
  // Replit — Pricing
  'Credit-based usage ($20\u2013$100)': 'Credit-based usage ($20\u2013$100)',
  'Paid tiers for more builds': 'Paid tiers for more builds',
  // Replit — Honest take
  'Need one-click deployment and built-in hosting for apps':
    'Need one-click deployment and built-in hosting for apps',
  'Want an all-in-one IDE with instant infrastructure setup':
    'Want an all-in-one IDE with instant infrastructure setup',
  'Prefer a managed platform for full-stack app generation':
    'Prefer a managed platform for full-stack app generation',
  // Roma — Hero
  'Full AI agent orchestration that runs in your browser \u2014 no Python, no Docker, no setup.':
    'Full AI agent orchestration that runs in your browser \u2014 no Python, no Docker, no setup.',
  // Roma — TL;DR
  'Python + Docker setup': 'Python + Docker setup',
  'Code-first / API-first': 'Code-first / API-first',
  'Python + DSPy framework': 'Python + DSPy framework',
  // Roma — Feature table
  'Recursive pipeline': 'Recursive pipeline',
  'OpenRouter + major providers': 'OpenRouter + major providers',
  // Roma — Advantages
  'No Python, no Docker, no DSPy \u2014 just open your browser. {alternative} requires a full Python environment with Docker.':
    'No Python, no Docker, no DSPy \u2014 just open your browser. {alternative} requires a full Python environment with Docker.',
  'Full graphical UI with agent visualization and real-time workflow tracking. {alternative} is a code-first framework with a REST API.':
    'Full graphical UI with agent visualization and real-time workflow tracking. {alternative} is a code-first framework with a REST API.',
  'Persistent memory system and knowledge base with human review. {alternative} focuses on execution pipelines without built-in memory.':
    'Persistent memory system and knowledge base with human review. {alternative} focuses on execution pipelines without built-in memory.',
  'Works on any device including mobile \u2014 no install, no server infrastructure. Everything runs client-side as a PWA.':
    'Works on any device including mobile \u2014 no install, no server infrastructure. Everything runs client-side as a PWA.',
  // Roma — Pricing
  'Requires Python + Docker': 'Requires Python + Docker',
  'No visual UI \u2014 code-first only': 'No visual UI \u2014 code-first only',
  'Server infrastructure needed': 'Server infrastructure needed',
  'No built-in knowledge base': 'No built-in knowledge base',
  // Roma — Honest take
  'Need recursive task decomposition with DSPy-based prediction strategies':
    'Need recursive task decomposition with DSPy-based prediction strategies',
  'Want a programmable pipeline with Atomizer, Planner, Executor, and Verifier stages':
    'Want a programmable pipeline with Atomizer, Planner, Executor, and Verifier stages',
  'Prefer MLflow observability and E2B sandboxed code execution':
    'Prefer MLflow observability and E2B sandboxed code execution',
  // RunnerH — TL;DR
  'Cloud-based processing': 'Cloud-based processing',
  'Enterprise (contact sales)': 'Enterprise (contact sales)',
  'Computer-use agent': 'Computer-use agent',
  // RunnerH — Feature table
  Partially: 'Partially',
  'Cloud API/demo': 'Cloud API/demo',
  'Sub-agent architecture': 'Sub-agent architecture',
  'Proprietary Holo models': 'Proprietary Holo models',
  'Cross-Platform Automation': 'Cross-Platform Automation',
  'Browser-based': 'Browser-based',
  'Desktop, web & mobile': 'Desktop, web & mobile',
  'None (enterprise only)': 'None (enterprise only)',
  // RunnerH — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Runner H processes everything on H Company\u2019s cloud infrastructure.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Runner H processes everything on H Company\u2019s cloud infrastructure.',
  'Pay only for your own LLM API usage. Runner H runs are \u201cextremely costly\u201d and require enterprise contracts.':
    'Pay only for your own LLM API usage. Runner H runs are \u201cextremely costly\u201d and require enterprise contracts.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-task computer-use automation.':
    'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-task computer-use automation.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into proprietary Holo models.':
    'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into proprietary Holo models.',
  // RunnerH — Pricing
  'Extremely costly per run': 'Extremely costly per run',
  'No self-serve pricing': 'No self-serve pricing',
  'Locked to proprietary models': 'Locked to proprietary models',
  // RunnerH — Honest take
  'Need SOTA computer-use automation across desktop, web, and mobile':
    'Need SOTA computer-use automation across desktop, web, and mobile',
  'Require cross-platform GUI interaction with visual grounding':
    'Require cross-platform GUI interaction with visual grounding',
  'Have an enterprise budget and need benchmark-leading task completion':
    'Have an enterprise budget and need benchmark-leading task completion',
  // Trace — TL;DR
  'Not listed (beta)': 'Not listed (beta)',
  'Closed-source': 'Closed-source',
  // Trace — Feature table
  'Workflow-based': 'Workflow-based',
  Unknown: 'Unknown',
  Availability: 'Availability',
  'Available now': 'Available now',
  'Beta / waitlist': 'Beta / waitlist',
  'Not publicly listed': 'Not publicly listed',
  // Trace — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Trace processes everything on their cloud infrastructure.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Trace processes everything on their cloud infrastructure.',
  'Available & Free': 'Available & Free',
  'Use {productName} today at no cost \u2014 no waitlist, no beta access required. Trace is still in closed beta with undisclosed pricing.':
    'Use {productName} today at no cost \u2014 no waitlist, no beta access required. Trace is still in closed beta with undisclosed pricing.',
  'Open Source & Transparent': 'Open Source & Transparent',
  'Fully open-source under MIT license \u2014 inspect, modify, and self-host. Trace is closed-source with no public codebase.':
    'Fully open-source under MIT license \u2014 inspect, modify, and self-host. Trace is closed-source with no public codebase.',
  'Works Offline': 'Works Offline',
  'Run entirely in your browser without internet after initial load. Trace\u2019s cloud-based architecture requires a constant connection.':
    'Run entirely in your browser without internet after initial load. Trace\u2019s cloud-based architecture requires a constant connection.',
  // Trace — Pricing
  'Closed beta / waitlist only': 'Closed beta / waitlist only',
  'Pricing not publicly available': 'Pricing not publicly available',
  'BYOK status unknown': 'BYOK status unknown',
  // Trace — Honest take
  'Need a knowledge-graph context engine for enterprise workflows':
    'Need a knowledge-graph context engine for enterprise workflows',
  'Want built-in SLA monitoring and department-level coordination':
    'Want built-in SLA monitoring and department-level coordination',
  'Require deep Slack, Notion, Jira, and Google Drive integrations out of the box':
    'Require deep Slack, Notion, Jira, and Google Drive integrations out of the box',
  // V7Go — Feature table
  'Document processing': 'Document processing',
  'Document processing only': 'Document processing only',
  'No free tier': 'No free tier',
  // V7Go — Advantages
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes all documents on their cloud infrastructure.':
    'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes all documents on their cloud infrastructure.',
  'Pay only for your own LLM API usage. No enterprise contracts, no per-page pricing, no sales calls required.':
    'Pay only for your own LLM API usage. No enterprise contracts, no per-page pricing, no sales calls required.',
  'Beyond Document Processing': 'Beyond Document Processing',
  'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused on document understanding and data extraction.':
    'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused on document understanding and data extraction.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} uses their own platform-selected models with no choice.':
    'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} uses their own platform-selected models with no choice.',
  // V7Go — Pricing
  'No free tier available': 'No free tier available',
  'Enterprise-only pricing': 'Enterprise-only pricing',
  'Cloud-only document processing': 'Cloud-only document processing',
  // V7Go — Honest take
  'Need specialized document understanding and data extraction at enterprise scale':
    'Need specialized document understanding and data extraction at enterprise scale',
  'Want automated workflows for processing PDFs, images, and structured documents':
    'Want automated workflows for processing PDFs, images, and structured documents',
  'Require enterprise integrations and dedicated support for document automation':
    'Require enterprise integrations and dedicated support for document automation',
}
