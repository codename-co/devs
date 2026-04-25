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
  [`What leaves your browser? Nothing.`]: `ما الذي يغادر متصفحك؟ لا شيء.`,

  // Scene 2 — browser local
  [`IndexedDB`]: `IndexedDB`,
  [`Local storage`]: `تخزين محلي`,
  [`Web Crypto`]: `Web Crypto`,
  [`Encrypted keys`]: `مفاتيح مشفّرة`,
  [`Service Worker`]: `Service Worker`,
  [`Offline ready`]: `جاهز بدون اتصال`,

  // Scene 3 — BYOK
  [`LLM Providers`]: `موفّرو LLM`,
  [`OpenAI`]: `OpenAI`,
  [`Anthropic`]: `Anthropic`,
  [`Gemini`]: `Gemini`,
  [`Ollama`]: `Ollama`,
  [`OpenRouter`]: `OpenRouter`,
  [`Local (WebGPU)`]: `Local (WebGPU)`,
  [`Connected`]: `متصل`,
  [`12+ providers. Your keys. Your choice.`]: `أكثر من 12 موفّرًا. مفاتيحك. اختيارك.`,

  // Scene 4 — promise
  [`No server.`]: `بدون خادم.`,
  [`No subscription.`]: `بدون اشتراك.`,
  [`No third party.`]: `بدون أطراف ثالثة.`,
  [`Open source.`]: `مفتوح المصدر.`,
  [`OPEN SOURCE · BROWSER-NATIVE · YOURS`]: `مفتوح المصدر · أصلي للمتصفح · ملكك`,

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
