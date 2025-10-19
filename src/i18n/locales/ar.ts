import type { I18n } from '@/i18n/locales'

export const ar: I18n = {
  // AgentPicker
  'Available Agents': 'الوكلاء المتاحون',
  Scientists: 'العلماء',
  Advisors: 'المستشارون',
  Artists: 'الفنانون',
  Philosophers: 'الفلاسفة',
  Musicians: 'الموسيقيون',
  Developers: 'المطورون',
  Writers: 'الكتّاب',
  'Other Agents': 'وكلاء آخرون',

  // AppDrawer
  'Expand sidebar': 'توسيع الشريط الجانبي',
  'Collapse sidebar': 'طي الشريط الجانبي',
  'New Task': 'مهمة جديدة',
  'New Team': 'فريق جديد',
  Tasks: 'المهام',
  Teams: 'الفرق',
  Settings: 'الإعدادات',
  Agents: 'الوكلاء',
  Methodologies: 'المنهجيات',
  Conversations: 'المحادثات',
  'Conversations history': 'سجل المحادثات',
  Knowledge: 'المعرفة',
  Connectors: 'الموصلات',
  'New chat': 'محادثة جديدة',
  AGENTS: 'الوكلاء',
  CONVERSATIONS: 'المحادثات',
  'View all agents': 'عرض جميع الوكلاء',
  'View all history': 'عرض السجل الكامل',
  Chat: 'محادثة',
  'Main navigation': 'التنقل الرئيسي',
  'New Agent': 'وكيل جديد',
  'New Methodology': 'منهجية جديدة',
  'Upgrade to Pro': 'الترقية إلى النسخة الاحترافية',
  'Quick Actions': 'إجراءات سريعة',
  'Toggle Theme': 'تبديل السمة',
  Theme: 'السمة',
  System: 'النظام',
  Light: 'فاتح',
  Dark: 'داكن',
  About: 'حول',
  Language: 'اللغة',

  // PromptArea
  'Need something done?': 'هل تحتاج إلى إنجاز شيء؟',
  'More actions': 'المزيد من الإجراءات',
  'Attach a file or image': 'إرفاق ملف أو صورة',
  'Upload new file': 'رفع ملف جديد',
  'Choose from knowledge base': 'اختر من قاعدة المعرفة',
  'Drop files here…': 'أسقط الملفات هنا…',
  'Speak to microphone': 'التحدث إلى الميكروفون',
  'Send prompt': 'إرسال الطلب',
  'Select an agent': 'اختر وكيلاً',
  'Select a model': 'اختر نموذجاً',
  'Add a model': 'إضافة نموذج',

  // Service worker
  'New features are waiting': 'ميزات جديدة في الانتظار',
  '{product} v{version} is ready to be installed.':
    '{product} v{version} جاهز للتثبيت.',
  Upgrade: 'ترقية',

  // Page: /404
  'Page not found': 'الصفحة غير موجودة',

  // LLM Integration
  'No LLM provider configured. Please [configure one in Settings]({path}).':
    'لم يتم تكوين مزود LLM. يرجى [تكوين واحد في الإعدادات]({path}).',

  // MarkdownRenderer
  'Thinking…': 'يفكر…',
  Thoughts: 'أفكار',

  // AgentsPage
  'My Agents ({count})': 'وكلائي ({count})',
  'Built-in Agents ({count})': 'الوكلاء المدمجون ({count})',
  'Built-in agents are pre-configured agents that come with the platform. They showcase various capabilities and can serve as inspiration for your own custom agents.':
    'الوكلاء المدمجون هم وكلاء مُعدون مسبقاً ومتوفرون مع المنصة. يعرضون قدرات متنوعة ويمكن أن يكونوا مصدر إلهام لوكلائك المخصصين.',

  // AgentRunPage
  'View and manage your past conversations': 'عرض وإدارة محادثاتك السابقة',
  'Loading agent and conversation…': 'جارٍ تحميل الوكيل والمحادثة…',
  Back: 'رجوع',
  'Conversation ID:': 'معرّف المحادثة:',
  You: 'أنت',
  'Continue the conversation…': 'متابعة المحادثة…',
  'Start chatting with {agentName}…': 'بدء المحادثة مع {agentName}…',
  'this agent': 'هذا الوكيل',
  'System Prompt': 'طلب النظام',
  'No system prompt defined.': 'لم يتم تعريف طلب نظام.',

  // Artifacts side panel
  Artifacts: 'القطع الأثرية',
  'No artifacts created yet': 'لم يتم إنشاء قطع أثرية بعد',

  // Task
  Requirements: 'المتطلبات',
  'Task Timeline': 'الجدول الزمني للمهمة',
  'Active Agents': 'الوكلاء النشطون',

  // Background Image
  'Please select an image file': 'يرجى اختيار ملف صورة',
  'Image file is too large. Please select a file smaller than {size}MB.':
    'ملف الصورة كبير جداً. يرجى اختيار ملف أصغر من {size} ميجابايت.',
  'Background image updated': 'تم تحديث صورة الخلفية',
  'Failed to process image file': 'فشل معالجة ملف الصورة',
  'Please drop an image file': 'يرجى إسقاط ملف صورة',
  'Drop your image here': 'أسقط صورتك هنا',
  'Release to set as background': 'حرر لتعيينها كخلفية',
  'Background Image': 'صورة الخلفية',
  'Set a custom background image for the home page':
    'تعيين صورة خلفية مخصصة للصفحة الرئيسية',
  'Change Background': 'تغيير الخلفية',
  'Upload Background': 'رفع الخلفية',
  'Background image removed': 'تمت إزالة صورة الخلفية',
  'Make the platform your own': 'اجعل المنصة خاصة بك',
  Undo: 'تراجع',
  'The URL does not point to a valid image': 'لا يشير الرابط إلى صورة صالحة',
  'Failed to load image from URL. Please check the URL and try again.':
    'فشل تحميل الصورة من الرابط. يرجى التحقق من الرابط والمحاولة مرة أخرى.',
  'Please drop an image file or drag an image from a website':
    'يرجى إسقاط ملف صورة أو سحب صورة من موقع ويب',

  // About Page
  'AI Teams': 'فرق الذكاء الاصطناعي',
  'Multiple AI agents working together on complex tasks.':
    'وكلاء ذكاء اصطناعي متعددون يعملون معاً على مهام معقدة.',
  'LLM Independent': 'مستقل عن LLM',
  'Works with OpenAI, Anthropic, Google Gemini, and more':
    'يعمل مع OpenAI وAnthropic وGoogle Gemini وغيرها',
  'Privacy First': 'الخصوصية أولاً',
  'All data stays on your device. No servers, no tracking.':
    'جميع البيانات تبقى على جهازك. لا خوادم، لا تتبع.',
  'Browser Native': 'أصلي للمتصفح',
  'Works entirely in your browser. No installation required.':
    'يعمل بالكامل في متصفحك. لا يتطلب تثبيتاً.',
  'Offline Ready': 'جاهز للعمل دون اتصال',
  'Works without internet after initial load.':
    'يعمل بدون إنترنت بعد التحميل الأولي.',
  'Open Source': 'مفتوح المصدر',
  '{license} licensed. Built by the community, for the community.':
    'مرخص بموجب {license}. بُني من قبل المجتمع، للمجتمع.',
  'Configure your LLM provider': 'تكوين مزود LLM الخاص بك',
  'Describe your task': 'صف مهمتك',
  'Be as detailed as possible to get the best results':
    'كن مفصلاً قدر الإمكان للحصول على أفضل النتائج',
  'Watch AI agents collaborate': 'شاهد وكلاء الذكاء الاصطناعي يتعاونون',
  'See how different agents work together to complete your task':
    'انظر كيف يعمل الوكلاء المختلفون معاً لإنجاز مهمتك',
  'Guide when needed': 'أرشد عند الحاجة',
  'Provide feedback and guidance to the agents as they work':
    'قدم التعليقات والإرشادات للوكلاء أثناء عملهم',
  'Our Vision': 'رؤيتنا',
  "Democratize AI agent delegation with a universally accessible, privacy-conscious, open-source solution that runs entirely in the browser. AI augmentation isn't a luxury for the few, but a fundamental tool available to all.":
    'إضفاء الطابع الديمقراطي على تفويض وكلاء الذكاء الاصطناعي من خلال حل مفتوح المصدر يمكن الوصول إليه عالمياً ويراعي الخصوصية ويعمل بالكامل في المتصفح. تعزيز الذكاء الاصطناعي ليس رفاهية للقلة، بل أداة أساسية متاحة للجميع.',
  'Key Features': 'الميزات الرئيسية',
  'Key Benefits': 'الفوائد الرئيسية',
  'How It Works': 'كيف يعمل',
  FAQ: 'الأسئلة الشائعة',
  'Is my data private?': 'هل بياناتي خاصة؟',
  'Yes! All data processing happens locally in your browser. We do not collect or store any of your data.':
    'نعم! تتم معالجة جميع البيانات محلياً في متصفحك. نحن لا نجمع أو نخزن أياً من بياناتك.',
  'Which LLM providers are supported?': 'ما هي مزودات LLM المدعومة؟',
  'We support {llmList}, and any provider compatible with the OpenAI API spec.':
    'نحن ندعم {llmList}، وأي مزود متوافق مع مواصفات OpenAI API.',
  'Do I need to install anything?': 'هل أحتاج إلى تثبيت شيء؟',
  'No installation is required. The app runs entirely in your web browser.':
    'لا يلزم التثبيت. يعمل التطبيق بالكامل في متصفح الويب الخاص بك.',
  'Is this open source?': 'هل هذا مفتوح المصدر؟',
  'Yes! The project is open source and available on GitHub under the {license} license.':
    'نعم! المشروع مفتوح المصدر ومتاح على GitHub تحت ترخيص {license}.',
  'View on GitHub': 'عرض على GitHub',

  // Tasks Page
  'Manage and monitor tasks for your organization':
    'إدارة ومراقبة المهام لمؤسستك',
  'Loading tasks…': 'جارٍ تحميل المهام…',
  tasks: 'مهام',
  'In Progress': 'قيد التنفيذ',

  // Task Page
  'Task Details': 'تفاصيل المهمة',
  'Task Created': 'تم إنشاء المهمة',
  'Agent Assigned': 'تم تعيين الوكيل',
  'Artifact Created': 'تم إنشاء قطعة أثرية',
  'User Message': 'رسالة المستخدم',
  'Agent Response': 'رد الوكيل',
  'Requirement Satisfied': 'تم استيفاء المتطلب',
  'Task Completed': 'اكتملت المهمة',
  'Task Branched': 'تفرعت المهمة',
  'Sub-task Created': 'تم إنشاء مهمة فرعية',
  'Sub-task Completed': 'اكتملت المهمة الفرعية',
  'Requirement Detected': 'تم الكشف عن متطلب',
  'Requirement Validated': 'تم التحقق من المتطلب',
  'Task Started': 'بدأت المهمة',
  'Methodology Selected': 'تم اختيار المنهجية',
  'Phase Started': 'بدأت المرحلة',
  'Phase Completed': 'اكتملت المرحلة',
  'Team Built': 'تم تشكيل الفريق',
  'Role Assigned': 'تم تعيين الدور',
  'All requirements satisfied': 'تم استيفاء جميع المتطلبات',
  'No task ID provided': 'لم يتم توفير معرّف المهمة',
  'Task not found': 'لم يتم العثور على المهمة',
  'Failed to load task data': 'فشل تحميل بيانات المهمة',
  'View Content': 'عرض المحتوى',
  'Loading task details…': 'جارٍ تحميل تفاصيل المهمة…',
  'Task Not Found': 'لم يتم العثور على المهمة',
  'The requested task could not be found.':
    'لم يتم العثور على المهمة المطلوبة.',
  'Task Steps': 'خطوات المهمة',
  'Validation Criteria': 'معايير التحقق',

  // SubTaskTree Component
  'Task Hierarchy': 'التسلسل الهرمي للمهام',
  'Expand All': 'توسيع الكل',
  'Collapse All': 'طي الكل',
  'Parent Task': 'المهمة الرئيسية',
  'Sibling Tasks': 'المهام الشقيقة',
  'Current Task & Sub-tasks': 'المهمة الحالية والمهام الفرعية',
  'Main Task & Sub-tasks': 'المهمة الرئيسية والمهام الفرعية',
  'Task Dependencies': 'تبعيات المهمة',
  'Total Sub-tasks': 'إجمالي المهام الفرعية',

  // Common actions
  Retry: 'إعادة المحاولة',
  Refresh: 'تحديث',
  Close: 'إغلاق',
  Edit: 'تحرير',
  Delete: 'حذف',
  Save: 'حفظ',
  Remove: 'إزالة',
  Cancel: 'إلغاء',
  Export: 'تصدير',
  'Copy to clipboard': 'نسخ إلى الحافظة',
  Download: 'تنزيل',

  // Database Administration
  'Loading database information…': 'جارٍ تحميل معلومات قاعدة البيانات…',
  'Failed to load database information': 'فشل تحميل معلومات قاعدة البيانات',
  'Database Administration': 'إدارة قاعدة البيانات',
  'Reset Database': 'إعادة تعيين قاعدة البيانات',
  '{n} records': '{n} سجلات',
  Records: 'السجلات',
  Indexes: 'الفهارس',
  Size: 'الحجم',
  'Search {store} by {categories}…': 'بحث في {store} حسب {categories}…',
  'All Records': 'جميع السجلات',
  'Filtered Records': 'السجلات المفلترة',
  ID: 'المعرّف',
  Preview: 'معاينة',
  Actions: 'الإجراءات',
  View: 'عرض',
  'No data recorded': 'لم يتم تسجيل بيانات',
  'Record Details': 'تفاصيل السجل',

  // Searchable collections & indexes
  agents: 'الوكلاء',
  conversations: 'المحادثات',
  knowledgeItems: 'عناصر المعرفة',
  folderWatchers: 'مراقبو المجلدات',
  credentials: 'بيانات الاعتماد',
  artifacts: 'القطع الأثرية',
  // tasks: 'المهام',
  contexts: 'السياقات',
  langfuse_config: 'تكوين langfuse',
  id: 'المعرّف',
  name: 'الاسم',
  description: 'الوصف',
  role: 'الدور',
  tags: 'الوسوم',
  size: 'الحجم',
  type: 'النوع',
  createdAt: 'تاريخ الإنشاء',
  fileType: 'نوع الملف',
  content: 'المحتوى',
  contentHash: 'تجزئة المحتوى',
  path: 'المسار',
  provider: 'المزود',
  model: 'النموذج',
  encryptedApiKey: 'مفتاح API المشفر',
  baseUrl: 'الرابط الأساسي',
  timestamp: 'الطابع الزمني',
  order: 'الترتيب',
  mimeType: 'نوع MIME',
  lastModified: 'آخر تعديل',
  syncSource: 'مصدر المزامنة',
  lastSyncCheck: 'آخر فحص مزامنة',

  // Sharing
  'Share the platform': 'مشاركة المنصة',
  'Export the platform settings to another device or share it with others':
    'تصدير إعدادات المنصة إلى جهاز آخر أو مشاركتها مع الآخرين',
  'Export your current agents and LLM provider settings and share it via URL or QR code.':
    'تصدير وكلائك الحاليين وإعدادات مزود LLM ومشاركتها عبر رابط أو رمز QR.',
  'Include my {n} agents': 'تضمين وكلائي ({n})',
  'Now you can share the platform configuration…':
    'يمكنك الآن مشاركة تكوين المنصة…',
  'Either with this URL:': 'إما بهذا الرابط:',
  'Or this QR Code:': 'أو برمز QR هذا:',
  'QR code generation failed. You can still use the URL above.':
    'فشل إنشاء رمز QR. يمكنك استخدام الرابط أعلاه.',
  'Platform Preparation': 'تحضير المنصة',
  'Password (optional)': 'كلمة المرور (اختيارية)',
  Password: 'كلمة المرور',
  Continue: 'متابعة',
  'Setting the platform up…': 'جارٍ إعداد المنصة…',

  // Local LLM Loading Indicator
  'Initializing Local AI Model…': 'جارٍ تهيئة نموذج الذكاء الاصطناعي المحلي…',
} as const
