import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Agent Builder': 'بناء الوكيل',
  'Design and configure your custom specialized AI agent':
    'صمم وكوّن وكيل الذكاء الاصطناعي المتخصص الخاص بك',
  'Agent Profile': 'ملف الوكيل',
  "Define your agent's personality and capabilities": 'حدد شخصية وقدرات وكيلك',
  'Agent created successfully! Redirecting to agents list...':
    'تم إنشاء الوكيل بنجاح! جارٍ إعادة التوجيه إلى قائمة الوكلاء...',
  Name: 'الاسم',
  'e.g., Mike the Magician': 'مثال: مايك الساحر',
  'A friendly name for your agent': 'اسم ودود لوكيلك',
  Role: 'الدور',
  'e.g., Performs magic tricks and illusions': 'مثال: يؤدي حيل سحرية وأوهام',
  'What does your agent do?': 'ماذا يفعل وكيلك؟',
  Instructions: 'التعليمات',
  "Detailed instructions for the agent's personality, skills, constraints, and goals…":
    'تعليمات مفصلة لشخصية الوكيل ومهاراته وقيوده وأهدافه…',
  "Detailed instructions for the agent's behavior":
    'تعليمات مفصلة لسلوك الوكيل',
  'Advanced Configuration': 'التكوين المتقدم',
  'Configure advanced settings for your agent':
    'تكوين الإعدادات المتقدمة لوكيلك',
  Provider: 'المزود',
  Model: 'النموذج',
  Temperature: 'درجة الحرارة',
  'Lower values = more focused, Higher values = more creative':
    'قيم أقل = أكثر تركيزاً، قيم أعلى = أكثر إبداعاً',
  'Creating...': 'جارٍ الإنشاء...',
  'Create Agent': 'إنشاء وكيل',
  'Reset Form': 'إعادة تعيين النموذج',
  'Live Preview': 'معاينة حية',
  Clear: 'مسح',
  'Start a conversation to test your agent': 'ابدأ محادثة لاختبار وكيلك',
  'The chat will use your current form configuration':
    'ستستخدم المحادثة تكوين النموذج الحالي الخاص بك',
  'Ask {agentName} something…': 'اسأل {agentName} شيئاً…',
  Send: 'إرسال',
  Current: 'الحالية', // current conversation
  'No conversation history yet. Start chatting with this agent to build history.':
    'لا يوجد سجل محادثات حتى الآن. ابدأ الدردشة مع هذا الوكيل لبناء السجل.',
  'No instructions defined.': 'لم يتم تعريف أي تعليمات.',
  'Global system instructions are also applied':
    'يتم تطبيق تعليمات النظام العامة أيضاً',
  '{count} messages': '{count} رسائل',
  Edit: 'تعديل',
  Save: 'حفظ',
  Cancel: 'إلغاء',
  'Edit System Prompt': 'تعديل طلب النظام',
  'System prompt updated successfully': 'تم تحديث طلب النظام بنجاح',
  'Enter agent role...': 'أدخل دور الوكيل...',
  'Enter agent instructions...': 'أدخل تعليمات الوكيل...',
  // Agent Context panel (unified Knowledge, Memories, Pinned)
  'Agent Context': 'سياق الوكيل',
  Files: 'الملفات',
  Memories: 'الذكريات',
  Messages: 'الرسائل',
  'Knowledge items updated successfully': 'تم تحديث عناصر المعرفة بنجاح',
  'Failed to update knowledge items': 'فشل في تحديث عناصر المعرفة',
  'Search knowledge items…': 'البحث في عناصر المعرفة…',
  'No knowledge items found.': 'لم يتم العثور على عناصر معرفة.',
  'Add files to your knowledge base': 'أضف ملفات إلى قاعدة المعرفة الخاصة بك',
  '{count} selected': '{count} محدد',
  'No knowledge items associated with this agent.':
    'لا توجد عناصر معرفة مرتبطة بهذا الوكيل.',
  'Add knowledge': 'إضافة معرفة',
  'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.':
    'لم يتم تعلم أي ذكريات بعد. ابدأ محادثات واستخدم "التعلم من المحادثة" لبناء ذاكرة الوكيل.',
  'No pinned messages yet. Pin important messages from conversations to make them available here.':
    'لا توجد رسائل مثبتة بعد. ثبت الرسائل المهمة من المحادثات لجعلها متاحة هنا.',
  'Start Live Conversation': 'بدء محادثة مباشرة',
  // Meta-prompting
  'Creation mode': 'وضع الإنشاء',
  'Describe Your Agent': 'صف وكيلك',
  'Manual Configuration': 'التكوين اليدوي',
  "Tell us what kind of agent you want, and we'll create it for you.":
    'أخبرنا بنوع الوكيل الذي تريده، وسننشئه لك.',
  'What agent do you need?': 'ما الوكيل الذي تحتاجه؟',
  'e.g., A friendly cooking assistant who specializes in Italian cuisine and can suggest wine pairings...':
    'مثال: مساعد طبخ ودود متخصص في المطبخ الإيطالي ويمكنه اقتراح أزواج النبيذ...',
  'Describe the agent you want to create. Be as specific as you like!':
    'صف الوكيل الذي تريد إنشاءه. كن محدداً كما تريد!',
  'Generating agent...': 'جارٍ إنشاء الوكيل...',
  'Generate Agent': 'إنشاء الوكيل',
  'Generating...': 'جارٍ الإنشاء...',
  'Or configure manually': 'أو التكوين يدوياً',
  'No AI provider configured. Please configure one in Settings.':
    'لم يتم تكوين مزود LLM. يرجى تكوين واحد في الإعدادات.',
  'Failed to generate agent configuration. Please try again.':
    'فشل في إنشاء تكوين الوكيل. يرجى المحاولة مرة أخرى.',
  'Generated configuration is missing required fields.':
    'التكوين المُنشأ يفتقد الحقول المطلوبة.',
  'Failed to generate agent. Please try again.':
    'فشل في إنشاء الوكيل. يرجى المحاولة مرة أخرى.',
  Tools: 'الأدوات',
  'No tools enabled for this agent.': 'لا توجد أدوات مُفعّلة لهذا الوكيل.',
  'Knowledge search': 'بحث المعرفة',
  // Trace/Tool display
  Duration: 'المدة',
  Tokens: 'الرموز',
  'Loading…': 'جاري التحميل…',
  'Processing step': 'خطوة المعالجة',
  'Processing Details': 'تفاصيل المعالجة',
  Status: 'الحالة',
  Cost: 'التكلفة',
  Input: 'الإدخال',
  Output: 'الإخراج',
  Steps: 'الخطوات',
  'Trace not found': 'لم يتم العثور على التتبع',
  Close: 'إغلاق',
  'View details': 'عرض التفاصيل',
  'View trace details': 'عرض تفاصيل التتبع',
  Error: 'خطأ',
  'View document': 'عرض المستند',
  // Tool display names
  'Searching knowledge base': 'البحث في قاعدة المعرفة',
  'Reading document': 'قراءة المستند',
  'Browsing documents': 'تصفح المستندات',
  'Summarizing document': 'تلخيص المستند',
  Calculating: 'الحساب',
  'Code interpreter': 'مفسر الكود',
  'Running code': 'تشغيل الكود',
  // Gmail tools
  'Searching Gmail': 'البحث في Gmail',
  'Reading email': 'قراءة البريد',
  'Listing Gmail labels': 'عرض تصنيفات Gmail',
  // Google Drive tools
  'Searching Google Drive': 'البحث في Google Drive',
  'Reading file from Drive': 'قراءة ملف من Drive',
  'Listing Drive files': 'عرض ملفات Drive',
  // Google Calendar tools
  'Listing calendar events': 'عرض أحداث التقويم',
  'Getting calendar event': 'جلب حدث التقويم',
  'Searching calendar': 'البحث في التقويم',
  // Google Tasks tools
  'Listing tasks': 'عرض المهام',
  'Getting task details': 'تفاصيل المهمة',
  'Listing task lists': 'عرض قوائم المهام',
  // Notion tools
  'Searching Notion': 'البحث في Notion',
  'Reading Notion page': 'قراءة صفحة Notion',
  'Querying Notion database': 'استعلام قاعدة بيانات Notion',
  // Generic tool messages
  'Using tool': 'استخدام الأداة',
  'Using tools': 'استخدام الأدوات',
  // Tool labels
  'Search Knowledge': 'بحث في المعرفة',
  'Read Document': 'قراءة مستند',
  'List Documents': 'قائمة المستندات',
  'Get Document Summary': 'الحصول على ملخص',
  Calculate: 'حساب',
  // Search results
  result: 'نتيجة',
  results: 'نتائج',
  // Sources
  Sources: 'المصادر',
  'View in Knowledge Base': 'عرض في قاعدة المعرفة',
  // Quick replies
  'Generating suggestions…': 'جارٍ إنشاء الاقتراحات…',
  // Tools display
  'No tools available.': 'لا توجد أدوات متاحة.',
  '{count} tools available': '{count} أدوات متاحة',
  'connected services': 'الخدمات المتصلة',
  Knowledge: 'المعرفة',
  Math: 'الرياضيات',
  Code: 'الكود',
  Presentation: 'العرض التقديمي',
  Research: 'البحث',
  Connectors: 'الموصلات',
  'Execute Code': 'تنفيذ الكود',
  'Generate Presentation': 'إنشاء عرض تقديمي',
  // Status messages
  'Starting autonomous task orchestration…': 'بدء تنسيق المهام التلقائي…',
  'Orchestration failed: {error}': 'فشل التنسيق: {error}',
  'Found relevant information, processing…':
    'تم العثور على معلومات ذات صلة، جارٍ المعالجة…',
  'Using tools…': 'جارٍ استخدام الأدوات…',
  'Using tool: {tool}…': 'جارٍ استخدام الأداة: {tool}…',
  // Recent conversations
  'Recent conversations': 'المحادثات الأخيرة',
} as const
