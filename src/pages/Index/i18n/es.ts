import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Let your agents take it from here':
    'Deja que tus agentes se encarguen de esto',
  'Delegate complex tasks to your own AI teams':
    'Delegar tareas complejas a tus propios equipos de IA',
  'Failed to get response from LLM. Please try again later.':
    'Error al obtener respuesta del LLM. Por favor, inténtalo de nuevo más tarde.',
  'Try these examples': 'Prueba estos ejemplos',
} as const
