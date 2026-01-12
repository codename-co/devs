import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Sync - General
  'Successfully joined sync room': 'تم الانضمام إلى غرفة المزامنة بنجاح',
  Sync: 'مزامنة',
  Syncing: 'جاري المزامنة',
  'Connecting...': 'جاري الاتصال...',
  Offline: 'غير متصل',
  Connected: 'متصل',
  Disabled: 'معطل',
  Disconnect: 'قطع الاتصال',
  Back: 'رجوع',

  // Sync - Modes
  Create: 'إنشاء',
  Join: 'انضمام',
  Share: 'مشاركة',
  'Start Sync': 'بدء المزامنة',
  'Join Room': 'انضمام للغرفة',

  // Sync - Instructions
  'Synchronize with devices': 'مزامنة مع الأجهزة',
  'Start synchronization': 'بدء المزامنة',
  'Join with a code': 'الانضمام برمز',
  'Create a new sync room': 'إنشاء غرفة مزامنة جديدة',
  'Join an existing room': 'الانضمام لغرفة موجودة',
  'Start sharing with other devices': 'ابدأ المشاركة مع أجهزة أخرى',
  'Connect to an existing device with a code': 'اتصل بجهاز موجود باستخدام رمز',
  'Synchronize with other devices': 'مزامنة مع أجهزة أخرى',
  'Join a device': 'انضم إلى جهاز',
  'Enter the code from another device, or use a sync link.':
    'أدخل الرمز من جهاز آخر، أو استخدم رابط مزامنة.',
  'Start syncing and invite others to join':
    'ابدأ المزامنة وادعُ الآخرين للانضمام',
  'All connected devices sync in real-time as equal peers. Any device can read and write data.':
    'جميع الأجهزة المتصلة تتزامن في الوقت الفعلي كنظراء متساوين. أي جهاز يمكنه قراءة وكتابة البيانات.',
  'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
    'بياناتك تتزامن مع جميع النظراء. الجميع لديه وصول متساوٍ - التغييرات من أي جهاز تتم مشاركتها فورًا.',
  'Syncing with all connected peers. All devices are equal.':
    'مزامنة مع جميع النظراء المتصلين. جميع الأجهزة متساوية.',
  'Sync active! Share the link or QR code with other devices to connect.':
    'المزامنة نشطة! شارك الرابط أو رمز QR مع الأجهزة الأخرى.',
  'Click "Synchronize with devices" to start syncing.':
    'انقر على "مزامنة مع الأجهزة" لبدء المزامنة.',
  'Sync your data across devices in real-time.':
    'زامن بياناتك بين الأجهزة في الوقت الفعلي.',
  'No server needed - data stays between your devices.':
    'لا حاجة لخادم - البيانات تبقى بين أجهزتك.',

  // Sync - Room/Code
  Code: 'الرمز',
  'Room Code': 'رمز الغرفة',
  'Enter room code': 'أدخل رمز الغرفة',
  'Enter or paste a code': 'أدخل أو الصق رمزًا',
  'Sync Link': 'رابط المزامنة',
  'Copy Link': 'نسخ الرابط',
  'Copied!': 'تم النسخ!',
  'Share this code or link with other devices:':
    'شارك هذا الرمز أو الرابط مع أجهزة أخرى:',
  'Copy to clipboard': 'نسخ إلى الحافظة',
  'Sync Settings': 'إعدادات المزامنة',

  // Sync - QR Code
  'Or scan this QR Code:': 'أو امسح رمز QR:',
  'Generating QR Code...': 'جاري إنشاء رمز QR...',
  'QR Code generation failed': 'فشل إنشاء رمز QR',
  'Scan QR Code': 'مسح رمز QR',
  'Scan a QR code to join': 'امسح رمز QR للانضمام',
  'Scan the QR Code': 'امسح رمز QR',
  'Stop Scanner': 'إيقاف الماسح',
  'Point your camera at a sync QR code': 'وجّه الكاميرا نحو رمز QR للمزامنة',
  'Use another device to scan this QR code to connect instantly.':
    'استخدم جهازًا آخر لمسح رمز QR هذا للاتصال فورًا.',
  'Camera access denied': 'تم رفض الوصول إلى الكاميرا',
  'Unable to access camera. Please grant camera permissions.':
    'تعذر الوصول إلى الكاميرا. يرجى منح أذونات الكاميرا.',

  // Sync - Secret Link
  'Share the secret link': 'شارك الرابط السري',
  'Copy and share this unique link with your other device. Keep it private!':
    'انسخ وشارك هذا الرابط الفريد مع جهازك الآخر. احتفظ به خاصًا!',

  // Sync - Peers
  'Status:': 'الحالة:',
  '{count} peer': '{count} نظير',
  '{count} peers': '{count} نظراء',
  You: 'أنت',
  Peer: 'نظير',
  Device: 'جهاز',

  // Sync - Activity
  Sent: 'مُرسَل',
  Received: 'مُستلَم',
  'Activity Details': 'تفاصيل النشاط',
  'No activity': 'لا يوجد نشاط',
  'Data Activity': 'نشاط البيانات',
  'Network Topology': 'طوبولوجيا الشبكة',
  'Total synced': 'إجمالي المزامنة',
  bytes: 'بايت',
  KB: 'كيلوبايت',
  MB: 'ميغابايت',
  'just now': 'الآن',
  ago: 'منذ',
  second: 'ثانية',
  seconds: 'ثواني',

  // Sync - Privacy
  'Your Data Stays Local': 'بياناتك تبقى محلية',
  'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
    'كل شيء يعمل في متصفحك. محادثاتك ووكلاؤك وبياناتك مخزنة محلياً على جهازك ولا تُرسل أبداً إلى أي خادم.',
  'Complete Privacy': 'خصوصية كاملة',
  'No accounts, no tracking, no cloud storage. You own your data.':
    'لا حسابات، لا تتبع، لا تخزين سحابي. بياناتك ملكك.',
  'Work Offline': 'اعمل بدون اتصال',
  'Use the app without an internet connection. Your data is always available.':
    'استخدم التطبيق بدون اتصال بالإنترنت. بياناتك متاحة دائماً.',
  'Want to sync across devices?': 'تريد المزامنة بين الأجهزة؟',
  'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
    'فعّل المزامنة من نظير إلى نظير لمشاركة البيانات بين أجهزتك أو مع الآخرين. البيانات تنتقل مباشرة بين الأجهزة.',

  // Sync - Misc
  or: 'أو',
  'Local Backup': 'نسخ احتياطي محلي',
  'Automatically backup your data to a folder on your device':
    'احفظ بياناتك تلقائياً في مجلد على جهازك',
}
