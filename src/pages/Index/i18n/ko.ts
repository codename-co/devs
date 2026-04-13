import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Hey {productName}': 'Hey {productName}',
  'Your AI team is ready': '당신의 AI 팀이 준비되었습니다',
  'Failed to get response from LLM. Please try again later.':
    'LLM의 응답을 받지 못했습니다. 나중에 다시 시도하세요.',

  // Agent themes
  Writing: '글쓰기',
  Learn: '학습',
  Life: '생활',
  Art: '예술',
  Coding: '코딩',

  // Prompt modes & CTA
  Live: '라이브',
  Studio: '스튜디오',

  // PWA Install
  'Install {productName}': '{productName} 설치',
  'Install this app on your device for a better experience and offline access.':
    '더 나은 경험과 오프라인 액세스를 위해 이 앱을 기기에 설치하세요.',

  // Recent Activity
  'Recent conversations': '최근 대화',
  'View all': '전체 보기',
  'Untitled conversation': '제목 없는 대화',
} as const
