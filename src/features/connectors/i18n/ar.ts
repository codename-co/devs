import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Page
  Connectors: 'الموصلات',
  'Connect external services to import content into your Knowledge Base':
    'قم بتوصيل خدمات خارجية لاستيراد المحتوى إلى قاعدة المعرفة الخاصة بك',

  // Categories
  Apps: 'التطبيقات',
  APIs: 'واجهات برمجة التطبيقات',
  MCPs: 'MCPs',

  // Providers - Google Drive
  'Google Drive': 'Google Drive',
  'Import files and documents from Google Drive':
    'استيراد الملفات والمستندات من Google Drive',

  // Providers - Gmail
  Gmail: 'Gmail',
  'Import emails and conversations': 'استيراد الرسائل الإلكترونية والمحادثات',

  // Providers - Google Calendar
  'Google Calendar': 'تقويم Google',
  'Import events and schedules': 'استيراد الأحداث والجداول',

  // Providers - Google Meet
  'Google Meet': 'Google Meet',
  'Join meetings with AI agents':
    'انضم إلى الاجتماعات مع وكلاء الذكاء الاصطناعي',

  // Providers - Notion
  Notion: 'Notion',
  'Import pages and databases from Notion':
    'استيراد الصفحات وقواعد البيانات من Notion',

  // Providers - Google Tasks
  'Google Tasks': 'مهام Google',
  'Import tasks and to-do lists from Google Tasks':
    'استيراد المهام وقوائم المهام من مهام Google',

  // Status
  Connected: 'متصل',
  'Syncing...': 'جارِ المزامنة...',
  Error: 'خطأ',
  'Token Expired': 'انتهت صلاحية الرمز',

  // Actions
  Connect: 'اتصال',
  Disconnect: 'قطع الاتصال',
  'Sync Now': 'مزامنة الآن',
  Settings: 'الإعدادات',
  Reconnect: 'إعادة الاتصال',

  // Wizard
  'Connect a Service': 'توصيل خدمة',
  'Select a service to connect': 'حدد خدمة للاتصال',
  'Connecting to {provider}...': 'جارِ الاتصال بـ {provider}...',
  'Select folders to sync': 'حدد المجلدات للمزامنة',
  'Sync all content': 'مزامنة جميع المحتوى',
  'Successfully connected!': 'تم الاتصال بنجاح!',
  '{name} has been connected to your knowledge base.':
    'تم توصيل {name} بقاعدة معارفك.',
  '{name} has been connected.': 'تم توصيل {name}.',
  'Start Sync Now': 'بدء المزامنة الآن',
  Done: 'تم',
  'Try Again': 'حاول مرة أخرى',

  // Sync
  'Last synced {time}': 'آخر مزامنة {time}',
  'Never synced': 'لم تتم المزامنة مطلقاً',
  '{count} items synced': 'تمت مزامنة {count} عنصر',
  'Sync in progress...': 'المزامنة قيد التقدم...',

  // Errors
  'Authentication failed': 'فشل المصادقة',
  'Your access token has expired. Please reconnect.':
    'انتهت صلاحية رمز الوصول الخاص بك. يرجى إعادة الاتصال.',
  'Sync failed: {error}': 'فشلت المزامنة: {error}',
  'Provider error: {error}': 'خطأ في المزود: {error}',
  'Failed to load folders': 'فشل تحميل المجلدات',
  'Failed to save': 'فشل الحفظ',

  // Empty states
  'No connectors': 'لا توجد موصلات',
  'Connect external services to import content':
    'قم بتوصيل خدمات خارجية لاستيراد المحتوى',
  'Add Connector': 'إضافة موصل',

  // Confirmations
  'Are you sure you want to disconnect {provider}?':
    'هل أنت متأكد من أنك تريد قطع الاتصال بـ {provider}؟',
  'This will remove the connection but keep synced content.':
    'سيؤدي هذا إلى إزالة الاتصال ولكنه سيحتفظ بالمحتوى المُزامَن.',

  // Settings Modal
  '{name} Settings': 'إعدادات {name}',
  'Connected Account': 'الحساب المتصل',
  'Enable Sync': 'تفعيل المزامنة',
  'Automatically sync content from this connector':
    'مزامنة المحتوى تلقائياً من هذا الموصل',
  'Sync Settings': 'إعدادات المزامنة',
  'Choose which folders to sync or sync everything':
    'اختر المجلدات للمزامنة أو قم بمزامنة كل شيء',
  'Settings saved': 'تم حفظ الإعدادات',
  'Connector settings have been updated': 'تم تحديث إعدادات الموصل',
} as const
