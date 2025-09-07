import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Expand artifacts panel': 'Agrandir le panneau d’artefacts',
  'Minimize artifacts panel': 'Réduire le panneau d’artefacts',
  'Previous artifact': 'Artefact précédent',
  'Next artifact': 'Artefact suivant',
  Dependencies: 'Dépendances',
  'Validates Requirements': 'Valide les exigences',
  'No artifact selected': 'Aucun artefact sélectionné',
} as const
