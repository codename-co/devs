import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  Presentation: 'Präsentation',
  Slideshow: 'Diashow',
  'Export/Print': 'Exportieren / Drucken',
} as const
