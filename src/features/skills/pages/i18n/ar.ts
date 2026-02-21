import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Page
  'Agent Skills': 'مهارات الوكيل',
  'Discover, install, and manage specialized skills for your agents':
    'اكتشف وثبّت وأدِر المهارات المتخصصة لوكلائك',
  'Browse the SkillsMP registry of 227k+ Agent Skills':
    'تصفح سجل SkillsMP الذي يضم أكثر من 227 ألف مهارة',

  // Tabs
  Discover: 'اكتشف',
  Installed: 'المثبتة',

  // Search
  'Search skills...': 'البحث عن مهارات...',
  'Search by keyword or describe what you need':
    'ابحث بكلمة مفتاحية أو صِف ما تحتاجه',
  Keyword: 'كلمة مفتاحية',
  'AI Search': 'بحث ذكي',
  'No skills found': 'لم يتم العثور على مهارات',
  'Try a different search query': 'جرّب استعلامًا مختلفًا',
  'Searching...': 'جارٍ البحث...',

  // Skill Card
  'by {author}': 'بواسطة {author}',
  '{n} stars': '{n} نجوم',
  Install: 'تثبيت',
  'Installing...': 'جارٍ التثبيت...',
  Uninstall: 'إلغاء التثبيت',
  Enable: 'تفعيل',
  Disable: 'تعطيل',
  'View Details': 'عرض التفاصيل',
  Python: 'بايثون',
  Bash: 'باش',
  JavaScript: 'جافاسكريبت',
  Scripts: 'نصوص برمجية',
  References: 'مراجع',
  Assets: 'موارد',
  Compatible: 'متوافق',
  Partial: 'جزئي',

  // Skill Detail Modal
  'Skill Details': 'تفاصيل المهارة',
  Instructions: 'تعليمات',
  Files: 'ملفات',
  Settings: 'إعدادات',
  Author: 'المؤلف',
  License: 'الترخيص',
  Stars: 'النجوم',
  Source: 'المصدر',
  'View on GitHub': 'عرض على GitHub',
  'Installed on': 'تاريخ التثبيت',
  'Last updated': 'آخر تحديث',
  'Available Scripts': 'النصوص البرمجية المتاحة',
  'Reference Documents': 'مستندات مرجعية',
  'Asset Files': 'ملفات الموارد',
  'Required Packages': 'الحزم المطلوبة',
  Language: 'اللغة',
  'No scripts included': 'لا توجد نصوص برمجية',
  'This skill provides instructions only': 'هذه المهارة توفر تعليمات فقط',
  'Assigned Agents': 'الوكلاء المعينون',
  'All agents': 'جميع الوكلاء',
  'Select specific agents': 'اختيار وكلاء محددين',
  'Auto-activate': 'التفعيل التلقائي',
  'Always inject skill instructions': 'حقن تعليمات المهارة دائمًا',
  'Confirm Uninstall': 'تأكيد إلغاء التثبيت',
  'Are you sure you want to uninstall this skill?':
    'هل أنت متأكد أنك تريد إلغاء تثبيت هذه المهارة؟',
  Cancel: 'إلغاء',
  'Skill installed successfully': 'تم تثبيت المهارة بنجاح',
  'Skill uninstalled': 'تم إلغاء تثبيت المهارة',
  'Failed to install skill': 'فشل تثبيت المهارة',
  'Failed to fetch skill from GitHub': 'فشل جلب المهارة من GitHub',

  // Compatibility
  'Browser Compatible': 'متوافق مع المتصفح',
  'Can execute Python and JavaScript scripts in-browser':
    'يمكن تشغيل نصوص بايثون وجافاسكريبت في المتصفح',
  'Partial Compatibility': 'توافق جزئي',
  'Some scripts require system tools that can\'t run in-browser':
    'بعض النصوص تتطلب أدوات نظام غير متوفرة في المتصفح',
  'Instructions Only': 'تعليمات فقط',
  'Scripts are available for reference but can\'t execute in-browser':
    'النصوص البرمجية متاحة كمرجع لكن لا يمكن تشغيلها في المتصفح',

  // Execution
  'Run Script': 'تشغيل النص البرمجي',
  'Running script…': 'جاري تشغيل النص البرمجي\u2026',
  'Initializing Python environment…': 'جاري تهيئة بيئة بايثون\u2026',
  'Installing packages…': 'جاري تثبيت الحزم\u2026',
  'Script executed successfully': 'تم تنفيذ النص البرمجي بنجاح',
  'Script execution failed': 'فشل تنفيذ النص البرمجي',
  'Execution timed out': 'انتهت مهلة التنفيذ',
  'Confirm Script Execution': 'تأكيد تشغيل النص البرمجي',
  'This script will run in a sandboxed Python environment.':
    'سيتم تشغيل هذا النص في بيئة بايثون معزولة.',
  'Packages to install': 'الحزم المطلوب تثبيتها',
  'Input files': 'ملفات الإدخال',
  'Estimated execution time': 'وقت التنفيذ المقدر',
  Run: 'تشغيل',
  'Python Environment': 'بيئة بايثون',
  Ready: 'جاهز',
  'Loading…': 'جاري التحميل\u2026',
  'Not initialized': 'غير مهيأ',
  'Pre-warm Python': 'تسخين بايثون مسبقاً',
  'Download and initialize the Python environment in the background':
    'تحميل وتهيئة بيئة بايثون في الخلفية',
  'Incompatible package': 'حزمة غير متوافقة',
  'This package may not work in the browser environment':
    'قد لا تعمل هذه الحزمة في بيئة المتصفح',

  // Try it out
  'Try it out': 'جرّبها',
  'Select script': 'اختر نصاً برمجياً',
  'Arguments (JSON)': 'المعاملات (JSON)',
  'Arguments must be a JSON object': 'يجب أن تكون المعاملات كائن JSON',
  'Invalid JSON': 'JSON غير صالح',
  'No Python scripts available': 'لا توجد نصوص بايثون متاحة',
  'Only Python scripts can be executed in the sandbox': 'يمكن تشغيل نصوص بايثون فقط في البيئة المعزولة',
  'Pre-compiled in Pyodide': 'مترجم مسبقاً في Pyodide',
  'Will be installed via micropip': 'سيتم تثبيته عبر micropip',
  Done: 'تم',
  'Return value': 'القيمة المرجعة',
  Output: 'المخرجات',
  Warnings: 'تحذيرات',
  Error: 'خطأ',
  'Output files': 'ملفات المخرجات',
  'packages installed': 'حزم مثبتة',

  // Empty states
  'No skills installed': 'لا توجد مهارات مثبتة',
  'Search the SkillsMP registry to discover and install skills':
    'ابحث في سجل SkillsMP لاكتشاف وتثبيت المهارات',
  'Your installed skills will appear here': 'ستظهر مهاراتك المثبتة هنا',
  'API key required': 'مفتاح API مطلوب',
  'Enter your SkillsMP API key in Settings to search for skills':
    'أدخل مفتاح SkillsMP API في الإعدادات للبحث عن المهارات',
  // Manual URL install
  'Install from GitHub URL': 'التثبيت من رابط GitHub',
  'Paste a GitHub URL to a skill directory or SKILL.md file':
    'الصق رابط GitHub لمجلد مهارة أو ملف SKILL.md',
}
