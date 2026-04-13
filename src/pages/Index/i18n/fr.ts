import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Hey {productName}': 'Hey {productName}',
  'Your AI team is ready': 'Votre équipe d’IA est prête',
  'Failed to get response from LLM. Please try again later.':
    'Impossible d’obtenir une réponse du LLM. Veuillez réessayer plus tard.',

  // Agent themes
  Writing: 'Écriture',
  Learn: 'Apprentissage',
  Life: 'Quotidien',
  Art: 'Art',
  Coding: 'Code',

  // Prompt modes & CTA
  Live: 'Live',
  Studio: 'Studio',

  // PWA Install
  'Install {productName}': 'Installer {productName}',
  'Install this app on your device for a better experience and offline access.':
    'Installez cette application sur votre appareil pour une meilleure expérience et un accès hors ligne.',

  // Recent Activity
  'Recent conversations': 'Conversations récentes',
  'View all': 'Tout voir',
  'Untitled conversation': 'Conversation sans titre',
} as const
