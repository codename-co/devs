import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // Gallery page
  [`DEVS Tours`]: `جولات DEVS`,
  [`Explore the platform in 30-second videos`]: `استكشف المنصة في مقاطع فيديو مدتها 30 ثانية`,

  // Video titles
  [`Product Tour`]: `جولة المنتج`,
  [`Agent Studio`]: `استوديو الوكلاء`,
  [`Task Delegation`]: `تفويض المهام`,
  [`Privacy First`]: `الخصوصية أولاً`,
  [`Inbox Workflow`]: `سير عمل البريد الوارد`,

  // Video descriptions
  [`The full DEVS story in 30 seconds`]: `قصة DEVS الكاملة في 30 ثانية`,
  [`Build your own AI team`]: `ابنِ فريقك الذكاء الاصطناعي الخاص`,
  [`Delegate, don\u2019t chat`]: `فوّض، لا تتحدث`,
  [`Your keys. Your data. Your browser.`]: `مفاتيحك. بياناتك. متصفحك.`,
  [`Your AI tasks`]: `مهام الذكاء الاصطناعي`,

  // Navigation
  [`\u2190 All tours`]: `كل الجولات \u2192`,
}
