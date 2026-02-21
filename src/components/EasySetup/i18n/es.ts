import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'AI Providers': 'Proveedores de IA',
} as const
