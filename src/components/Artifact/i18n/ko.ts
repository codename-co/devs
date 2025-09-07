import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Expand artifacts panel': '아티팩트 패널 확장',
  'Minimize artifacts panel': '아티팩트 패널 축소',
  'Previous artifact': '이전 아티팩트',
  'Next artifact': '다음 아티팩트',
  Dependencies: '종속성',
  'Validates Requirements': '요구사항 검증',
  'No artifact selected': '선택된 아티팩트가 없습니다',
} as const
