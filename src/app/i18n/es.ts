import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Successfully joined sync room':
    'Te has unido a la sala de sincronización con éxito',
}
