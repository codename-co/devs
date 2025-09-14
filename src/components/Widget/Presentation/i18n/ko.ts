import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  Presentation: '프레젠테이션',
  Slideshow: '슬라이드쇼',
  'Export/Print': '내보내기/인쇄',
} as const
