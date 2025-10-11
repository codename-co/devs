import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  Presentation: 'Presentación',
  Slideshow: 'Diaporama',
  'Export/Print': 'Exportar / Imprimir',
} as const
