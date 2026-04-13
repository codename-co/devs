import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Hey {productName}': 'Hey {productName}',
  'Your AI team is ready': 'Ihr KI-Team ist bereit',
  'Failed to get response from LLM. Please try again later.':
    'LLM-Antwort fehlgeschlagen. Bitte versuchen Sie es später erneut.',

  // Agent themes
  Writing: 'Schreiben',
  Learn: 'Lernen',
  Life: 'Leben',
  Art: 'Kunst',
  Coding: 'Programmierung',

  // Prompt modes & CTA
  Live: 'Live',
  Studio: 'Studio',

  // PWA Install
  'Install {productName}': '{productName} installieren',
  'Install this app on your device for a better experience and offline access.':
    'Installieren Sie diese App auf Ihrem Gerät für eine bessere Erfahrung und Offline-Zugriff.',

  // Recent Activity
  'Recent conversations': 'Letzte Gespräche',
  'View all': 'Alle anzeigen',
  'Untitled conversation': 'Unbenannte Konversation',
} as const
