import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Platform Settings': 'إعدادات المنصة',
  'Configure AI providers, models and platform defaults for your organization':
    'تكوين مزودات LLM والنماذج والإعدادات الافتراضية للمنصة لمؤسستك',
  Appearance: 'المظهر',
  'Choose your preferred language': 'اختر لغتك المفضلة',
  'Interface Language': 'لغة الواجهة',
  'Platform Name': 'اسم المنصة',
  'Secure Storage': 'التخزين الآمن',
  'Manage your encryption keys and secure storage':
    'إدارة مفاتيح التشفير والتخزين الآمن',
  'Master Key': 'المفتاح الرئيسي',
  'Master key copied to clipboard': 'تم نسخ المفتاح الرئيسي إلى الحافظة',
  'Failed to copy master key': 'فشل نسخ المفتاح الرئيسي',
  'Regenerate Master Key': 'إعادة إنشاء المفتاح الرئيسي',
  'Are you sure you want to regenerate the master key? This will invalidate all existing encrypted data.':
    'هل أنت متأكد من رغبتك في إعادة إنشاء المفتاح الرئيسي؟ سيؤدي هذا إلى إبطال جميع البيانات المشفرة الموجودة.',
  'Master key regenerated successfully': 'تم إعادة إنشاء المفتاح الرئيسي بنجاح',
  'Failed to regenerate master key': 'فشل إعادة إنشاء المفتاح الرئيسي',
  'Your master key is used to encrypt all sensitive data stored locally. Keep it safe and secure.':
    'يُستخدم المفتاح الرئيسي لتشفير جميع البيانات الحساسة المخزنة محلياً. احتفظ به آمناً.',
  'AI Providers': 'مزودات LLM',
  'Choose your AI provider, manage your API credentials':
    'اختر مزود LLM الخاص بك، وأدر بيانات اعتماد API',
  'Add Provider': 'إضافة مزود',
  'No providers configured. Add one to get started.':
    'لم يتم تكوين مزودات. أضف واحداً للبدء.',
  'Set as Default': 'تعيين كافتراضي',
  'Secure storage is locked': 'التخزين الآمن مقفل',
  'Enter your master password to unlock':
    'أدخل كلمة المرور الرئيسية لفتح القفل',
  'Master password': 'كلمة المرور الرئيسية',
  Unlock: 'فتح القفل',
  'Storage unlocked': 'تم فتح قفل التخزين',
  'Invalid password': 'كلمة مرور غير صالحة',
  'Please fill in all required fields': 'يرجى ملء جميع الحقول المطلوبة',
  'Invalid API key': 'مفتاح API غير صالح',
  'Credential added successfully': 'تمت إضافة بيانات الاعتماد بنجاح',
  'Failed to add credential': 'فشلت إضافة بيانات الاعتماد',
  'Credential deleted': 'تم حذف بيانات الاعتماد',
  'Failed to delete credential': 'فشل حذف بيانات الاعتماد',
  'Database Management': 'إدارة قاعدة البيانات',
  'Export, import, or clear your local database':
    'تصدير أو استيراد أو مسح قاعدة البيانات المحلية',
  'Clear database': 'مسح قاعدة البيانات',
  'Are you sure you want to clear all data? This action cannot be undone.':
    'هل أنت متأكد من رغبتك في مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.',
  'Database cleared successfully': 'تم مسح قاعدة البيانات بنجاح',
  'Failed to clear database': 'فشل مسح قاعدة البيانات',
  'Database repaired successfully': 'تم إصلاح قاعدة البيانات بنجاح',
  'Failed to repair database': 'فشل إصلاح قاعدة البيانات',
  Created: 'تم الإنشاء',
  Updated: 'تم التحديث',
  'Add LLM Provider': 'إضافة مزود LLM',
  'Select Provider': 'اختر المزود',
  'Server URL (Optional)': 'رابط الخادم (اختياري)',
  'API Key': 'مفتاح API',
  'Enter your API key': 'أدخل مفتاح API الخاص بك',
  'Format:': 'التنسيق:',
  'Base URL': 'الرابط الأساسي',
  Model: 'النموذج',
  'Select a model': 'اختر نموذجاً',
  'Custom Model Name': 'اسم نموذج مخصص',
  'Enter model name': 'أدخل اسم النموذج',
  'Validate & Add': 'التحقق والإضافة',
  'Fetch Available Models': 'جلب النماذج المتاحة',
  'Use Fetched Models': 'استخدام النماذج المجلوبة',
  'Manual Input': 'الإدخال اليدوي',
  'Model Name': 'اسم النموذج',
  'Enter the exact name of the model you want to use':
    'أدخل الاسم الدقيق للنموذج الذي تريد استخدامه',
  'Available Models': 'النماذج المتاحة',
  'Default Provider': 'المزود الافتراضي',
  'Provider set as default': 'تم تعيين المزود كافتراضي',
  'Advanced Settings': 'الإعدادات المتقدمة',
  '{files} files cached ({size})': '{files} ملفات مخزنة مؤقتاً ({size})',
  'Local models cache': 'ذاكرة التخزين المؤقت للنماذج المحلية',
  'Clear cache': 'مسح ذاكرة التخزين المؤقت',
  'Downloaded models are cached for 1 year to avoid re-downloading.':
    'يتم تخزين النماذج المحملة مؤقتاً لمدة سنة واحدة لتجنب إعادة التحميل.',
  'Local LLMs run entirely in your browser':
    'تعمل LLM المحلية بالكامل في متصفحك',
  'No data is sent to external servers. Download happens at first use.':
    'لا يتم إرسال بيانات إلى خوادم خارجية. يحدث التحميل عند الاستخدام الأول.',
  'Requirements:': 'المتطلبات:',
  'WebGPU support': 'دعم WebGPU',
  'At least 8GB of RAM': 'على الأقل 8 جيجابايت من ذاكرة الوصول العشوائي',
  'Storage space for model files (2-4GB)':
    'مساحة تخزين لملفات النموذج (2-4 جيجابايت)',
  'Your device:': 'جهازك:',
  'WebGPU:': 'WebGPU:',
  'Brand: {brand}': 'العلامة التجارية: {brand}',
  'Model: {model}': 'النموذج: {model}',
  'Memory: {memory} or more (imprecise)':
    'الذاكرة: {memory} أو أكثر (غير دقيق)',
  'Vendor: {vendor}': 'البائع: {vendor}',
  'Browser: {browser}': 'المتصفح: {browser}',
  'Enable Speech-to-Text': 'تفعيل تحويل الكلام إلى نص',
  'Allow voice input using your device microphone in the prompt area':
    'السماح بإدخال الصوت باستخدام ميكروفون جهازك في منطقة الطلب',
  'Hide Default Agents': 'إخفاء الوكلاء الافتراضيين',
  'Only show your custom agents in the agent picker and agents page':
    'إظهار الوكلاء المخصصين فقط في منتقي الوكلاء وصفحة الوكلاء',
  Features: 'الميزات',
  Voice: 'الصوت',
  'Configure how you interact with agents': 'قم بتكوين كيفية تفاعلك مع الوكلاء',
  'Auto Memory Learning': 'التعلم الآلي للذاكرة',
  'Automatically extract learnable information from conversations to build agent memory':
    'استخراج المعلومات القابلة للتعلم تلقائياً من المحادثات لبناء ذاكرة الوكيل',
  'Quick Reply Suggestions': 'اقتراحات الرد السريع',
  'Show AI-generated follow-up suggestions after each assistant response':
    'عرض اقتراحات المتابعة المولّدة بالذكاء الاصطناعي بعد كل استجابة للمساعد',
  'Web Search Grounding': 'التثبيت عبر البحث في الويب',
  'Allow AI models to search the web for up-to-date information (supported by Google Gemini and Anthropic Claude)':
    'السماح لنماذج الذكاء الاصطناعي بالبحث في الويب عن معلومات محدّثة (مدعوم من Google Gemini و Anthropic Claude)',
  'Global System Instructions': 'تعليمات النظام العامة',
  "These instructions will be prepended to every agent's instructions":
    'ستتم إضافة هذه التعليمات في بداية تعليمات كل وكيل',
  'Enter global instructions that apply to all agents...':
    'أدخل التعليمات العامة التي تنطبق على جميع الوكلاء...',
  'Show Context Panel': 'إظهار لوحة السياق',
  'Display the contextual information panel on the right side of the screen':
    'عرض لوحة المعلومات السياقية على الجانب الأيمن من الشاشة',
  'Make the platform your own': 'اجعل المنصة خاصة بك',
  'Share the platform': 'مشاركة المنصة',
  'Export the platform settings to another device or share it with others':
    'تصدير إعدادات المنصة إلى جهاز آخر أو مشاركتها مع الآخرين',
  'Sync your data across devices using peer-to-peer connection':
    'مزامنة بياناتك عبر الأجهزة باستخدام اتصال نظير إلى نظير',
  'Server URL': 'عنوان URL للخادم',
  'URL of your Ollama server': 'عنوان URL لخادم Ollama الخاص بك',
  'Get your API key from': 'احصل على مفتاح API من',
  'Enter model name manually': 'أدخل اسم النموذج يدوياً',
  'Fetching available models...': 'جاري جلب النماذج المتاحة...',
  'Enter the model name manually': 'أدخل اسم النموذج يدوياً',
  'models available': 'نماذج متاحة',
  'This provider is already configured': 'هذا المزود مُعدّ بالفعل',
  Computer: 'الحاسوب',
  'Sandbox runtimes and system resources': 'بيئات تشغيل العزل وموارد النظام',
  'Sandbox Runtimes': 'بيئات تشغيل العزل',
  Running: 'قيد التشغيل',
  Executing: 'قيد التنفيذ',
  Loading: 'جاري التحميل',
  Idle: 'خامل',
  Error: 'خطأ',
  Start: 'تشغيل',
  Stop: 'إيقاف',
  'Pre-load the {runtime} runtime': 'تحميل بيئة {runtime} مسبقاً',
  'Terminate the {runtime} runtime': 'إنهاء بيئة تشغيل {runtime}',
  'Run a test snippet in the {runtime} sandbox':
    'تشغيل مقتطف اختباري في بيئة {runtime} المعزولة',
  Try: 'تجربة',
  'Isolated code execution environments running entirely in WebAssembly. Python uses a Web Worker; JavaScript runs in a lightweight QuickJS VM.':
    'بيئات تنفيذ شيفرة معزولة تعمل بالكامل في WebAssembly. يستخدم Python عامل ويب؛ ويعمل JavaScript في آلة QuickJS افتراضية خفيفة.',
  CPU: 'المعالج',
  '{used} / {total} cores': '{used} / {total} أنوية',
  'CPU usage': 'استخدام المعالج',
  Memory: 'الذاكرة',
  'Memory usage': 'استخدام الذاكرة',
  Storage: 'التخزين',
  'Storage usage': 'استخدام التخزين',
  'Device Information': 'معلومات الجهاز',
  Device: 'الجهاز',
  'GPU Vendor': 'مصنّع GPU',
  'GPU Renderer': 'معالج GPU',
  WebGPU: 'WebGPU',
  Supported: 'مدعوم',
  'Not Supported': 'غير مدعوم',
  'Local LLM (Browser)': 'LLM محلي (المتصفح)',
  'Runs AI models entirely in your browser using WebGPU. No data is sent to external servers.':
    'يشغّل نماذج الذكاء الاصطناعي بالكامل في متصفحك باستخدام WebGPU. لا يتم إرسال بيانات إلى خوادم خارجية.',
  'Default Model': 'النموذج الافتراضي',
  'Loaded Model': 'النموذج المحمّل',
  'No model loaded': 'لا يوجد نموذج محمّل',
  Unload: 'إلغاء التحميل',
  'Unload model to free memory': 'إلغاء تحميل النموذج لتحرير الذاكرة',
  'WebGPU is not supported on this device. Local LLM inference requires a WebGPU-compatible browser.':
    'WebGPU غير مدعوم على هذا الجهاز. يتطلب استدلال LLM المحلي متصفحاً متوافقاً مع WebGPU.',
  'Your device has less than 8GB of RAM. Local inference may be slow or unavailable for larger models.':
    'جهازك يحتوي على أقل من 8 جيجابايت من الذاكرة. قد يكون الاستدلال المحلي بطيئاً أو غير متاح للنماذج الأكبر.',

  'System Resources': 'موارد النظام',
  Skills: 'المهارات',
  'Discover, install, and manage specialized skills for your agents':
    'اكتشف وثبّت وأدِر المهارات المتخصصة لوكلائك',
  'Agent Memory': 'ذاكرة الوكلاء',
  'Pinned Messages': 'الرسائل المثبتة',
  General: 'عام',
  Extend: 'توسيع',
  Monitor: 'مراقبة',
  Configure: 'تهيئة',
  Personalize: 'تخصيص',
  Observe: 'مراقبة',
  'How to connect': 'كيفية الاتصال',
  'Open {provider}': 'فتح {provider}',
  "Sign in or create an account on the provider's website.":
    'سجّل الدخول أو أنشئ حساباً على موقع المزود.',
  'Create a new API key in your account dashboard.':
    'أنشئ مفتاح API جديداً في لوحة تحكم حسابك.',
  'Copy the key and come back here to paste it below.':
    'انسخ المفتاح وعُد هنا للصقه أدناه.',
  'Enter your credentials': 'أدخل بيانات اعتمادك',
  'Your key is stored locally and encrypted. It never leaves your device.':
    'يتم تخزين مفتاحك محلياً وتشفيره. لن يغادر جهازك أبداً.',
  Preserve: 'حفظ',
  'Local Backup': 'نسخة احتياطية محلية',
  Sync: 'مزامنة',
  'Color Scheme': 'نظام الألوان',
  'Choose a color scheme for the interface': 'اختر نظام ألوان للواجهة',
} as const
