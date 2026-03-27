import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Generation error': 'Error de generación',
  'Failed to generate PPTX': 'Error al generar el PPTX',
} as const
