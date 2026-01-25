import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Database exported successfully': 'Base de datos exportada con éxito',
  'Failed to export database': 'Error al exportar la base de datos',
  'Database imported successfully ({count} items)':
    'Base de datos importada con éxito ({count} elementos)',
  'Failed to import database - invalid file format':
    'Error al importar la base de datos - formato de archivo inválido',
  'Backup database': 'Hacer una copia de seguridad de la base de datos',
  'Restore database': 'Restaurar la base de datos',
  Edit: 'Editar',
  Save: 'Guardar',
  Cancel: 'Cancelar',
  'Field updated': 'Campo actualizado',
  'Failed to update field': 'Error al actualizar el campo',
  'Invalid number value': 'Valor numérico inválido',
  'Invalid date value': 'Valor de fecha inválido',
  'Invalid JSON value': 'Valor JSON inválido',
  'Clear Collection': 'Vaciar colección',
  'Collection cleared successfully ({count} records removed)':
    'Colección vaciada con éxito ({count} registros eliminados)',
  'Failed to clear collection': 'Error al vaciar la colección',
  'Are you sure you want to clear the "{store}" collection? This will permanently delete all {count} records.':
    '¿Está seguro de que desea vaciar la colección «{store}»? Esto eliminará permanentemente los {count} registros.',
  'This action cannot be undone.': 'Esta acción no se puede deshacer.',
  'Clear All Records': 'Eliminar todos los registros',
} as const
