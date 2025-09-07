import type { I18n } from '@/i18n/locales'

export const ko: I18n = {
  // AgentPicker
  'Available Agents': '사용 가능한 에이전트',
  Scientists: '과학자',
  Advisors: '고문',
  Artists: '예술가',
  Philosophers: '철학자',
  Musicians: '음악가',
  Writers: '작가',
  'Other Agents': '기타 에이전트',

  // AppDrawer
  'Expand sidebar': '사이드바 확장',
  'Collapse sidebar': '사이드바 축소',
  'New Task': '새로운 작업',
  'New Team': '새로운 팀',
  Tasks: '작업',
  Teams: '팀',
  Settings: '설정',
  Agents: '에이전트',
  Conversations: '대화',
  'Conversations history': '대화 기록',
  Knowledge: '지식',
  Connectors: '커넥터',
  'New Chat': '새로운 채팅',
  'Chat with AI': 'AI와 채팅',
  AGENTS: '에이전트',
  CONVERSATIONS: '대화',
  'View all agents': '모든 에이전트 보기',
  'View all history': '모든 기록 보기',
  Chat: '채팅',
  'Main navigation': '주 탐색',
  'New Agent': '새로운 에이전트',
  'Upgrade to Pro': 'Pro로 업그레이드',

  // PromptArea
  'Need something done?': '무언가 필요하신가요?',
  'More actions': '추가 작업',
  'Attach a file or image': '파일이나 이미지를 첨부하세요',
  'Upload new file': '새 파일 업로드',
  'Choose from knowledge base': '지식 베이스에서 선택',
  'Drop files here…': '여기에 파일을 드롭하세요…',
  'Use microphone': '마이크 사용',
  'Send prompt': '프롬프트 전송',

  // Page: /404
  'Page not found': '페이지를 찾을 수 없습니다',

  // Page: /
  'Let your agents take it from here': '당신의 에이전트에게 맡기세요',
  'Delegate complex tasks to your own AI teams':
    '복잡한 작업을 자신의 AI 팀에 위임하세요',
  'Failed to get response from LLM. Please try again later.':
    'LLM의 응답을 받지 못했습니다. 나중에 다시 시도하세요.',

  // LLM Integration
  'No LLM provider configured. Please [configure one in Settings]({path}).':
    '구성된 LLM 공급자가 없습니다. [설정에서 하나 구성하세요]({path}).',

  // MarkdownRenderer
  'Thinking…': '생각 중…',
  Thoughts: '생각',

  // AgentsPage
  'My Agents ({count})': '내 에이전트 ({count})',
  'Built-in Agents ({count})': '내장 에이전트 ({count})',

  // AgentRunPage
  'View and manage your past conversations': '이전 대화를 보고 관리하세요',
  'Loading agent and conversation…': '에이전트 및 대화 로딩 중…',
  Back: '뒤로',
  'Conversation ID:': '대화 ID:',
  You: '당신',
  'Continue the conversation…': '대화를 계속하세요…',
  'Start chatting with {agentName}…': '{agentName}와(과) 대화를 시작하세요…',
  'this agent': '이 에이전트',
  'System Prompt': '시스템 프롬프트',
  'No system prompt defined.': '정의된 시스템 프롬프트가 없습니다.',

  // Artifacts side panel
  Artifacts: '아티팩트',
  'No artifacts created yet': '아직 생성된 아티팩트가 없습니다',

  // Task
  Requirements: '요구 사항',
  'Task Timeline': '작업 일정',

  // Background Image
  'Please select an image file': '이미지 파일을 선택해주세요',
  'Image file is too large. Please select a file smaller than {size}MB.':
    '{size}MB보다 작은 파일을 선택해주세요. 이미지 파일이 너무 큽니다.',
  'Background image updated': '배경 이미지가 업데이트되었습니다',
  'Failed to process image file': '이미지 파일 처리에 실패했습니다',
  'Please drop an image file': '이미지 파일을 드래그 해주세요',
  'Drop your image here': '여기에 이미지를 드롭하세요',
  'Release to set as background': '배경으로 설정하려면 놓아주세요',
  'Background Image': '배경 이미지',
  'Set a custom background image for the home page':
    '홈페이지의 사용자 정의 배경 이미지 설정',
  'Change Background': '배경 변경',
  'Upload Background': '배경 업로드',
  'Background image removed': '배경 이미지가 제거되었습니다',
  'Configure your platform preferences': '플랫폼 설정을 구성하세요',
  Undo: '실행 취소',
  'The URL does not point to a valid image':
    'URL이 유효한 이미지를 가리키지 않습니다',
  'Failed to load image from URL. Please check the URL and try again.':
    'URL에서 이미지를 로드하지 못했습니다. URL을 확인하고 다시 시도해주세요.',
  'Please drop an image file or drag an image from a website':
    '이미지 파일을 드롭하거나 웹사이트에서 이미지를 드래그해주세요',

  // About Page
  'AI Teams': 'AI 팀',
  'Multiple AI agents working together on complex tasks.':
    '복잡한 작업에서 협력하는 여러 AI 에이전트.',
  'LLM Independent': 'LLM 독립적',
  'Works with OpenAI, Anthropic, Google Gemini, and more':
    'OpenAI, Anthropic, Google Gemini 등과 함께 작동합니다',
  'Privacy First': '개인정보 우선',
  'All data stays on your device. No servers, no tracking.':
    '모든 데이터는 당신의 기기에 머무릅니다. 서버도 추적도 없습니다.',
  'Browser Native': '브라우저 네이티브',
  'Works entirely in your browser. No installation required.':
    '브라우저에서 완전히 작동합니다. 설치가 필요하지 않습니다.',
  'Offline Ready': '오프라인 지원',
  'Works without internet after initial load.':
    '초기 로드 후 인터넷 없이도 작동합니다.',
  'Open Source': '오픈 소스',
  '{license} licensed. Built by the community, for the community.':
    '{license} 라이선스. 커뮤니티에 의해, 커뮤니티를 위해 구축됨.',
  'Configure your LLM provider': 'LLM 공급자 구성',
  'Describe your task': '작업 설명',
  'Be as detailed as possible to get the best results':
    '최상의 결과를 얻으려면 가능한 한 상세하게 설명하세요',
  'Watch AI agents collaborate': 'AI 에이전트 협업 관찰',
  'See how different agents work together to complete your task':
    '다양한 에이전트가 어떻게 함께 작업을 완료하는지 확인하세요',
  'Guide when needed': '필요할 때 안내',
  'Provide feedback and guidance to the agents as they work':
    '에이전트가 작업할 때 피드백과 안내를 제공하세요',
  'Our Vision': '우리의 비전',
  "Democratize AI agent delegation with a universally accessible, privacy-conscious, open-source solution that runs entirely in the browser. AI augmentation isn't a luxury for the few, but a fundamental tool available to all.":
    '브라우저에서 완전히 실행되는 보편적으로 접근 가능하고 개인정보를 중시하는 오픈 소스 솔루션으로 AI 에이전트 위임을 민주화합니다. AI 증강은 소수를 위한 사치품이 아니라 모든 사람이 사용할 수 있는 기본 도구입니다.',
  'Key Features': '주요 기능',
  'Key Benefits': '주요 장점',
  'How It Works': '작동 방식',
  FAQ: 'FAQ',
  'Is my data private?': '내 데이터는 안전한가요?',
  'Yes! All data processing happens locally in your browser. We do not collect or store any of your data.':
    '네! 모든 데이터 처리는 브라우저에서 로컬로 발생합니다. 우리는 귀하의 데이터를 수집하거나 저장하지 않습니다.',
  'Which LLM providers are supported?': '어떤 LLM 공급자가 지원되나요?',
  'We support {llmList}, and any provider compatible with the OpenAI API spec.':
    '{llmList} 및 OpenAI API 규격과 호환되는 모든 공급자를 지원합니다.',
  'Do I need to install anything?': '설치해야 할 것이 있나요?',
  'No installation is required. The app runs entirely in your web browser.':
    '설치가 필요하지 않습니다. 앱은 웹 브라우저에서 완전히 실행됩니다.',
  'Is this open source?': '이것은 오픈 소스인가요?',
  'Yes! The project is open source and available on GitHub under the {license} license.':
    '네! 이 프로젝트는 오픈 소스이며 {license} 라이선스 하에 GitHub에서 사용할 수 있습니다.',
  'View on GitHub': 'GitHub에서 보기',

  // Tasks Page
  'Manage and monitor tasks for your organization':
    '조직의 작업을 관리하고 모니터링하세요',
  'Loading tasks…': '작업 로딩 중…',
  tasks: '작업',
  'In Progress': '진행 중',

  // Task Page
  'Task Details': '작업 세부사항',
  'Task Created': '작업 생성됨',
  'Agent Assigned': '에이전트 할당됨',
  'Artifact Created': '아티팩트 생성됨',
  'User Message': '사용자 메시지',
  'Agent Response': '에이전트 응답',
  'Requirement Satisfied': '요구사항 충족됨',
  'Task Completed': '작업 완료됨',
  'Task Branched': '작업 분기됨',
  'Sub-task Created': '하위 작업 생성됨',
  'Sub-task Completed': '하위 작업 완료됨',
  'Requirement Detected': '요구사항 감지됨',
  'Requirement Validated': '요구사항 검증됨',
  'Task Started': '작업 시작됨',
  'All requirements satisfied': '모든 요구사항 충족됨',
  'No task ID provided': '작업 ID가 제공되지 않음',
  'Task not found': '작업을 찾을 수 없음',
  'Failed to load task data': '작업 데이터 로드 실패',
  'View Content': '내용 보기',
  'Loading task details…': '작업 세부사항 로딩 중…',
  'Task Not Found': '작업을 찾을 수 없음',
  'The requested task could not be found.': '요청한 작업을 찾을 수 없습니다.',
  'Task Steps': '작업 단계',
  'Validation Criteria': '검증 기준',

  // SubTaskTree Component
  'Task Hierarchy': '작업 계층 구조',
  'Expand All': '모두 확장',
  'Collapse All': '모두 축소',
  'Parent Task': '상위 작업',
  'Sibling Tasks': '형제 작업',
  'Current Task & Sub-tasks': '현재 작업 및 하위 작업',
  'Main Task & Sub-tasks': '주요 작업 및 하위 작업',
  'Task Dependencies': '작업 종속성',
  'Total Sub-tasks': '총 하위 작업',

  // Common actions
  Retry: '다시 시도',
  Refresh: '새로고침',
  Close: '닫기',
  Edit: '수정',
  Delete: '삭제',
  Save: '저장',
  Remove: '제거',
  Cancel: '취소',
  'Copy to clipboard': '클립보드에 복사',

  // Database Administration
  'Loading database information…': '데이터베이스 정보 로딩 중…',
  'Failed to load database information': '데이터베이스 정보 로드 실패',
  'Database Administration': '데이터베이스 관리',
  'Reset Database': '데이터베이스 초기화',
  '{n} records': '{n} 레코드',
  Records: '레코드',
  Indexes: '인덱스',
  Size: '크기',
  'Search {store} by {categories}…': '검색 {store}에서 {categories}…',
  'All Records': '모든 레코드',
  'Filtered Records': '필터링된 레코드',
  ID: 'ID',
  Preview: '미리보기',
  Actions: '작업',
  View: '보기',
  'No data recorded': '기록된 데이터 없음',
  'Record Details': '레코드 세부 정보',

  // Searchable collections & indexes
  agents: '에이전트',
  conversations: '대화',
  knowledgeItems: '지식 항목',
  folderWatchers: '폴더 감시자',
  credentials: '자격 증명',
  artifacts: '아티팩트',
  // tasks: '작업',
  contexts: '컨텍스트',
  langfuse_config: 'langfuse 구성',
  id: 'ID',
  name: '이름',
  description: '설명',
  role: '역할',
  tags: '태그',
  size: '크기',
  type: '유형',
  createdAt: '생성일',
  fileType: '파일 유형',
  content: '내용',
  contentHash: '내용 해시',
  path: '경로',
  provider: '제공자',
  model: '모델',
  encryptedApiKey: '암호화된 API 키',
  baseUrl: '기본 URL',
  timestamp: '타임스탬프',
  order: '순서',
  mimeType: 'MIME 유형',
  lastModified: '마지막 수정',
  syncSource: '동기화 소스',
  lastSyncCheck: '마지막 동기화 확인',

  // Sharing
  'Share the platform': '플랫폼 공유',
  'Export the platform settings to another device or share it with others':
    '플랫폼 설정을 다른 장치로 내보내거나 다른 사람과 공유합니다.',
  'Export your current agents and LLM provider settings and share it via URL or QR code.':
    '현재 에이전트 및 LLM 공급자 설정을 내보내고 URL 또는 QR 코드를 통해 공유합니다.',
  'Include my {n} agents': '내 {n} 에이전트 포함',
  'Now you can share the platform configuration…':
    '이제 플랫폼 구성을 공유할 수 있습니다…',
  'Either with this URL:': '이 URL로:',
  'Or this QR Code:': '또는 이 QR 코드로:',
  'QR code generation failed. You can still use the URL above.':
    'QR 코드 생성에 실패했습니다. 위의 URL을 계속 사용할 수 있습니다.',
  'Platform Preparation': '플랫폼 준비',
  'Password (optional)': '비밀번호 (선택 사항)',
  Password: '비밀번호',
  Continue: '계속',
  'Setting the platform up…': '플랫폼 설정 중…',
} as const
