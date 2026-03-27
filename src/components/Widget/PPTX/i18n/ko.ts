import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Generation error': '생성 오류',
  'Failed to generate PPTX': 'PPTX 생성에 실패했습니다',
} as const
