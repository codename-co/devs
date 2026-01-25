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
  Edit: 'Modifier',
  Save: 'Enregistrer',
  Cancel: 'Annuler',
  'Field updated': 'Champ mis à jour',
  'Failed to update field': 'Échec de la mise à jour du champ',
  'Invalid number value': 'Valeur numérique invalide',
  'Invalid date value': 'Valeur de date invalide',
  'Invalid JSON value': 'Valeur JSON invalide',
  'Clear Collection': 'Vider la collection',
  'Collection cleared successfully ({count} records removed)':
    'Collection vidée avec succès ({count} enregistrements supprimés)',
  'Failed to clear collection': 'Échec du vidage de la collection',
  'Are you sure you want to clear the "{store}" collection? This will permanently delete all {count} records.':
    'Êtes-vous sûr de vouloir vider la collection « {store} » ? Cela supprimera définitivement les {count} enregistrements.',
  'This action cannot be undone.': 'Cette action est irréversible.',
  'Clear All Records': 'Supprimer tous les enregistrements',
} as const
