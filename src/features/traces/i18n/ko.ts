import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Page titles
  'Traces and Metrics': '추적 및 지표',
  'Trace Details': '추적 세부정보',
  Dashboard: '대시보드',
  'LLM Observability': 'LLM 관측성',
  'Monitor and analyze all LLM calls': '모든 LLM 호출 모니터링 및 분석',

  // Tabs
  Logs: '로그',
  Metrics: '지표',

  // Filters
  All: '전체',
  Completed: '완료됨',
  Error: '오류',
  Running: '실행 중',
  Pending: '대기 중',
  'Filter by status': '상태별 필터',
  'Filter by provider': '제공자별 필터',
  'Filter by agent': '에이전트별 필터',
  'Search traces...': '추적 검색...',

  // Time periods
  'Time Range': '기간 선택',
  'Last Hour': '지난 1시간',
  'Last 24 Hours': '지난 24시간',
  'Last 7 Days': '지난 7일',
  'Last 30 Days': '지난 30일',
  'All Time': '전체 기간',

  // Metrics
  'Total Requests': '총 요청',
  'Success Rate': '성공률',
  'Total Tokens': '총 토큰',
  'Total Cost': '총 비용',
  'Avg Duration': '평균 소요시간',
  'Error Rate': '오류율',
  'Requests Over Time': '시간별 요청',
  'Token Usage': '토큰 사용량',
  'Cost Breakdown': '비용 분석',
  'Model Distribution': '모델 분포',
  'Provider Distribution': '제공자 분포',
  'Agent Usage': '에이전트 사용량',

  // Trace details
  'Trace ID': '추적 ID',
  Status: '상태',
  Duration: '소요시간',
  Started: '시작',
  Ended: '종료',
  Model: '모델',
  Provider: '제공자',
  Tokens: '토큰',
  Cost: '비용',
  Input: '입력',
  Output: '출력',
  Spans: '스팬',
  Metadata: '메타데이터',
  'No spans found': '스팬을 찾을 수 없습니다',

  // Span types
  'LLM Call': 'LLM 호출',
  'Image Generation': '이미지 생성',
  Agent: '에이전트',
  Tool: '도구',
  Chain: '체인',
  Retrieval: '검색',
  Embedding: '임베딩',
  Custom: '사용자 정의',

  // Actions
  'Clear All': '모두 지우기',
  Export: '내보내기',
  Refresh: '새로고침',
  Delete: '삭제',
  Back: '뒤로',
  'View Details': '세부정보 보기',

  // Empty states
  'No traces yet': '아직 추적이 없습니다',
  'Start chatting with agents to see LLM traces here':
    '에이전트와 대화를 시작하여 여기서 LLM 추적을 확인하세요',
  'No data available': '사용 가능한 데이터가 없습니다',

  // Settings
  'Tracing Settings': '추적 설정',
  'Enable Tracing': '추적 활성화',
  'Capture Input': '입력 캡처',
  'Capture Output': '출력 캡처',
  'Retention Days': '보존 기간(일)',
  'Max Traces': '최대 추적 수',

  // Misc
  'Prompt Tokens': '프롬프트 토큰',
  'Completion Tokens': '완료 토큰',
  requests: '요청',
  tokens: '토큰',
  ms: 'ms',
  'Are you sure you want to delete all traces?':
    '모든 추적을 삭제하시겠습니까?',
  'This action cannot be undone.': '이 작업은 취소할 수 없습니다.',
  Cancel: '취소',
  Confirm: '확인',

  // Additional page strings
  'Trace not found': '추적을 찾을 수 없습니다',
  'Failed to load trace': '추적을 불러오지 못했습니다',
  'Failed to load traces': '추적 목록을 불러오지 못했습니다',
  'Back to Traces': '추적으로 돌아가기',
  'Trace Detail': '추적 세부정보',
  'Trace deleted successfully': '추적이 성공적으로 삭제되었습니다',
  'All traces deleted successfully': '모든 추적이 성공적으로 삭제되었습니다',
  'Failed to delete trace': '추적 삭제에 실패했습니다',
  'Failed to clear traces': '추적 지우기에 실패했습니다',
  'Configuration saved successfully': '설정이 성공적으로 저장되었습니다',
  'Failed to save configuration': '설정 저장에 실패했습니다',
  'Monitor and analyze LLM requests': 'LLM 요청 모니터링 및 분석',
  'Capture all LLM requests': '모든 LLM 요청 캡처',
  'How long to keep traces': '추적 보존 기간',
  'Sampling Rate': '샘플링 비율',
  'Percentage of requests to trace': '추적할 요청 비율',
  Save: '저장',
  Deleted: '삭제됨',
  Cleared: '지워짐',
  Saved: '저장됨',
  'Clear All Traces': '모든 추적 지우기',
  'Are you sure you want to delete all traces? This action cannot be undone.':
    '모든 추적을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
  'Delete All': '모두 삭제',
  Settings: '설정',
  'Current Session': '현재 세션',

  // Sessions view
  Sessions: '세션',
  Session: '세션',
  'Single Request': '단일 요청',
  Conversation: '대화',
  Task: '작업',
  'Search sessions...': '세션 검색...',
  'Search logs...': '로그 검색...',
  sessions: '세션',
  'No sessions found matching your search':
    '검색과 일치하는 세션을 찾을 수 없습니다',
  'Just now': '방금',
  Name: '이름',
}
