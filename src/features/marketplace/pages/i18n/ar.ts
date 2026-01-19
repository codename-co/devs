import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Page titles
  Marketplace: 'السوق',
  'Expand your platform capabilities with community extensions':
    'قم بتوسيع قدرات منصتك باستخدام امتدادات المجتمع',
  'Find and install apps, agents, connectors, and tools from the community':
    'ابحث وثبّت التطبيقات والوكلاء والموصلات والأدوات من المجتمع',

  // Tabs
  All: 'الكل',
  Apps: 'التطبيقات',
  Agents: 'الوكلاء',
  Connectors: 'الموصلات',
  Tools: 'الأدوات',
  Installed: 'المثبتة',
  Available: 'متاح',

  // Search
  'Search extensions...': 'البحث عن إضافات...',
  'No description found': 'لم يتم العثور على وصف',
  'Try a different search term': 'جرّب مصطلح بحث مختلف',

  // Categories
  Categories: 'الفئات',
  Productivity: 'الإنتاجية',
  Development: 'التطوير',
  Communication: 'التواصل',
  'Data & Analytics': 'البيانات والتحليلات',
  'AI & Machine Learning': 'الذكاء الاصطناعي وتعلم الآلة',
  Utilities: 'الأدوات المساعدة',

  // Filters
  Filter: 'تصفية',
  'Sort by': 'ترتيب حسب',
  'Most popular': 'الأكثر شعبية',
  'Recently updated': 'المحدثة مؤخراً',
  'Highest rated': 'الأعلى تقييماً',
  Newest: 'الأحدث',
  Alphabetical: 'أبجدياً',

  // Extension Card
  Install: 'تثبيت',
  'Update available': 'تحديث متاح',
  Update: 'تحديث',
  Uninstall: 'إلغاء التثبيت',
  Configure: 'تكوين',
  Enable: 'تفعيل',
  Disable: 'تعطيل',
  Verified: 'موثق',
  Official: 'رسمي',
  Community: 'مجتمع',
  '{n} downloads': '{n} تنزيل',
  '{n} reviews': '{n} مراجعة',
  Free: 'مجاني',
  Premium: 'مميز',

  // Extension Detail
  Overview: 'نظرة عامة',
  Reviews: 'المراجعات',
  Changelog: 'سجل التغييرات',
  Documentation: 'التوثيق',
  'Version {v}': 'الإصدار {v}',
  'Last updated': 'آخر تحديث',
  Author: 'المؤلف',
  License: 'الترخيص',
  Website: 'الموقع',
  'Report issue': 'الإبلاغ عن مشكلة',
  'View source': 'عرض الكود المصدري',
  Permissions: 'الأذونات',
  'This extension requires:': 'تتطلب هذه الإضافة:',
  Dependencies: 'التبعيات',
  'Requires these extensions:': 'تتطلب هذه الإضافات:',
  Screenshots: 'لقطات الشاشة',
  'Similar extensions': 'إضافات مشابهة',

  // Reviews
  'Write a review': 'كتابة مراجعة',
  Rating: 'التقييم',
  'Your review': 'مراجعتك',
  'Submit review': 'إرسال المراجعة',
  Helpful: 'مفيد',
  '{n} people found this helpful': '{n} شخص وجد هذا مفيداً',
  'Report review': 'الإبلاغ عن المراجعة',

  // Install flow
  'Installing...': 'جارٍ التثبيت...',
  'Installation complete': 'اكتمل التثبيت',
  'Installation failed': 'فشل التثبيت',
  'This extension requires the following permissions:':
    'تتطلب هذه الإضافة الأذونات التالية:',
  Allow: 'السماح',
  Deny: 'رفض',
  Cancel: 'إلغاء',
  'Confirm installation': 'تأكيد التثبيت',

  // Publish
  'Publish Extension': 'نشر إضافة',
  'Share your extension with the community': 'شارك إضافتك مع المجتمع',
  'Create New Extension': 'إنشاء إضافة جديدة',
  'Upload Extension': 'رفع إضافة',
  'Upload a .yaml or .devs file': 'ارفع ملف .yaml أو .devs',
  'Drop your extension file here': 'اسحب ملف الإضافة هنا',
  'Or browse files': 'أو تصفح الملفات',
  Validate: 'التحقق',
  'Validating...': 'جارٍ التحقق...',
  'Validation successful': 'نجح التحقق',
  'Validation failed': 'فشل التحقق',
  'Fix the following issues:': 'أصلح المشاكل التالية:',
  Publish: 'نشر',
  'Publishing...': 'جارٍ النشر...',
  'Published successfully': 'تم النشر بنجاح',
  'Publish failed': 'فشل النشر',
  Draft: 'مسودة',
  Published: 'منشور',
  'Under review': 'قيد المراجعة',
  Rejected: 'مرفوض',
  Edit: 'تعديل',
  Delete: 'حذف',
  Unpublish: 'إلغاء النشر',
  'View in marketplace': 'عرض في السوق',

  // Empty states
  'No extensions found': 'لم يتم العثور على إضافات',
  'Be the first to publish an extension!': 'كن أول من ينشر إضافة!',
  'No installed extensions': 'لا توجد إضافات مثبتة',
  'Browse the marketplace to find useful extensions':
    'تصفح السوق للعثور على إضافات مفيدة',
  'No apps available': 'لا تتوفر تطبيقات',
  'No agents available': 'لا يتوفر وكلاء',
  'No connectors available': 'لا تتوفر موصلات',
  'No tools available': 'لا تتوفر أدوات',

  // Coming soon placeholder
  'Coming Soon': 'قريباً',
  'The DEVS Marketplace is under development': 'سوق DEVS قيد التطوير',
  "Soon you'll be able to discover and install community-built apps, agents, connectors, and tools.":
    'قريباً ستتمكن من اكتشاف وتثبيت التطبيقات والوكلاء والموصلات والأدوات التي أنشأها المجتمع.',
  "Want to be notified when it's ready?":
    'هل تريد أن يتم إعلامك عندما يصبح جاهزاً؟',
  'Join the waitlist': 'انضم إلى قائمة الانتظار',
  'Learn more about building extensions': 'تعرف على المزيد حول إنشاء الإضافات',

  // Trust levels
  Unverified: 'غير موثق',
  'This extension has been reviewed and verified by DEVS':
    'تم مراجعة هذه الإضافة والتحقق منها بواسطة DEVS',
  'This extension is developed by the DEVS team':
    'تم تطوير هذه الإضافة بواسطة فريق DEVS',
  'This extension has not been reviewed yet': 'لم تتم مراجعة هذه الإضافة بعد',
  'This extension is community-maintained':
    'يتم صيانة هذه الإضافة بواسطة المجتمع',

  // Translation Page
  Translation: 'الترجمة',
  'Translate text using local AI':
    'ترجمة النص باستخدام الذكاء الاصطناعي المحلي',
  'Source Language': 'لغة المصدر',
  'Target Language': 'لغة الهدف',
  'Detected language: {lang}': 'اللغة المكتشفة: {lang}',
  'Type more text to detect language...':
    'اكتب المزيد من النص لاكتشاف اللغة...',
  'Swap languages': 'تبديل اللغات',
  'Enter text to translate': 'أدخل النص للترجمة',
  'Type or paste text here...': 'اكتب أو الصق النص هنا...',
  'Translation will appear here...': 'ستظهر الترجمة هنا...',
  'Copy translation': 'نسخ الترجمة',
  Translate: 'ترجمة',
  'Translating...': 'جارٍ الترجمة...',
  Clear: 'مسح',
  'Translation failed. Please try again.':
    'فشلت الترجمة. يرجى المحاولة مرة أخرى.',

  // Extension Detail Modal
  'Extension type': 'نوع الإضافة',
  Copy: 'نسخ',
  'Open in new tab': 'فتح في علامة تبويب جديدة',
  'Privacy Policy': 'سياسة الخصوصية',

  // Hero Banner
  'Supercharge your AI workflows': 'عزز سير عمل الذكاء الاصطناعي لديك',
  'One-click install': 'تثبيت بنقرة واحدة',
  'Community-driven': 'يقوده المجتمع',
  '100% open source': 'مفتوح المصدر 100%',
  'Build my own extension': 'أنشئ إضافتك الخاصة',

  // New Extension Page
  'Create Extension': 'إنشاء إضافة',
  'Generate a custom extension using AI':
    'إنشاء إضافة مخصصة باستخدام الذكاء الاصطناعي',
  'Back to Marketplace': 'العودة إلى السوق',
  'Build with AI': 'البناء بالذكاء الاصطناعي',
  'Describe what you want to create and let AI generate a fully functional extension for you.':
    'صف ما تريد إنشاءه ودع الذكاء الاصطناعي ينشئ إضافة وظيفية كاملة لك.',
  'Step 1': 'الخطوة 1',
  'Step 2': 'الخطوة 2',
  'Choose extension type': 'اختر نوع الإضافة',
  'Describe your extension': 'صف إضافتك',
  App: 'تطبيق',
  'Full UI applications with interactive pages':
    'تطبيقات واجهة مستخدم كاملة مع صفحات تفاعلية',
  'A pomodoro timer app, a habit tracker, a mood journal with charts':
    'تطبيق مؤقت بومودورو، متتبع عادات، مذكرات مزاج مع رسوم بيانية',
  Agent: 'وكيل',
  'AI agents with specialized instructions and personality':
    'وكلاء ذكاء اصطناعي بتعليمات متخصصة وشخصية',
  'A code reviewer agent, a writing coach, a data analysis specialist':
    'وكيل مراجعة الكود، مدرب كتابة، متخصص تحليل البيانات',
  Connector: 'موصل',
  'Integrations with external services and APIs':
    'تكاملات مع الخدمات الخارجية وواجهات برمجة التطبيقات',
  'A GitHub integration, a Slack connector, a weather data provider':
    'تكامل GitHub، موصل Slack، مزود بيانات الطقس',
  Tool: 'أداة',
  'Utility functions that agents can use':
    'وظائف مساعدة يمكن للوكلاء استخدامها',
  'A URL shortener, a JSON formatter, a unit converter, a calculator':
    'مختصر روابط، منسق JSON، محول وحدات، آلة حاسبة',
  Examples: 'أمثلة',
  'Describe what your extension should do, its features, and how it should look...':
    'صف ما يجب أن تفعله إضافتك، ميزاتها، وكيف يجب أن تبدو...',
  'Tips for better results': 'نصائح لنتائج أفضل',
  'Be specific about the features you want':
    'كن محدداً بشأن الميزات التي تريدها',
  'Mention any UI preferences (colors, layout)':
    'اذكر أي تفضيلات للواجهة (الألوان، التخطيط)',
  'Include example use cases': 'تضمين أمثلة على حالات الاستخدام',
  'Describe the target users': 'صف المستخدمين المستهدفين',
  'Please provide a description for your extension': 'يرجى تقديم وصف لإضافتك',
  'Failed to generate extension': 'فشل في إنشاء الإضافة',
  'Extension created successfully!': 'تم إنشاء الإضافة بنجاح!',
  'Generate Extension': 'إنشاء الإضافة',
  'Generating...': 'جارٍ الإنشاء...',
  'Creating your extension...': 'جارٍ إنشاء إضافتك...',
  'This may take a few seconds': 'قد يستغرق هذا بضع ثوانٍ',

  // Custom Extensions
  Custom: 'مخصص',
  'AI-generated': 'مُنشأ بالذكاء الاصطناعي',
  'My extensions': 'إضافاتي',

  // Extension Editor Page
  'Edit and refine your extension': 'تعديل وتحسين إضافتك',
  'Extension not found': 'الإضافة غير موجودة',
  'Editor tabs': 'علامات تبويب المحرر',
  Preview: 'معاينة',
  Code: 'الكود',
  Chat: 'محادثة',
  Save: 'حفظ',
  Done: 'تم',
  Unsaved: 'غير محفوظ',
  'Extension saved': 'تم حفظ الإضافة',
  'Failed to save extension': 'فشل في حفظ الإضافة',
  'Failed to load extension': 'فشل في تحميل الإضافة',
  'You have unsaved changes. Save before leaving?':
    'لديك تغييرات غير محفوظة. هل تريد الحفظ قبل المغادرة؟',
  "Your extension has been created! You can preview it, edit the code directly, or describe changes you'd like me to make.":
    'تم إنشاء إضافتك! يمكنك معاينتها أو تعديل الكود مباشرة أو وصف التغييرات التي تريدني إجراءها.',
  "Describe changes you'd like to make": 'صف التغييرات التي تريد إجراءها',
  'The AI will help you refine your extension':
    'سيساعدك الذكاء الاصطناعي في تحسين إضافتك',
  "Describe what you'd like to change...": 'صف ما تريد تغييره...',
  Send: 'إرسال',
  'AI-suggested code changes are automatically applied':
    'يتم تطبيق تغييرات الكود المقترحة من الذكاء الاصطناعي تلقائياً',
  'No LLM provider configured': 'لم يتم تكوين مزود LLM',
  'Unknown error': 'خطأ غير معروف',
  'Sorry, I encountered an error: {error}': 'عذراً، واجهت خطأ: {error}',
  'Code applied successfully!': 'تم تطبيق الكود بنجاح!',
  'Code changes applied': 'تم تطبيق تغييرات الكود',
  'Sorry, I encountered an error parsing the code changes.':
    'عذراً، واجهت خطأ في تحليل تغييرات الكود.',

  // Delete extension
  'Delete extension': 'حذف الإضافة',
  'Are you sure you want to delete this extension?':
    'هل أنت متأكد من رغبتك في حذف هذه الإضافة؟',
  'This action cannot be undone.': 'لا يمكن التراجع عن هذا الإجراء.',

  // Duplicate extension
  'Duplicate & edit': 'تكرار وتعديل',

  // Manual creation
  'or create manually': 'أو إنشاء يدويًا',
}
