import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  Presentation: 'Présentation',
  Slideshow: 'Diaporama',
  'Export/Print': 'Exporter / Imprimer',
} as const
