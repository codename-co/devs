import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Page
  Connectors: '커넥터',
  'Connect external services to your knowledge base':
    '외부 서비스를 지식 베이스에 연결하세요',
  'Sync files and data from your favorite apps and services.':
    '즐겨 사용하는 앱과 서비스에서 파일과 데이터를 동기화하세요.',
  'Add Connector': '커넥터 추가',

  // Tabs
  Apps: '앱',
  APIs: 'API',
  MCPs: 'MCP',
  'Coming soon': '곧 출시 예정',

  // ConnectorCard
  Connected: '연결됨',
  Error: '오류',
  Expired: '만료됨',
  'Syncing...': '동기화 중...',
  'Never synced': '동기화된 적 없음',
  'Just now': '방금',
  '{n} minutes ago': '{n}분 전',
  '{n} hours ago': '{n}시간 전',
  '{n} days ago': '{n}일 전',
  'Last sync:': '마지막 동기화:',
  '{n} folders syncing': '{n}개 폴더 동기화 중',
  '{n} tools': '{n}개 도구',
  'Sync Now': '지금 동기화',
  'More options': '더 많은 옵션',
  'Connector actions': '커넥터 작업',
  Settings: '설정',
  Disconnect: '연결 해제',

  // Empty state
  'No app connectors yet': '아직 앱 커넥터가 없습니다',
  'Connect your Google Drive, Notion, Gmail and more to sync files to your knowledge base.':
    'Google Drive, Notion, Gmail 등을 연결하여 파일을 지식 베이스에 동기화하세요.',
  'No API connectors yet': '아직 API 커넥터가 없습니다',
  'Connect custom REST or GraphQL APIs to integrate external data sources.':
    '사용자 정의 REST 또는 GraphQL API를 연결하여 외부 데이터 소스를 통합하세요.',
  'No MCP connectors yet': '아직 MCP 커넥터가 없습니다',
  'Connect Model Context Protocol servers to extend agent capabilities.':
    'Model Context Protocol 서버를 연결하여 에이전트 기능을 확장하세요.',
  'Add your first connector': '첫 번째 커넥터를 추가하세요',

  // Wizard - Provider Selection
  'Choose a service to connect to your knowledge base:':
    '지식 베이스에 연결할 서비스를 선택하세요:',
  'Choose a service to connect to your knowledge base':
    '지식 베이스에 연결할 서비스를 선택하세요',
  'Select a Service': '서비스 선택',
  'OAuth not configured for this provider':
    '이 제공자에 대해 OAuth가 구성되지 않았습니다',
  'This provider is not ready': '이 제공자는 준비되지 않았습니다',

  // Wizard - OAuth Step
  'Connecting...': '연결 중...',
  'Connecting to {name}...': '{name}에 연결 중...',
  'Connect {name}': '{name} 연결',
  'Connect to {name}': '{name}에 연결',
  'A new window will open for you to authorize access. Please complete the authorization to continue.':
    '액세스 권한을 부여하기 위해 새 창이 열립니다. 계속하려면 권한 부여를 완료하세요.',
  'You will be redirected to {name} to authorize DEVS to access your data. Your credentials are never stored on our servers.':
    'DEVS가 데이터에 액세스할 수 있도록 {name}으로 리디렉션됩니다. 자격 증명은 서버에 저장되지 않습니다.',
  'This connector will be able to:': '이 커넥터는 다음을 수행할 수 있습니다:',
  'Read your files and content': '파일과 콘텐츠 읽기',
  'Search your content': '콘텐츠 검색',
  'Sync changes automatically': '변경 사항 자동 동기화',
  'Authenticating...': '인증 중...',
  'Connection Failed': '연결 실패',
  'Connection failed': '연결 실패',
  'Something went wrong while connecting. Please try again.':
    '연결 중 문제가 발생했습니다. 다시 시도해 주세요.',
  'Successfully authenticated': '인증 성공',
  'Authentication failed': '인증 실패',
  'Authentication successful': '인증 성공',
  Authenticate: '인증',

  // Wizard - Folder Selection
  'Select Folders': '폴더 선택',
  'Select folders to sync': '동기화할 폴더 선택',
  'Add files to sync': '동기화할 파일 추가',
  'Paste file URLs or IDs from {name} to sync.':
    '동기화할 {name}의 파일 URL 또는 ID를 붙여넣으세요.',
  'Enter URLs or IDs (one per line)': 'URL 또는 ID 입력 (한 줄에 하나씩)',
  'Enter file URLs or IDs, one per line':
    '파일 URL 또는 ID를 한 줄에 하나씩 입력하세요',
  '{n} items to sync': '{n}개 항목 동기화 예정',
  'Choose which folders you want to sync from {name}, or sync everything.':
    '{name}에서 동기화할 폴더를 선택하거나 모든 항목을 동기화하세요.',
  'Sync everything': '모두 동기화',
  'All files and folders will be synced automatically':
    '모든 파일과 폴더가 자동으로 동기화됩니다',
  'Loading folders...': '폴더 로딩 중...',
  'No folders found': '폴더를 찾을 수 없습니다',
  '{n} folders selected': '{n}개 폴더 선택됨',
  Skip: '건너뛰기',
  Continue: '계속',

  // Wizard - Success
  'Connected!': '연결됨!',
  'Successfully connected!': '성공적으로 연결되었습니다!',
  '{name} has been connected to your knowledge base.':
    '{name}이(가) 지식 베이스에 연결되었습니다.',
  '{name} has been connected.': '{name}이(가) 연결되었습니다.',
  '{name} has been connected to your knowledge base. Files will begin syncing shortly.':
    '{name}이(가) 지식 베이스에 연결되었습니다. 곧 파일 동기화가 시작됩니다.',
  '{name} has been successfully connected':
    '{name}이(가) 성공적으로 연결되었습니다',
  '{name} connected successfully': '{name} 연결 성공',
  'Connected and authorized': '연결 및 인증됨',
  'Connected as {email}': '{email}로 연결됨',
  'Syncing all files': '모든 파일 동기화 중',
  'Auto-sync enabled': '자동 동기화 활성화됨',
  'Automatic sync will begin shortly': '자동 동기화가 곧 시작됩니다',
  'Start Sync Now': '지금 동기화 시작',
  'Connector Added': '커넥터 추가됨',

  // Wizard - Progress
  'Step {current} of {total}': '{total}단계 중 {current}단계',
  'Wizard progress': '마법사 진행 상황',

  // Sync Status
  'Sync completed': '동기화 완료',
  '{n} items synced': '{n}개 항목 동기화됨',
  'Sync failed': '동기화 실패',
  'Unknown error': '알 수 없는 오류',

  // Settings Modal
  '{name} Settings': '{name} 설정',
  'Connected Account': '연결된 계정',
  'Available Tools': '사용 가능한 도구',
  '{n} tools available for AI agents': 'AI 에이전트에 {n}개 도구 사용 가능',
  'Enable Sync': '동기화 활성화',
  'Enable Automatic Sync': '자동 동기화 활성화',
  'Automatically sync content from this connector':
    '이 커넥터에서 자동으로 콘텐츠 동기화',
  'Automatically sync new and updated content':
    '새로운 콘텐츠와 업데이트된 콘텐츠 자동 동기화',
  'Sync Settings': '동기화 설정',
  'Sync Interval (minutes)': '동기화 간격 (분)',
  'How often to check for changes': '변경 사항 확인 빈도',
  'Choose which folders to sync or sync everything':
    '동기화할 폴더를 선택하거나 모두 동기화하세요',
  'Settings saved': '설정 저장됨',
  'Connector settings have been updated': '커넥터 설정이 업데이트되었습니다',
  'Failed to load folders': '폴더 로드 실패',
  'Failed to save': '저장 실패',
  'Failed to save connector': '커넥터 저장 실패',

  // Configuration
  'Configure Connector': '커넥터 구성',
  'Connector Name': '커넥터 이름',
  'Give this connector a memorable name':
    '이 커넥터에 기억하기 쉬운 이름을 지정하세요',
  'Complete Setup': '설정 완료',
  Complete: '완료',
  'Saving...': '저장 중...',

  // Token refresh
  'Refreshing access token...': '액세스 토큰 갱신 중...',
  'Please wait': '잠시 기다려 주세요',
  'Token refreshed': '토큰 갱신됨',
  'Connection restored successfully': '연결이 성공적으로 복원되었습니다',
  'Your access token has expired. Please reconnect.':
    '액세스 토큰이 만료되었습니다. 다시 연결해 주세요.',

  // Missing refresh token warning
  'Limited session': '제한된 세션',
  'Google did not provide a refresh token. Your session will expire in about 1 hour. To enable automatic token refresh, go to myaccount.google.com/permissions, revoke access to DEVS, then reconnect.':
    'Google에서 새로고침 토큰을 제공하지 않았습니다. 세션이 약 1시간 후에 만료됩니다. 자동 토큰 새로고침을 활성화하려면 myaccount.google.com/permissions로 이동하여 DEVS에 대한 액세스를 취소한 다음 다시 연결하세요.',
  'Your session has expired. Please disconnect and reconnect this service. To avoid this in the future, revoke access at myaccount.google.com/permissions before reconnecting.':
    '세션이 만료되었습니다. 이 서비스의 연결을 끊고 다시 연결해 주세요. 향후 이를 방지하려면 다시 연결하기 전에 myaccount.google.com/permissions에서 액세스를 취소하세요.',

  // Common
  Cancel: '취소',
  Done: '완료',
  'Try Again': '다시 시도',
  Back: '뒤로',
  Save: '저장',
}
