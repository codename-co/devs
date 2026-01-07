import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  All: '모두',
  Running: '실행 중',
  Completed: '완료',
  Pending: '대기 중',
  Failed: '실패',
  'No tasks found': '작업을 찾을 수 없습니다',
  'No {status} tasks found': '{status} 작업을 찾을 수 없습니다',
  Due: '마감일',
  simple: '단순함',
  complex: '복잡함',
  requirements: '요구사항',
  'Filter by status': '상태별 필터링',
  'In Progress': '진행 중',
} as const
