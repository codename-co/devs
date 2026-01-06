import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Successfully joined sync room':
    'Connexion à la salle de synchronisation réussie',
}
