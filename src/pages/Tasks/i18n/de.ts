import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  All: 'Alle',
  Running: 'Laufend',
  Completed: 'Abgeschlossen',
  Pending: 'Ausstehend',
  Failed: 'Fehlgeschlagen',
  'No tasks found': 'Keine Aufgaben gefunden',
  'No {status} tasks found': 'Keine {status} Aufgaben gefunden',
  Due: 'Fällig',
  simple: 'einfach',
  complex: 'komplex',
  requirements: 'Anforderungen',
} as const
