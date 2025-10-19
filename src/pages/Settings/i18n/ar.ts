import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Platform Settings': 'إعدادات المنصة',
  'Configure LLM providers, models and platform defaults for your organization':
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
  'LLM Providers': 'مزودات LLM',
  'Choose your LLM provider, manage your API credentials':
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
  'Make the platform your own': 'اجعل المنصة خاصة بك',
  'Share the platform': 'مشاركة المنصة',
  'Export the platform settings to another device or share it with others':
    'تصدير إعدادات المنصة إلى جهاز آخر أو مشاركتها مع الآخرين',
} as const
