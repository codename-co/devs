import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Knowledge Base': 'قاعدة المعرفة',
  'Upload files and synchronize local folders to build your knowledge base':
    'ارفع الملفات وزامن المجلدات المحلية لبناء قاعدة معرفتك',
  'Uploading files…': 'جارٍ رفع الملفات…',
  'Drag & drop files here, or click to select':
    'اسحب وأسقط الملفات هنا، أو انقر للاختيار',
  'Pick files': 'اختر ملفات',
  'Sync a folder': 'مزامنة مجلد',
  'Synced folders': 'المجلدات المتزامنة',
  'Last sync: {time}': 'آخر مزامنة: {time}',
  Disconnected: 'غير متصل',
  'Stop syncing': 'إيقاف المزامنة',
  Reconnect: 'إعادة الاتصال',
  'My Knowledge': 'معرفتي',
  'No knowledge items yet. Upload some files to get started!':
    'لا توجد عناصر معرفة بعد. ارفع بعض الملفات للبدء!',
  'Knowledge Item': 'عنصر المعرفة',
  Reprocess: 'إعادة المعالجة',
} as const
