import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Let your agents take it from here': 'Lassen Sie Ihre Agenten übernehmen',
  'Delegate complex tasks to your own AI teams':
    'Delegieren Sie komplexe Aufgaben an Ihre eigenen KI-Teams',
  'Failed to get response from LLM. Please try again later.':
    'LLM-Antwort fehlgeschlagen. Bitte versuchen Sie es später erneut.',
  'Try these examples': 'Probieren Sie diese Beispiele',

  // Agent themes
  Writing: 'Schreiben',
  Learn: 'Lernen',
  Life: 'Leben',
  Art: 'Kunst',
  Coding: 'Programmierung',
} as const
