import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Reproduce real-world task execution methodologies':
    '실제 작업 실행 방법론 재현',
  'Methodology Details': '방법론 세부정보',
  'No methodology ID provided': '제공된 방법론 ID가 없습니다',
  'Methodology not found': '방법론을 찾을 수 없습니다',
  'Failed to load methodology': '방법론을 로드하지 못했습니다',
  'Loading...': '로딩 중...',
  Domains: '도메인',
  Tags: '태그',
  'Workflow Diagram': '워크플로우 다이어그램',
  Phases: '단계',
  Optional: '선택 사항',
  Repeatable: '반복 가능',
  task: '작업',
  tasks: '작업',
  'Agent Roles': '에이전트 역할',
} as const
