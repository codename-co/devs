import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Reproduce real-world task execution methodologies':
    'Reproducción de metodologías de ejecución de tareas del mundo real',
  'Methodology Details': 'Detalles de la metodología',
  'No methodology ID provided': 'No se proporcionó ningún ID de metodología',
  'Methodology not found': 'Método no encontrado',
  'Failed to load methodology': 'Error al cargar la metodología',
  'Loading...': 'Cargando...',
  Domains: 'Dominios',
  Tags: 'Etiquetas',
  'Graphical Representation': 'Representación gráfica',
  Phases: 'Fases',
  Optional: 'Opcional',
  Repeatable: 'Repetible',
  task: 'tarea',
  tasks: 'tareas',
  'Role Distribution': 'Distribución de roles',
  'Prompt using this methodology': 'Utilizar esta metodología',
  'Prompt using {methodology}': 'Utilizar {methodology}',
  'Use the {methodology} methodology to complete this task:':
    'Utiliza la metodología {methodology} para completar esta tarea:',
  leader: 'líder',
  observer: 'observador',
  contributor: 'contribuyente',
  reviewer: 'revisor',
  approver: 'aprobador',
  'Previous Methodology': 'Metodología anterior',
  'Next Methodology': 'Metodología siguiente',
  'Back to Methodologies': 'Volver a Metodologías',
  '{methodology} methodology': 'Metodología {methodology}',
} as const
