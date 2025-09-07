import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  Completed: '완료',
  Pending: '대기 중',
} as const
