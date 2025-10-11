import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Expand artifacts panel': 'Expandir panel de artefactos',
  'Minimize artifacts panel': 'Minimizar panel de artefactos',
  'Previous artifact': 'Artefacto anterior',
  'Next artifact': 'Siguiente artefacto',
  Dependencies: 'Dependencias',
  'Validates Requirements': 'Valida los requisitos',
  'No artifact selected': 'Ningún artefacto seleccionado',
} as const
