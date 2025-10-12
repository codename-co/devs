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
  'Graphical Representation': '그래픽 표현',
  Phases: '단계',
  Optional: '선택 사항',
  Repeatable: '반복 가능',
  task: '작업',
  tasks: '작업',
  'Role Distribution': '역할 분배',
  'Prompt using this methodology': '이 방법론 사용하기',
  'Prompt using {methodology}': '{methodology} 사용하기',
  'Use the {methodology} methodology to complete this task:':
    '이 작업을 완료하려면 {methodology} 방법론을 사용하세요:',
  leader: '리더',
  observer: '관찰자',
  contributor: '기여자',
  reviewer: '검토자',
  approver: '승인자',
  'Previous Methodology': '이전 방법론',
  'Next Methodology': '다음 방법론',
  'Back to Methodologies': '방법론으로 돌아가기',
  '{methodology} methodology': '방법론 {methodology}',
} as const
