import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Let your agents take it from here':
    'Deja que tus agentes se encarguen de esto',
  'Delegate complex tasks to your own AI teams':
    'Delegar tareas complejas a tus propios equipos de IA',
  'Failed to get response from LLM. Please try again later.':
    'Error al obtener respuesta del LLM. Por favor, inténtalo de nuevo más tarde.',

  // Agent themes
  Writing: 'Escriptura',
  Learn: 'Aprendizaje',
  Life: 'Vida',
  Art: 'Arte',
  Coding: 'Programación',

  // PWA Install
  'Install {productName}': 'Instalar {productName}',
  'Install this app on your device for a better experience and offline access.':
    'Instale esta aplicación en su dispositivo para una mejor experiencia y acceso sin conexión.',
} as const
