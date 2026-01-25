import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Database exported successfully': 'تم تصدير قاعدة البيانات بنجاح',
  'Failed to export database': 'فشل تصدير قاعدة البيانات',
  'Database imported successfully ({count} items)':
    'تم استيراد قاعدة البيانات بنجاح ({count} عنصر)',
  'Failed to import database - invalid file format':
    'فشل استيراد قاعدة البيانات - تنسيق ملف غير صالح',
  'Backup database': 'تصدير قاعدة البيانات',
  'Restore database': 'استعادة قاعدة البيانات',
  Edit: 'تعديل',
  Save: 'حفظ',
  Cancel: 'إلغاء',
  'Field updated': 'تم تحديث الحقل',
  'Failed to update field': 'فشل تحديث الحقل',
  'Invalid number value': 'قيمة رقمية غير صالحة',
  'Invalid date value': 'قيمة تاريخ غير صالحة',
  'Invalid JSON value': 'قيمة JSON غير صالحة',
  'Clear Collection': 'إفراغ المجموعة',
  'Collection cleared successfully ({count} records removed)':
    'تم إفراغ المجموعة بنجاح (تم حذف {count} سجل)',
  'Failed to clear collection': 'فشل إفراغ المجموعة',
  'Are you sure you want to clear the "{store}" collection? This will permanently delete all {count} records.':
    'هل أنت متأكد من أنك تريد إفراغ مجموعة «{store}»؟ سيؤدي هذا إلى حذف جميع السجلات الـ {count} نهائيًا.',
  'This action cannot be undone.': 'لا يمكن التراجع عن هذا الإجراء.',
  'Clear All Records': 'حذف جميع السجلات',
} as const
