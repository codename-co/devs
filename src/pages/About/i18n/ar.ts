import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Hero
  'AI Augmentation for Everyone': 'تعزيز الذكاء الاصطناعي للجميع',
  '{product} is a browser-native AI agent orchestration platform. Delegate complex tasks to teams of specialised agents that plan, collaborate, and deliver — all running':
    '{product} هي منصة تنسيق وكلاء ذكاء اصطناعي أصلية في المتصفح. فوّض المهام المعقدة لفرق من الوكلاء المتخصصين الذين يخططون ويتعاونون ويُنجزون — كل ذلك يعمل',
  'entirely on your device': 'بالكامل على جهازك',
  '\u201CAI augmentation shouldn\u2019t be a luxury for the few, but a fundamental tool available to all — where anyone can leverage the power of AI teams to amplify their capabilities and achieve their goals.\u201D':
    '\u201Cتعزيز الذكاء الاصطناعي لا ينبغي أن يكون رفاهية للقلة، بل أداة أساسية متاحة للجميع — حيث يمكن لأي شخص الاستفادة من قوة فرق الذكاء الاصطناعي لتضخيم قدراته وتحقيق أهدافه.\u201D',

  // Principles section
  Philosophy: 'فلسفة',
  'Built on Conviction': 'مبني على قناعات',
  'Three non-negotiable principles guide every decision we make.':
    'ثلاثة مبادئ غير قابلة للتفاوض توجه كل قرار نتخذه.',
  'Privacy by Design': 'الخصوصية حسب التصميم',
  'Every byte of your data stays on your device. No servers. No telemetry. No compromise.':
    'كل بايت من بياناتك يبقى على جهازك. لا خوادم. لا قياس عن بُعد. لا تنازلات.',
  'Universally Accessible': 'متاح عالمياً',
  'A browser is all you need. No installation, no GPU, no special hardware — just open and create.':
    'المتصفح هو كل ما تحتاجه. لا تثبيت، لا GPU، لا أجهزة خاصة — فقط افتح وأنشئ.',
  'Open Source Forever': 'مفتوح المصدر للأبد',
  'Built in the open, shaped by the community. Every line of code is yours to read, improve, and share.':
    'مبني بشفافية، مُشكّل من المجتمع. كل سطر من الكود لك لتقرأه وتحسّنه وتشاركه.',

  // Capabilities section
  Capabilities: 'القدرات',
  'Powerful by Design': 'قوي بالتصميم',
  'A depth of engineering so you can focus on what matters — your ideas.':
    'عمق هندسي حتى تتمكن من التركيز على ما يهم — أفكارك.',
  'Multi-Agent Orchestration': 'تنسيق متعدد الوكلاء',
  'Collective Intelligence': 'الذكاء الجماعي',
  'Compose teams of specialised AI agents that plan, execute, and validate together — mirroring how the best human teams operate.':
    'شكّل فرقاً من وكلاء ذكاء اصطناعي متخصصين يخططون وينفذون ويتحققون معاً — على غرار أفضل الفرق البشرية.',
  'Provider Independence': 'استقلالية المزوّد',
  'Your Models, Your Choice': 'نماذجك، اختيارك',
  'Seamlessly switch between OpenAI, Anthropic, Google Gemini, Mistral, Ollama, or any OpenAI-compatible endpoint. Never locked in.':
    'انتقل بسلاسة بين OpenAI وAnthropic وGoogle Gemini وMistral وOllama أو أي نقطة نهاية متوافقة مع OpenAI. لن تكون محبوساً أبداً.',
  'Zero-Trust Architecture': 'هندسة انعدام الثقة',
  'Security as a Foundation': 'الأمان كأساس',
  'Web Crypto API encrypts your tokens. Service Workers sandbox execution. IndexedDB keeps everything local. Defense in depth, by default.':
    'Web Crypto API يشفر رموزك. Service Workers يعزل التنفيذ. IndexedDB يحتفظ بكل شيء محلياً. دفاع متعدد الطبقات، افتراضياً.',
  'Intelligent Task Analysis': 'تحليل ذكي للمهام',
  'Complexity, Simplified': 'التعقيد، مُبسّط',
  'An LLM-powered analyser breaks your request into requirements, recruits the right agents, resolves dependencies, and orchestrates delivery.':
    'محلل مدعوم بـ LLM يفكك طلبك إلى متطلبات، ويجنّد الوكلاء المناسبين، ويحل التبعيات، وينسق التسليم.',
  'Offline-First & P2P': 'Offline-First و P2P',
  'Works Anywhere': 'يعمل في أي مكان',
  'Fully functional without internet after first load. Optional Yjs-powered P2P sync lets you collaborate across devices without a central server.':
    'يعمل بالكامل بدون إنترنت بعد التحميل الأول. المزامنة الاختيارية عبر P2P بقوة Yjs تتيح لك التعاون بين الأجهزة بدون خادم مركزي.',
  'Extensible by Nature': 'قابل للتوسيع بطبيعته',
  'Build on Top': 'ابنِ فوقه',
  'A marketplace of agents, tools, connectors, and apps — plus a sandboxed Extension Bridge so the community can create and share new capabilities.':
    'سوق للوكلاء والأدوات والموصلات والتطبيقات — بالإضافة إلى Extension Bridge معزول ليتمكن المجتمع من إنشاء ومشاركة قدرات جديدة.',

  // How it works section
  'Getting Started': 'البدء',
  'Four Steps to Delegation': 'أربع خطوات نحو التفويض',
  'From prompt to polished output in minutes, not hours.':
    'من الطلب إلى المخرج المصقول في دقائق، وليس ساعات.',
  'Configure your AI provider': 'اضبط مزوّد الذكاء الاصطناعي',
  'Connect your preferred LLM — OpenAI, Anthropic, Gemini, Ollama, or any compatible endpoint.':
    'اربط LLM المفضل لديك — OpenAI أو Anthropic أو Gemini أو Ollama أو أي نقطة نهاية متوافقة.',
  'Describe your task': 'صِف مهمتك',
  'Tell DEVS what you need in natural language. Be ambitious — the orchestrator thrives on complexity.':
    'أخبر DEVS بما تحتاجه بلغة طبيعية. كن طموحاً — المنسق يزدهر مع التعقيد.',
  'Watch agents collaborate': 'شاهد الوكلاء يتعاونون',
  'See specialised agents plan, execute, and validate in real-time. Intervene, guide, or just observe.':
    'شاهد الوكلاء المتخصصين يخططون وينفذون ويتحققون في الوقت الحقيقي. تدخّل أو وجّه أو راقب فقط.',
  'Receive & refine': 'استلم وحسّن',
  'Get structured artefacts — code, docs, analyses — and iterate with feedback until it\u2019s right.':
    'احصل على مخرجات منظمة — أكواد ووثائق وتحليلات — وكرر مع الملاحظات حتى يصبح صحيحاً.',

  // Use cases section
  'For Everyone': 'للجميع',
  'Built for Builders': 'مصمم للبُناة',
  'Whether you\u2019re writing code or writing prose — DEVS adapts to you.':
    'سواء كنت تكتب كوداً أو نصوصاً — DEVS يتكيف معك.',
  Students: 'طلاب',
  'Research, study planning & assignment help':
    'بحث وتخطيط دراسي ومساعدة في الواجبات',
  Developers: 'مطورون',
  'Rapid prototyping, code generation & reviews':
    'نمذجة سريعة وتوليد أكواد ومراجعات',
  Creators: 'مبدعون',
  'Brainstorming, writing & content production': 'عصف ذهني وكتابة وإنتاج محتوى',
  Researchers: 'باحثون',
  'Literature review, data analysis & hypothesis testing':
    'مراجعة الأدبيات وتحليل البيانات واختبار الفرضيات',
  Managers: 'مديرون',
  'Project planning, task breakdown & operations':
    'تخطيط المشاريع وتقسيم المهام والعمليات',
  Entrepreneurs: 'رواد أعمال',
  'Idea validation, strategy & business planning':
    'التحقق من الأفكار والاستراتيجية وتخطيط الأعمال',

  // FAQ section
  FAQ: 'الأسئلة الشائعة',
  'Common Questions': 'أسئلة شائعة',
  'Is my data private?': 'هل بياناتي خاصة؟',
  'Absolutely. All processing happens locally in your browser. We never collect, transmit, or store any of your data. Your API keys are encrypted with the Web Crypto API and never leave your device.':
    'بالتأكيد. تتم جميع المعالجة محلياً في متصفحك. لا نقوم أبداً بجمع أو نقل أو تخزين أي من بياناتك. مفاتيح API الخاصة بك مشفرة بواسطة Web Crypto API ولا تغادر جهازك أبداً.',
  'Which AI providers are supported?':
    'ما هي مزوّدات الذكاء الاصطناعي المدعومة؟',
  'We support {providers}, and any provider compatible with the OpenAI API specification. You can switch providers at any time without losing your conversations or data.':
    'ندعم {providers}، وأي مزوّد متوافق مع مواصفات واجهة OpenAI. يمكنك تغيير المزوّد في أي وقت دون فقدان محادثاتك أو بياناتك.',
  'Do I need to install anything?': 'هل أحتاج لتثبيت أي شيء؟',
  'Nothing at all. DEVS is a Progressive Web App that runs entirely in your browser. You can optionally \u201Cinstall\u201D it to your home screen for a native-like experience, but it\u2019s never required.':
    'لا شيء على الإطلاق. DEVS هو تطبيق ويب تقدمي يعمل بالكامل في متصفحك. يمكنك اختيارياً \u201Cتثبيته\u201D على شاشتك الرئيسية لتجربة شبيهة بالتطبيقات الأصلية، لكنه ليس مطلوباً أبداً.',
  'Is this really free and open source?': 'هل هذا حقاً مجاني ومفتوح المصدر؟',
  'Yes — {license} licensed and always will be. The entire codebase is on GitHub. You can self-host, fork, or contribute. No premium tiers, no paywalls.':
    'نعم — مرخص بموجب {license} وسيبقى كذلك دائماً. كل الكود المصدري على GitHub. يمكنك الاستضافة الذاتية أو التفرع أو المساهمة. لا مستويات مميزة، لا جدران دفع.',
  'Can I use it offline?': 'هل يمكنني استخدامه بدون إنترنت؟',
  'After the first load, the Service Worker caches everything you need. You can create agents, manage knowledge, and review past conversations without any internet connection. LLM calls obviously require connectivity to the provider.':
    'بعد التحميل الأول، يخزن Service Worker كل ما تحتاجه مؤقتاً. يمكنك إنشاء وكلاء وإدارة المعرفة ومراجعة المحادثات السابقة بدون أي اتصال بالإنترنت. مكالمات LLM تتطلب بطبيعة الحال اتصالاً بالمزوّد.',
  'How does multi-agent orchestration work?': 'كيف يعمل التنسيق متعدد الوكلاء؟',
  'When you describe a complex task, the built-in orchestrator analyses it, breaks it into subtasks, recruits specialised agents, resolves dependencies, and coordinates parallel execution — just like a well-run project team.':
    'عندما تصف مهمة معقدة، يحللها المنسق المدمج ويفككها إلى مهام فرعية ويجنّد وكلاء متخصصين ويحل التبعيات وينسق التنفيذ المتوازي — تماماً مثل فريق مشروع يُدار بكفاءة.',

  // CTA section
  'Shape the Future With Us': 'شكّل المستقبل معنا',
  '{product} is built by people who believe technology should empower, not enclose. Every contribution — code, ideas, feedback — makes AI augmentation more accessible to the world.':
    '{product} مبني من قبل أشخاص يؤمنون بأن التكنولوجيا يجب أن تُمكّن، لا أن تُحاصر. كل مساهمة — كود أو أفكار أو ملاحظات — تجعل تعزيز الذكاء الاصطناعي أكثر سهولة للعالم.',
  'View on GitHub': 'عرض على GitHub',
  'Open an Issue': 'فتح مشكلة',
  'Made with care for humans everywhere.': 'صُنع بعناية للبشر في كل مكان.',
}
