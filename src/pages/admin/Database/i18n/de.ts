import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Database exported successfully': 'Datenbank erfolgreich exportiert',
  'Failed to export database': 'Datenbankexport fehlgeschlagen',
  'Database imported successfully ({count} items)':
    'Datenbank erfolgreich importiert ({count} Elemente)',
  'Failed to import database - invalid file format':
    'Datenbankimport fehlgeschlagen - ungültiges Dateiformat',
  'Backup database': 'Datenbank exportieren',
  'Restore database': 'Datenbank wiederherstellen',
} as const
