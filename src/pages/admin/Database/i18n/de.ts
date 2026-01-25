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
  Edit: 'Bearbeiten',
  Save: 'Speichern',
  Cancel: 'Abbrechen',
  'Field updated': 'Feld aktualisiert',
  'Failed to update field': 'Feld konnte nicht aktualisiert werden',
  'Invalid number value': 'Ungültiger Zahlenwert',
  'Invalid date value': 'Ungültiger Datumswert',
  'Invalid JSON value': 'Ungültiger JSON-Wert',
  'Clear Collection': 'Sammlung leeren',
  'Collection cleared successfully ({count} records removed)':
    'Sammlung erfolgreich geleert ({count} Datensätze entfernt)',
  'Failed to clear collection': 'Sammlung konnte nicht geleert werden',
  'Are you sure you want to clear the "{store}" collection? This will permanently delete all {count} records.':
    'Möchten Sie die Sammlung „{store}" wirklich leeren? Dadurch werden alle {count} Datensätze dauerhaft gelöscht.',
  'This action cannot be undone.':
    'Diese Aktion kann nicht rückgängig gemacht werden.',
  'Clear All Records': 'Alle Datensätze löschen',
} as const
