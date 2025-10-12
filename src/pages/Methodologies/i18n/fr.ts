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
  'Graphical Representation': 'Représentation graphique',
  Phases: 'Phases',
  Optional: 'Optionnel',
  Repeatable: 'Répétable',
  task: 'tâche',
  tasks: 'tâches',
  'Role Distribution': 'Répartition des rôles',
  'Prompt using this methodology': 'Utiliser cette méthodologie',
  'Prompt using {methodology}': 'Utiliser {methodology}',
  'Use the {methodology} methodology to complete this task:':
    'Utilise la méthodologie {methodology} pour accomplir cette tâche :',
  leader: 'leader',
  observer: 'observateur',
  contributor: 'contributeur',
  reviewer: 'examinateur',
  approver: 'approbateur',
  'Previous Methodology': 'Méthodologie précédente',
  'Next Methodology': 'Méthodologie suivante',
  'Back to Methodologies': 'Retour aux méthodologies',
  '{methodology} methodology': 'Méthodologie {methodology}',
} as const
