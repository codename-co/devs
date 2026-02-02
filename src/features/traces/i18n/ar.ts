import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Page titles
  'Traces and Metrics': 'التتبع والمقاييس',
  'Trace Details': 'تفاصيل التتبع',
  Dashboard: 'لوحة التحكم',
  'LLM Observability': 'مراقبة LLM',
  'Monitor and analyze all LLM calls': 'مراقبة وتحليل جميع استدعاءات LLM',

  // Tabs
  Logs: 'السجلات',
  Metrics: 'المقاييس',

  // Filters
  All: 'الكل',
  Completed: 'مكتمل',
  Error: 'خطأ',
  Running: 'قيد التشغيل',
  Pending: 'قيد الانتظار',
  'Filter by status': 'تصفية حسب الحالة',
  'Filter by provider': 'تصفية حسب المزود',
  'Filter by agent': 'تصفية حسب الوكيل',
  'Search traces...': 'البحث في التتبعات...',

  // Time periods
  'Time Range': 'النطاق الزمني',
  'Last Hour': 'الساعة الأخيرة',
  'Last 24 Hours': 'آخر 24 ساعة',
  'Last 7 Days': 'آخر 7 أيام',
  'Last 30 Days': 'آخر 30 يومًا',
  'All Time': 'كل الوقت',

  // Metrics
  'Total Requests': 'إجمالي الطلبات',
  'Success Rate': 'معدل النجاح',
  'Total Tokens': 'إجمالي الرموز',
  'Total Cost': 'التكلفة الإجمالية',
  'Avg Duration': 'متوسط المدة',
  'Error Rate': 'معدل الأخطاء',
  'Requests Over Time': 'الطلبات عبر الزمن',
  'Token Usage': 'استخدام الرموز',
  'Cost Breakdown': 'تفصيل التكلفة',
  'Model Distribution': 'توزيع النماذج',
  'Provider Distribution': 'توزيع المزودين',
  'Agent Usage': 'استخدام الوكلاء',

  // Trace details
  'Trace ID': 'معرف التتبع',
  Status: 'الحالة',
  Duration: 'المدة',
  Started: 'بدأ',
  Ended: 'انتهى',
  Model: 'النموذج',
  Provider: 'المزود',
  Tokens: 'الرموز',
  Cost: 'التكلفة',
  Input: 'الإدخال',
  Output: 'الإخراج',
  Spans: 'النطاقات',
  Metadata: 'البيانات الوصفية',
  'No spans found': 'لم يتم العثور على نطاقات',

  // Span types
  'LLM Call': 'استدعاء LLM',
  'Image Generation': 'توليد الصور',
  'Video Generation': 'توليد الفيديو',
  Agent: 'وكيل',
  Tool: 'أداة',
  Chain: 'سلسلة',
  Retrieval: 'استرجاع',
  Embedding: 'تضمين',
  Custom: 'مخصص',

  // Actions
  'Clear All': 'مسح الكل',
  Export: 'تصدير',
  Refresh: 'تحديث',
  Delete: 'حذف',
  Back: 'رجوع',
  'View Details': 'عرض التفاصيل',

  // Empty states
  'No traces yet': 'لا توجد تتبعات بعد',
  'Start chatting with agents to see LLM traces here':
    'ابدأ المحادثة مع الوكلاء لرؤية تتبعات LLM هنا',
  'No data available': 'لا توجد بيانات متاحة',

  // Settings
  'Tracing Settings': 'إعدادات التتبع',
  'Enable Tracing': 'تفعيل التتبع',
  'Capture Input': 'التقاط الإدخال',
  'Capture Output': 'التقاط الإخراج',
  'Retention Days': 'أيام الاحتفاظ',
  'Max Traces': 'الحد الأقصى للتتبعات',

  // Misc
  'Prompt Tokens': 'رموز المطالبة',
  'Completion Tokens': 'رموز الإكمال',
  requests: 'طلبات',
  tokens: 'رموز',
  ms: 'مللي ثانية',
  Average: 'المتوسط',
  Median: 'الوسيط',
  '{n}th percentile': 'النسبة المئوية {n}',
  'Are you sure you want to delete all traces?':
    'هل أنت متأكد من حذف جميع التتبعات؟',
  'This action cannot be undone.': 'لا يمكن التراجع عن هذا الإجراء.',
  Cancel: 'إلغاء',
  Confirm: 'تأكيد',

  // Additional page strings
  'Trace not found': 'التتبع غير موجود',
  'Failed to load trace': 'فشل في تحميل التتبع',
  'Failed to load traces': 'فشل في تحميل التتبعات',
  'Back to Traces': 'العودة إلى التتبعات',
  'Trace Detail': 'تفاصيل التتبع',
  'Trace deleted successfully': 'تم حذف التتبع بنجاح',
  'All traces deleted successfully': 'تم حذف جميع التتبعات بنجاح',
  'Failed to delete trace': 'فشل في حذف التتبع',
  'Failed to clear traces': 'فشل في مسح التتبعات',
  'Configuration saved successfully': 'تم حفظ الإعدادات بنجاح',
  'Failed to save configuration': 'فشل في حفظ الإعدادات',
  'Monitor and analyze LLM requests': 'مراقبة وتحليل طلبات LLM',
  'Capture all LLM requests': 'التقاط جميع طلبات LLM',
  'How long to keep traces': 'مدة الاحتفاظ بالتتبعات',
  'Sampling Rate': 'معدل أخذ العينات',
  'Percentage of requests to trace': 'نسبة الطلبات المراد تتبعها',
  Save: 'حفظ',
  Deleted: 'محذوف',
  Cleared: 'ممسوح',
  Saved: 'محفوظ',
  'Clear All Traces': 'مسح جميع التتبعات',
  'Delete all traces permanently': 'حذف جميع التتبعات نهائياً',
  'Are you sure you want to delete all traces? This action cannot be undone.':
    'هل أنت متأكد من حذف جميع التتبعات؟ لا يمكن التراجع عن هذا الإجراء.',
  'Delete All': 'حذف الكل',
  Settings: 'الإعدادات',
  'Current Session': 'الجلسة الحالية',

  // Sessions view
  Sessions: 'الجلسات',
  Session: 'جلسة',
  'Single Request': 'طلب واحد',
  Conversation: 'محادثة',
  Task: 'مهمة',
  'Search sessions...': 'البحث في الجلسات...',
  'Search logs...': 'البحث في السجلات...',
  sessions: 'جلسات',
  'No sessions found matching your search':
    'لم يتم العثور على جلسات تطابق بحثك',
  'Just now': 'الآن',
  Name: 'الاسم',
}
