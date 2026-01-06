import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Successfully joined sync room': 'تم الانضمام إلى غرفة المزامنة بنجاح',
}
