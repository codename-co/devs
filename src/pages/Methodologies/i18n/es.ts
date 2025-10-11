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
  'Workflow Diagram': 'Diagrama de flujo',
  Phases: 'Fases',
  Optional: 'Opcional',
  Repeatable: 'Repetible',
  task: 'tarea',
  tasks: 'tareas',
  'Agent Roles': 'Roles de agentes',
} as const
