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
} as const
