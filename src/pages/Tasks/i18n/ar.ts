import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  All: 'الكل',
  Running: 'قيد التشغيل',
  Completed: 'مكتمل',
  Pending: 'معلق',
  Failed: 'فشل',
  'No tasks found': 'لم يتم العثور على مهام',
  'No {status} tasks found': 'لم يتم العثور على مهام {status}',
  Due: 'موعد الاستحقاق',
  simple: 'بسيط',
  complex: 'معقد',
  requirements: 'متطلبات',
  'Filter by status': 'تصفية حسب الحالة',
  'In Progress': 'قيد التنفيذ',
  'Sub-Tasks': 'المهام الفرعية',
} as const
