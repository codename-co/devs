import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Hey {productName}': 'Hey {productName}',
  'Your own AI agents ready to collaborate':
    'Tus propios agentes de IA listos para colaborar',
  'Failed to get response from LLM. Please try again later.':
    'Error al obtener respuesta del LLM. Por favor, inténtalo de nuevo más tarde.',

  // Agent themes
  Writing: 'Escriptura',
  Learn: 'Aprendizaje',
  Life: 'Vida',
  Art: 'Arte',
  Coding: 'Programación',

  // Prompt modes & CTA
  Live: 'Live',
  Studio: 'Studio',

  // PWA Install
  'Install {productName}': 'Instalar {productName}',
  'Install this app on your device for a better experience and offline access.':
    'Instale esta aplicación en su dispositivo para una mejor experiencia y acceso sin conexión.',

  // Recent Activity
  'Recent conversations': 'Conversaciones recientes',
  'View all': 'Ver todo',
  'Untitled conversation': 'Conversación sin título',
} as const
