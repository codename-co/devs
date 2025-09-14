import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  Render: '렌더링',
  Code: '코드',
  'Loading…': '로딩 중…',
} as const
