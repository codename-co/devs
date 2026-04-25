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
  [`Stop chatting. Start delegating.`]: `توقّف عن الدردشة. ابدأ بالتفويض.`,

  // Scene 2 — prompt submit
  [`Audit Q1 expenses, flag anomalies, draft a CFO memo`]: `تدقيق نفقات Q1، تحديد الشذوذ، صياغة مذكرة CFO`,

  // Scene 3 — board view (task titles)
  [`Parse invoices`]: `تحليل الفواتير`,
  [`Flag anomalies`]: `تحديد الشذوذ`,
  [`Cross-check budgets`]: `مراجعة الميزانيات`,
  [`Summarize findings`]: `تلخيص النتائج`,
  [`Draft CFO memo`]: `صياغة مذكرة CFO`,
  // Scene 3 — board view (task snippets)
  [`Extract line items from 247 invoices`]: `استخراج البنود من 247 فاتورة`,
  [`Identify outliers above 2σ threshold`]: `تحديد القيم الشاذة فوق عتبة 2σ`,
  [`Compare against Q4 budget allocations`]: `المقارنة بمخصصات ميزانية Q4`,
  [`Aggregate findings into executive bullets`]: `تجميع النتائج في نقاط تنفيذية`,
  [`Compose formal memo for CFO review`]: `صياغة مذكرة رسمية لمراجعة CFO`,
  // Scene 3 — agent roles
  [`Analysis`]: `التحليل`,
  [`Auditing`]: `التدقيق`,
  [`Writing`]: `الكتابة`,

  // Scene 4 — artifacts
  [`Task completed`]: `اكتملت المهمة`,
  [`3 agents collaborated`]: `تعاون 3 وكلاء`,
  [`Q1 Expense Audit`]: `تدقيق نفقات Q1`,
  [`report`]: `تقرير`,
  [`CFO Memo`]: `مذكرة CFO`,
  [`document`]: `مستند`,

  // Scene 5 — collapse
  [`Delegated. Delivered. Done.`]: `فُوِّض. سُلِّم. أُنجِز.`,

  // Scene 6 — CTA
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
