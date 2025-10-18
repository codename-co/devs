import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Let your agents take it from here': 'Laissez vos agents prendre le relais',
  'Delegate complex tasks to your own AI teams':
    'Déléguez vos tâches les plus complexes à vos propres équipes IA',
  'Failed to get response from LLM. Please try again later.':
    'Échec de la réponse du LLM. Veuillez réessayer plus tard.',
  'Try these examples': 'Essayez ces exemples',

  // Agent themes
  Writing: 'Écriture',
  Learn: 'Apprentissage',
  Life: 'Quotidien',
  Art: 'Art',
  Coding: 'Code',
} as const
