import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Page
  Connectors: 'الموصلات',
  'Connect external services to your knowledge base':
    'قم بتوصيل خدمات خارجية بقاعدة معرفتك',
  'Sync files and data from your favorite apps and services.':
    'قم بمزامنة الملفات والبيانات من تطبيقاتك وخدماتك المفضلة.',
  'Add Connector': 'إضافة موصل',

  // Tabs
  Apps: 'التطبيقات',
  APIs: 'واجهات برمجة التطبيقات',
  MCPs: 'MCPs',
  'Coming soon': 'قريباً',

  // ConnectorCard
  Connected: 'متصل',
  Error: 'خطأ',
  Expired: 'منتهي الصلاحية',
  'Syncing...': 'جارٍ المزامنة...',
  'Never synced': 'لم تتم المزامنة مطلقاً',
  'Just now': 'الآن',
  '{n} minutes ago': 'منذ {n} دقائق',
  '{n} hours ago': 'منذ {n} ساعات',
  '{n} days ago': 'منذ {n} أيام',
  'Last sync:': 'آخر مزامنة:',
  '{n} folders syncing': '{n} مجلدات قيد المزامنة',
  '{n} tools': '{n} أدوات',
  'Sync Now': 'مزامنة الآن',
  'More options': 'خيارات إضافية',
  'Connector actions': 'إجراءات الموصل',
  Settings: 'الإعدادات',
  Disconnect: 'قطع الاتصال',
  Sync: 'مزامنة',
  'Sync disabled': 'المزامنة معطلة',

  // Empty state
  'No connectors yet': 'لا توجد موصلات بعد',
  'No app connectors yet': 'لا توجد موصلات تطبيقات بعد',
  'Connect external services to give your agents powerful tools for searching, reading, and interacting with your data.':
    'قم بتوصيل خدمات خارجية لمنح وكلائك أدوات قوية للبحث والقراءة والتفاعل مع بياناتك.',
  'No API connectors yet': 'لا توجد موصلات API بعد',
  'Connect custom REST or GraphQL APIs to extend agent capabilities.':
    'قم بتوصيل واجهات برمجة التطبيقات REST أو GraphQL المخصصة لتوسيع قدرات الوكلاء.',
  'No MCP connectors yet': 'لا توجد موصلات MCP بعد',
  'Connect Model Context Protocol servers to extend agent capabilities.':
    'قم بتوصيل خوادم Model Context Protocol لتوسيع قدرات الوكلاء.',
  'Add your first connector': 'أضف موصلك الأول',

  // Wizard - Provider Selection
  'Choose a service to connect to your knowledge base:':
    'اختر خدمة لتوصيلها بقاعدة معرفتك:',
  'Choose a service to connect to your knowledge base':
    'اختر خدمة لتوصيلها بقاعدة معرفتك',
  'Select a Service': 'اختر خدمة',

  // Wizard - OAuth Step
  'Connecting...': 'جارٍ الاتصال...',
  'Connecting to {name}...': 'جارٍ الاتصال بـ {name}...',
  'Connect {name}': 'توصيل {name}',
  'Connect to {name}': 'الاتصال بـ {name}',
  'A new window will open for you to authorize access. Please complete the authorization to continue.':
    'ستفتح نافذة جديدة للسماح بالوصول. يرجى إكمال التفويض للمتابعة.',
  'You will be redirected to {name} to authorize DEVS to access your data. Your credentials are never stored on our servers.':
    'ستتم إعادة توجيهك إلى {name} لتفويض DEVS للوصول إلى بياناتك. لن يتم تخزين بيانات اعتمادك على خوادمنا أبداً.',
  'This connector will be able to:': 'سيتمكن هذا الموصل من:',
  'Read your files and content': 'قراءة ملفاتك ومحتواك',
  'Search your content': 'البحث في محتواك',
  'Sync changes automatically': 'مزامنة التغييرات تلقائياً',
  'Authenticating...': 'جارٍ المصادقة...',
  'Connection Failed': 'فشل الاتصال',
  'Connection failed': 'فشل الاتصال',
  'Something went wrong while connecting. Please try again.':
    'حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.',
  'Successfully authenticated': 'تمت المصادقة بنجاح',
  'Authentication failed': 'فشلت المصادقة',
  'Authentication successful': 'نجحت المصادقة',
  Authenticate: 'مصادقة',

  // Wizard - Folder Selection
  'Select Folders': 'اختر المجلدات',
  'Select folders to sync': 'اختر المجلدات للمزامنة',
  'Add files to sync': 'أضف ملفات للمزامنة',
  'Paste file URLs or IDs from {name} to sync.':
    'الصق روابط أو معرفات الملفات من {name} للمزامنة.',
  'Enter URLs or IDs (one per line)': 'أدخل الروابط أو المعرفات (واحد لكل سطر)',
  'Enter file URLs or IDs, one per line':
    'أدخل روابط أو معرفات الملفات، واحد لكل سطر',
  '{n} items to sync': '{n} عناصر للمزامنة',
  'Choose which folders you want to sync from {name}, or sync everything.':
    'اختر المجلدات التي تريد مزامنتها من {name}، أو قم بمزامنة كل شيء.',
  'Sync everything': 'مزامنة كل شيء',
  'All files and folders will be synced automatically':
    'سيتم مزامنة جميع الملفات والمجلدات تلقائياً',
  'Loading folders...': 'جارٍ تحميل المجلدات...',
  'No folders found': 'لم يتم العثور على مجلدات',
  '{n} folders selected': 'تم اختيار {n} مجلدات',
  Skip: 'تخطي',
  Continue: 'متابعة',

  // Wizard - Success
  'Connected!': 'تم الاتصال!',
  'Successfully connected!': 'تم الاتصال بنجاح!',
  '{name} has been connected to your knowledge base.':
    'تم توصيل {name} بقاعدة معرفتك.',
  '{name} has been connected.': 'تم توصيل {name}.',
  '{name} has been connected to your knowledge base. Files will begin syncing shortly.':
    'تم توصيل {name} بقاعدة معرفتك. ستبدأ مزامنة الملفات قريباً.',
  '{name} has been successfully connected': 'تم توصيل {name} بنجاح',
  '{name} connected successfully': 'تم توصيل {name} بنجاح',
  'Connected and authorized': 'متصل ومصرح به',
  'Connected as {email}': 'متصل باسم {email}',
  'Syncing all files': 'مزامنة جميع الملفات',
  'Auto-sync enabled': 'المزامنة التلقائية مفعلة',
  'Automatic sync will begin shortly': 'ستبدأ المزامنة التلقائية قريباً',
  'Start Sync Now': 'بدء المزامنة الآن',
  'Connector Added': 'تمت إضافة الموصل',

  // Wizard - Progress
  'Step {current} of {total}': 'الخطوة {current} من {total}',
  'Wizard progress': 'تقدم المعالج',

  // Sync Status
  'Sync completed': 'اكتملت المزامنة',
  '{n} items synced': 'تمت مزامنة {n} عناصر',
  'Sync failed': 'فشلت المزامنة',
  'Unknown error': 'خطأ غير معروف',

  // Settings Modal
  '{name} Settings': 'إعدادات {name}',
  'Connected Account': 'الحساب المتصل',
  'Available Tools': 'الأدوات المتاحة',
  'Agent Tools': 'أدوات الوكلاء',
  'These tools are available to your agents for searching, reading, and interacting with your data.':
    'هذه الأدوات متاحة لوكلائك للبحث والقراءة والتفاعل مع بياناتك.',
  '{n} tools available for AI agents':
    '{n} أدوات متاحة لوكلاء الذكاء الاصطناعي',
  'Enable Sync': 'تفعيل المزامنة',
  'Enable Automatic Sync': 'تفعيل المزامنة التلقائية',
  'Automatically sync content from this connector':
    'مزامنة المحتوى تلقائياً من هذا الموصل',
  'Automatically sync new and updated content':
    'مزامنة المحتوى الجديد والمحدث تلقائياً',
  'Sync Settings': 'إعدادات المزامنة',
  'Knowledge Base Sync': 'مزامنة قاعدة المعرفة',
  'Optionally sync content to your knowledge base':
    'قم بمزامنة المحتوى اختياريًا إلى قاعدة معرفتك',
  Enabled: 'مفعّل',
  Disabled: 'معطّل',
  'Sync Interval (minutes)': 'فترة المزامنة (بالدقائق)',
  'How often to check for changes': 'عدد مرات التحقق من التغييرات',
  'Choose which folders to sync or sync everything':
    'اختر المجلدات للمزامنة أو قم بمزامنة كل شيء',
  'Settings saved': 'تم حفظ الإعدادات',
  'Connector settings have been updated': 'تم تحديث إعدادات الموصل',
  'Failed to load folders': 'فشل تحميل المجلدات',
  'Failed to save': 'فشل الحفظ',
  'Failed to save connector': 'فشل حفظ الموصل',
  Reconnect: 'إعادة الاتصال',
  Close: 'إغلاق',
  'Are you sure you want to disconnect this service? This will remove all synced data.':
    'هل أنت متأكد من رغبتك في قطع الاتصال بهذه الخدمة؟ سيؤدي ذلك إلى إزالة جميع البيانات المتزامنة.',

  // Configuration
  'Configure Connector': 'تكوين الموصل',
  'Connector Name': 'اسم الموصل',
  'Give this connector a memorable name': 'أعطِ هذا الموصل اسماً لا يُنسى',
  'Complete Setup': 'إكمال الإعداد',
  Complete: 'إكمال',
  'Saving...': 'جارٍ الحفظ...',

  // Token refresh
  'Refreshing access token...': 'جارٍ تحديث رمز الوصول...',
  'Please wait': 'يرجى الانتظار',
  'Token refreshed': 'تم تحديث الرمز',
  'Connection restored successfully': 'تمت استعادة الاتصال بنجاح',
  'Your access token has expired. Please reconnect.':
    'انتهت صلاحية رمز الوصول الخاص بك. يرجى إعادة الاتصال.',

  // Missing refresh token warning
  'Limited session': 'جلسة محدودة',
  'Google did not provide a refresh token. Your session will expire in about 1 hour. To enable automatic token refresh, go to myaccount.google.com/permissions, revoke access to DEVS, then reconnect.':
    'لم يوفر Google رمز تحديث. ستنتهي جلستك في حوالي ساعة واحدة. لتمكين التحديث التلقائي للرمز، انتقل إلى myaccount.google.com/permissions، وألغِ الوصول إلى DEVS، ثم أعد الاتصال.',
  'Your session has expired. Please disconnect and reconnect this service. To avoid this in the future, revoke access at myaccount.google.com/permissions before reconnecting.':
    'انتهت جلستك. يرجى قطع الاتصال وإعادة الاتصال بهذه الخدمة. لتجنب ذلك في المستقبل، ألغِ الوصول على myaccount.google.com/permissions قبل إعادة الاتصال.',

  // Sub-route errors
  'Connector not found': 'الموصل غير موجود',
  'Back to connectors': 'العودة إلى الموصلات',

  // Common
  Cancel: 'إلغاء',
  Done: 'تم',
  'Try Again': 'حاول مرة أخرى',
  Back: 'رجوع',
  Save: 'حفظ',
}
