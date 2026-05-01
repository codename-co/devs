import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Gallery page
  [`DEVS Tours`]: `DEVS Tours`,
  [`Explore the platform in 30-second videos`]: `Erkunden Sie die Plattform in 30-Sekunden-Videos`,

  // Video titles
  [`Product Tour`]: `Produkt-Tour`,
  [`Agent Studio`]: `Agent Studio`,
  [`Task Delegation`]: `Aufgabendelegierung`,
  [`Privacy First`]: `Datenschutz zuerst`,
  [`Inbox Workflow`]: `Posteingangs-Workflow`,

  // Video descriptions
  [`The full DEVS story in 30 seconds`]: `Die ganze DEVS-Geschichte in 30 Sekunden`,
  [`Build your own AI team`]: `Bauen Sie Ihr eigenes KI-Team`,
  [`Delegate, don\u2019t chat`]: `Delegieren, nicht chatten`,
  [`Your keys. Your data. Your browser.`]: `Ihre Schl\u00fcssel. Ihre Daten. Ihr Browser.`,
  [`Your AI tasks`]: `Ihre KI-Aufgaben`,

  // Navigation
  [`\u2190 All tours`]: `\u2190 Alle Touren`,
}
