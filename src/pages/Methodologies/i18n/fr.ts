import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Reproduce real-world task execution methodologies':
    'Reproduction des méthodologies d’exécution de tâches du monde réel',
  'Methodology Details': 'Détails de la méthodologie',
  'No methodology ID provided': 'Aucun identifiant de méthodologie fourni',
  'Methodology not found': 'Méthodologie introuvable',
  'Failed to load methodology': 'Échec du chargement de la méthodologie',
  'Loading...': 'Chargement...',
  Domains: 'Domaines',
  Tags: 'Étiquettes',
  'Workflow Diagram': 'Diagramme de flux',
  Phases: 'Phases',
  Optional: 'Optionnel',
  Repeatable: 'Répétable',
  task: 'tâche',
  tasks: 'tâches',
  'Agent Roles': 'Rôles des agents',
} as const
