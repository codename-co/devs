import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Successfully joined sync room': '동기화 방에 성공적으로 참여했습니다',
}
