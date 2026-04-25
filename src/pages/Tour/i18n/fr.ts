import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Gallery page
  [`DEVS Tours`]: `DEVS Tours`,
  [`Explore the platform in 30-second videos`]: `Explorez la plateforme en vid\u00e9os de 30 secondes`,

  // Video titles
  [`Product Tour`]: `Tour du produit`,
  [`Agent Studio`]: `Agent Studio`,
  [`Task Delegation`]: `D\u00e9l\u00e9gation de t\u00e2ches`,
  [`Privacy First`]: `Confidentialit\u00e9 d\u2019abord`,
  [`Inbox Workflow`]: `Workflow de bo\u00eete de r\u00e9ception`,

  // Video descriptions
  [`The full DEVS story in 30 seconds`]: `Toute l\u2019histoire de DEVS en 30 secondes`,
  [`Build your own AI team`]: `Construisez votre propre \u00e9quipe IA`,
  [`Delegate, don\u2019t chat`]: `D\u00e9l\u00e9guez, ne bavardez pas`,
  [`Your keys. Your data. Your browser.`]: `Vos cl\u00e9s. Vos donn\u00e9es. Votre navigateur.`,
  [`Your AI inbox`]: `Votre bo\u00eete de r\u00e9ception IA`,

  // Navigation
  [`\u2190 All tours`]: `\u2190 Tous les tours`,
}
