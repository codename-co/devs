/**
 * Tour-local i18n — Arabic translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Scene 1 — hook
  [`AI that reports back to you.`]: `ذكاء اصطناعي يُبلغك بالنتائج.`,

  // Scene 2 — inbox full
  [`Q1 Expense Audit`]: `تدقيق مصاريف الربع الأول`,
  [`Blog post draft`]: `مسودة مقال`,
  [`API documentation`]: `توثيق API`,
  [`Market research`]: `بحث سوقي`,
  [`Code review: auth`]: `مراجعة الكود: auth`,
  [`Weekly summary`]: `ملخص أسبوعي`,
  [`Auditor`]: `Auditor`,
  [`Scribe`]: `Scribe`,
  [`DocBot`]: `DocBot`,
  [`Scout`]: `Scout`,
  [`Reviewer`]: `Reviewer`,
  [`Digest`]: `Digest`,
  [`2m ago`]: `منذ دقيقتين`,
  [`15m ago`]: `منذ 15 د`,
  [`1h ago`]: `منذ ساعة`,
  [`3h ago`]: `منذ 3 س`,
  [`5h ago`]: `منذ 5 س`,
  [`1d ago`]: `منذ يوم`,
  [`Found 3 anomalies in Q1 data…`]: `تم العثور على 3 حالات شاذة في بيانات الربع الأول…`,
  [`Here\u2019s a draft covering key topics…`]: `إليك مسودة تغطي المواضيع الرئيسية…`,
  [`Endpoints documented with examples…`]: `نقاط الوصول موثقة مع أمثلة…`,
  [`Audit Q1 expenses and flag anomalies`]: `تدقيق مصاريف الربع الأول والإبلاغ عن الحالات الشاذة`,
  [`Analyzing expense data across departments…`]: `تحليل بيانات المصاريف عبر الأقسام…`,
  [`Found 3 anomalies totaling $12,400. Two duplicate vendor payments and one misclassified expense in Marketing.`]: `تم العثور على 3 حالات شاذة بإجمالي 12,400 $. دفعتان مكررتان لمورّد ومصروف مصنّف خطأ في التسويق.`,

  // Scene 3 — transcript
  [`Audit Q1 expenses...`]: `تدقيق مصاريف الربع الأول…`,
  [`Analyzing expense data...`]: `تحليل بيانات المصاريف…`,
  [`calculate — 247 transactions`]: `calculate — 247 معاملة`,
  [`search_knowledge — Q1 reports`]: `search_knowledge — تقارير الربع الأول`,
  [`Found 3 anomalies...`]: `تم العثور على 3 حالات شاذة…`,
  [`1.2s`]: `1.2s`,
  [`0.8s`]: `0.8s`,
  [`2.1s`]: `2.1s`,
  [`1.5s`]: `1.5s`,
  [`0.9s`]: `0.9s`,
  [`340 tok`]: `340 tok`,
  [`—`]: `—`,
  [`580 tok`]: `580 tok`,
  [`120 tok`]: `120 tok`,
  [`410 tok`]: `410 tok`,
  [`User input`]: `إدخال المستخدم`,
  [`Thinking`]: `تفكير`,
  [`Tool call`]: `استدعاء أداة`,
  [`Response`]: `استجابة`,

  // Scene 4 — tags & search
  [`#research`]: `#research`,
  [`Search. Tag. Organize.`]: `ابحث. صنّف. نظّم.`,

  // Scene 5 — CTA
  [`Now you can.`]: `الآن بإمكانك.`,
  [`Open devs.new →`]: `افتح devs.new ←`,
  [`No signup · No install · Free`]: `بلا تسجيل · بلا تثبيت · مجاني`,

  // Playback bar — settings menu
  [`Speed`]: `السرعة`,
  [`Normal`]: `عادي`,
  [`Language`]: `اللغة`,
  [`Keyboard shortcuts`]: `اختصارات لوحة المفاتيح`,

  // Playback bar — control titles
  [`Pause`]: `إيقاف مؤقت`,
  [`Play`]: `تشغيل`,
  [`Unmute`]: `تشغيل الصوت`,
  [`Mute`]: `كتم الصوت`,
  [`Exit full screen`]: `الخروج من وضع ملء الشاشة`,
  [`Full screen`]: `ملء الشاشة`,
  [`Settings`]: `الإعدادات`,

  // Keyboard shortcut overlay — descriptions
  [`Play / Pause`]: `تشغيل / إيقاف مؤقت`,
  [`Seek back 0.1 s`]: `الرجوع 0.1 ث`,
  [`Seek forward 0.1 s`]: `التقديم 0.1 ث`,
  [`Seek back 1 s`]: `الرجوع 1 ث`,
  [`Seek forward 1 s`]: `التقديم 1 ث`,
  [`Go to start`]: `العودة إلى البداية`,
  [`Toggle mute`]: `تبديل كتم الصوت`,
  [`Toggle full screen`]: `تبديل ملء الشاشة`,
  [`Show shortcuts`]: `عرض الاختصارات`,
  [`Close this overlay`]: `إغلاق`,
}
