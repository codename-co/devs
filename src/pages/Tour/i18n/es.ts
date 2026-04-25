import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Gallery page
  [`DEVS Tours`]: `DEVS Tours`,
  [`Explore the platform in 30-second videos`]: `Explora la plataforma en v\u00eddeos de 30 segundos`,

  // Video titles
  [`Product Tour`]: `Tour del producto`,
  [`Agent Studio`]: `Agent Studio`,
  [`Task Delegation`]: `Delegaci\u00f3n de tareas`,
  [`Privacy First`]: `Privacidad ante todo`,
  [`Inbox Workflow`]: `Flujo de bandeja de entrada`,

  // Video descriptions
  [`The full DEVS story in 30 seconds`]: `Toda la historia de DEVS en 30 segundos`,
  [`Build your own AI team`]: `Construye tu propio equipo de IA`,
  [`Delegate, don\u2019t chat`]: `Delega, no chatees`,
  [`Your keys. Your data. Your browser.`]: `Tus claves. Tus datos. Tu navegador.`,
  [`Your AI inbox`]: `Tu bandeja de entrada de IA`,

  // Navigation
  [`\u2190 All tours`]: `\u2190 Todos los tours`,
}
