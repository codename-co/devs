import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Expand artifacts panel': 'Artefakte-Panel erweitern',
  'Minimize artifacts panel': 'Artefakte-Panel minimieren',
  'Previous artifact': 'Vorheriges Artefakt',
  'Next artifact': 'Nächstes Artefakt',
  Dependencies: 'Abhängigkeiten',
  'Validates Requirements': 'Validiert Anforderungen',
  'No artifact selected': 'Kein Artefakt ausgewählt',
} as const
