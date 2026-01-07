import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  All: 'Tous',
  Running: 'En cours',
  Completed: 'Terminé',
  Pending: 'En attente',
  Failed: 'Échoué',
  'No tasks found': 'Aucune tâche trouvée',
  'No {status} tasks found': 'Aucune tâche {status} trouvée',
  Due: 'Échéance',
  simple: 'simple',
  complex: 'complexe',
  requirements: 'exigences',
  'Filter by status': 'Filtrer par statut',
  'In Progress': 'En cours',
} as const
