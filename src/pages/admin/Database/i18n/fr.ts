import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Database exported successfully': 'Base de données exportée avec succès',
  'Failed to export database': 'Échec de l’exportation de la base de données',
  'Database imported successfully ({count} items)':
    'Base de données importée avec succès ({count} éléments)',
  'Failed to import database - invalid file format':
    'Échec de l’importation de la base de données - format de fichier invalide',
  'Backup database': 'Exporter la base de données',
  'Restore database': 'Restaurer la base de données',
} as const
