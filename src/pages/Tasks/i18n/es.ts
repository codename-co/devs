import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  All: 'Todos',
  Running: 'En curso',
  Completed: 'Terminado',
  Pending: 'Pendiente',
  Failed: 'Fallido',
  'No tasks found': 'No se encontraron tareas',
  'No {status} tasks found': 'No se encontraron tareas {status}',
  Due: 'Vencimiento',
  simple: 'simple',
  complex: 'complejo',
  requirements: 'requisitos',
  'Filter by status': 'Filtrar por estado',
  'In Progress': 'En curso',
} as const
