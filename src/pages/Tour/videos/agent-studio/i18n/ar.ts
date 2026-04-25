/**
 * Tour-local i18n — Arabic translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Browser chrome
  [`DEVS`]: `DEVS`,

  // Scene 1 — hook caption
  [`What if AI worked your way?`]: `ماذا لو عمل الذكاء الاصطناعي بطريقتك؟`,

  // Scene 2 — browser agents
  [`New agent`]: `وكيل جديد`,
  [`Create a custom agent`]: `إنشاء وكيل مخصص`,
  [`Scout`]: `Scout`,
  [`Research`]: `بحث`,
  [`Forge`]: `Forge`,
  [`Analysis`]: `التحليل`,
  [`Scribe`]: `Scribe`,
  [`Writing`]: `الكتابة`,
  [`Echo`]: `Echo`,
  [`Review`]: `المراجعة`,
  [`Probe`]: `Probe`,
  [`Data`]: `بيانات`,
  [`Lens`]: `Lens`,
  [`Vision`]: `رؤية`,
  [`Market Scout`]: `Market Scout`,
  [`Competitive Analyst`]: `محلل تنافسي`,

  // Scene 3 — agent config
  [`Profile`]: `الملف الشخصي`,
  [`Name`]: `الاسم`,
  [`Role`]: `الدور`,
  [`Instructions`]: `التعليمات`,
  [`Analyze competitor products, pricing strategies, and market positioning. Summarize findings into actionable briefs.`]: `تحليل منتجات المنافسين واستراتيجيات التسعير والتموضع في السوق. تلخيص النتائج في ملخصات قابلة للتنفيذ.`,
  [`Context`]: `السياق`,
  [`Knowledge`]: `المعرفة`,
  [`market-report-q3.pdf`]: `market-report-q3.pdf`,
  [`competitor-matrix.csv`]: `competitor-matrix.csv`,
  [`Skills`]: `المهارات`,
  [`Web research`]: `بحث على الويب`,
  [`Settings`]: `الإعدادات`,
  [`Model`]: `النموذج`,
  [`GPT-4o`]: `GPT-4o`,
  [`Temperature`]: `الحرارة`,
  [`0.7`]: `0.7`,

  // Scene 4 — team glance
  [`A team. Yours. Built in seconds.`]: `فريق. فريقك. يُبنى في ثوانٍ.`,

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
