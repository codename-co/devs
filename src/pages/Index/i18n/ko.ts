import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Let your agents take it from here': '당신의 에이전트에게 맡기세요',
  'Delegate complex tasks to your own AI teams':
    '복잡한 작업을 자신의 AI 팀에 위임하세요',
  'Failed to get response from LLM. Please try again later.':
    'LLM의 응답을 받지 못했습니다. 나중에 다시 시도하세요.',
  'Try these examples': '이 예제를 시도해 보세요',

  // Agent themes
  Writing: '글쓰기',
  Learn: '학습',
  Life: '생활',
  Art: '예술',
  Coding: '코딩',
} as const
