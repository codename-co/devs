import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Page
  Connectors: '커넥터',
  'Connect external services to import content into your Knowledge Base':
    '외부 서비스를 연결하여 지식 베이스로 콘텐츠를 가져오세요',

  // Categories
  Apps: '앱',
  APIs: 'API',
  MCPs: 'MCP',

  // Providers - Google Drive
  'Google Drive': 'Google 드라이브',
  'Import files and documents from Google Drive':
    'Google 드라이브에서 파일과 문서 가져오기',

  // Providers - Gmail
  Gmail: 'Gmail',
  'Import emails and conversations': '이메일과 대화 가져오기',

  // Providers - Google Calendar
  'Google Calendar': 'Google 캘린더',
  'Import events and schedules': '일정과 스케줄 가져오기',

  // Providers - Google Meet
  'Google Meet': 'Google Meet',
  'Join meetings with AI agents': 'AI 에이전트와 함께 회의 참여',

  // Providers - Notion
  Notion: 'Notion',
  'Import pages and databases from Notion':
    'Notion에서 페이지와 데이터베이스 가져오기',

  // Providers - Google Tasks
  'Google Tasks': 'Google Tasks',
  'Import tasks and to-do lists from Google Tasks':
    'Google Tasks에서 작업과 할 일 목록 가져오기',
  // Providers - Slack
  Slack: 'Slack',
  'Sync messages and files from Slack channels':
    'Slack 채널에서 메시지 및 파일 동기화',

  // Providers - Figma
  Figma: 'Figma',
  'Sync design files and components from Figma':
    'Figma에서 디자인 파일 및 컴포넌트 동기화',

  // Status
  Connected: '연결됨',
  'Syncing...': '동기화 중...',
  Error: '오류',
  'Token Expired': '토큰 만료',

  // Actions
  Connect: '연결',
  Disconnect: '연결 해제',
  'Sync Now': '지금 동기화',
  Settings: '설정',
  Reconnect: '재연결',

  // Wizard
  'Connect a Service': '서비스 연결',
  'Select a service to connect': '연결할 서비스를 선택하세요',
  'Connecting to {provider}...': '{provider}에 연결 중...',
  'Select folders to sync': '동기화할 폴더 선택',
  'Sync all content': '모든 콘텐츠 동기화',
  'Successfully connected!': '연결 성공!',
  '{name} has been connected to your knowledge base.':
    '{name}이(가) 지식 베이스에 연결되었습니다.',
  '{name} has been connected.': '{name}이(가) 연결되었습니다.',
  'Start Sync Now': '동기화 시작',
  Done: '완료',
  'Try Again': '다시 시도',

  // Sync
  'Last synced {time}': '마지막 동기화 {time}',
  'Never synced': '동기화한 적 없음',
  '{count} items synced': '{count}개 항목 동기화됨',
  'Sync in progress...': '동기화 진행 중...',

  // Errors
  'Authentication failed': '인증 실패',
  'Your access token has expired. Please reconnect.':
    '액세스 토큰이 만료되었습니다. 다시 연결해 주세요.',
  'Sync failed: {error}': '동기화 실패: {error}',
  'Provider error: {error}': '제공자 오류: {error}',
  'Failed to load folders': '폴더 로드 실패',
  'Failed to save': '저장 실패',
  'OAuth not configured for provider: {provider}':
    '제공자에 대해 OAuth가 구성되지 않음: {provider}',
  'Missing client ID for provider: {provider}':
    '제공자에 대한 클라이언트 ID 누락: {provider}',

  // Empty states
  'No connectors': '커넥터 없음',
  'Connect external services to import content':
    '외부 서비스를 연결하여 콘텐츠를 가져오세요',
  'Add Connector': '커넥터 추가',

  // Confirmations
  'Are you sure you want to disconnect {provider}?':
    '{provider} 연결을 해제하시겠습니까?',
  'This will remove the connection but keep synced content.':
    '연결은 해제되지만 동기화된 콘텐츠는 유지됩니다.',

  // Settings Modal
  '{name} Settings': '{name} 설정',
  'Connected Account': '연결된 계정',
  'Enable Sync': '동기화 활성화',
  'Automatically sync content from this connector':
    '이 커넥터에서 자동으로 콘텐츠 동기화',
  'Sync Settings': '동기화 설정',
  'Choose which folders to sync or sync everything':
    '동기화할 폴더를 선택하거나 모든 항목 동기화',
  'Settings saved': '설정 저장됨',
  'Connector settings have been updated': '커넥터 설정이 업데이트되었습니다',
} as const
