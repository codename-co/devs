import type { I18n } from '@/i18n/locales'

export const ko: I18n = {
  // AgentPicker
  'Available Agents': '사용 가능한 에이전트',
  Scientists: '과학자',
  Advisors: '고문',
  Artists: '예술가',
  Philosophers: '철학자',
  Musicians: '음악가',
  Developers: '개발자',
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
  'Create and manage your AI specialists': 'AI 전문가를 생성하고 관리하세요',
  Methodologies: '방법론',
  Conversations: '대화',
  'Conversations history': '대화 기록',
  'Search conversations': '대화 검색',
  'Pin conversation': '대화 고정',
  'Unpin conversation': '대화 고정 해제',
  'Summarize conversation': '대화 요약',
  'Pin it': '고정하기',
  'Unpin it': '고정 해제',
  Pinned: '고정됨',
  'Message description': '메시지 설명',
  'Edit description': '설명 편집',
  'View full conversation': '전체 대화 보기',
  'Generating description...': '설명 생성 중...',
  'Generating summary...': '요약 생성 중...',
  'No pinned messages yet': '아직 고정된 메시지가 없습니다',
  'Show pinned only': '고정된 메시지만 보기',
  'Pinned conversations': '고정된 대화',
  Knowledge: '지식',
  Connectors: '커넥터',
  'New chat': '새로운 채팅',
  AGENTS: '에이전트',
  CONVERSATIONS: '대화',
  'View all agents': '모든 에이전트 보기',
  'View all history': '모든 기록 보기',
  Chat: '채팅',
  'Main navigation': '주 탐색',
  'New Agent': '새로운 에이전트',
  'New Methodology': '새로운 방법론',
  'Upgrade to Pro': 'Pro로 업그레이드',
  'Quick Actions': '빠른 작업',
  'Toggle Theme': '테마 전환',
  Theme: '테마',
  System: '시스템',
  Light: '라이트',
  Dark: '다크',
  About: '정보',
  Language: '언어',

  // PromptArea
  'Need something done?': '무언가 필요하신가요?',
  'More actions': '추가 작업',
  'Attach a file or image': '파일이나 이미지를 첨부하세요',
  'Upload new file': '새 파일 업로드',
  'Choose from knowledge base': '지식 베이스에서 선택',
  'Drop files here…': '여기에 파일을 드롭하세요…',
  'Speak to microphone': '마이크에 대고 말하기',
  'Send prompt': '프롬프트 전송',
  'Select an agent': '에이전트 선택',
  'No agents found': '에이전트를 찾을 수 없습니다',
  'Select a model': '모델 선택',
  'Add a model': '모델 추가',

  // Service worker
  'New features are waiting': '새로운 기능이 기다리고 있습니다',
  '{product} v{version} is ready to be installed.':
    '{product} v{version} 설치 준비 완료.',
  Upgrade: '업그레이드',

  // Page: /404
  'Page not found': '페이지를 찾을 수 없습니다',

  // LLM Integration
  'No LLM provider configured. Please [configure one in Settings]({path}).':
    '구성된 LLM 공급자가 없습니다. [설정에서 하나 구성하세요]({path}).',

  // MarkdownRenderer
  'Thinking…': '생각 중…',
  Thoughts: '생각',

  // AgentsPage
  'My Agents': '내 에이전트',
  'Built-in Agents': '내장 에이전트',
  'Built-in agents are pre-configured agents that come with the platform. They showcase various capabilities and can serve as inspiration for your own custom agents.':
    '내장 에이전트는 플랫폼과 함께 제공되는 사전 구성된 에이전트입니다. 다양한 기능을 보여주며 나만의 맞춤형 에이전트에 영감을 줄 수 있습니다.',

  // AgentRunPage
  'Find your past conversations': '과거 대화를 찾아보세요',
  'Loading agent and conversation…': '에이전트 및 대화 로딩 중…',
  Back: '뒤로',
  'Conversation ID:': '대화 ID:',
  You: '당신',
  'Continue the conversation…': '대화를 계속하세요…',
  'Start chatting with {agentName}…': '{agentName}와(과) 대화를 시작하세요…',
  'this agent': '이 에이전트',
  'System Prompt': '시스템 프롬프트',
  'No system prompt defined.': '정의된 시스템 프롬프트가 없습니다.',
  Memories: '기억',
  Global: '전역',
  'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.':
    '아직 학습된 기억이 없습니다. 대화를 시작하고 "대화에서 학습"을 사용하여 에이전트 기억을 구축하세요.',
  'Make Global': '전역으로 설정',
  'Remove Global': '전역 해제',
  'Agent Context': '에이전트 컨텍스트',

  // Artifacts side panel
  Artifacts: '아티팩트',
  'No artifacts created yet': '아직 생성된 아티팩트가 없습니다',

  // Task
  Requirements: '요구 사항',
  'Task Timeline': '작업 일정',
  'Active Agents': '활성 에이전트',

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
  'Make the platform your own': '플랫폼을 나만의 것으로 만들기',
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
  'Methodology Selected': '방법론 선택됨',
  'Phase Started': '단계 시작됨',
  'Phase Completed': '단계 완료됨',
  'Team Built': '팀 구성됨',
  'Role Assigned': '역할 할당됨',
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
  Export: '내보내기',
  'Copy to clipboard': '클립보드에 복사',
  Download: '다운로드',

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

  // Local LLM Loading Indicator
  'Initializing Local AI Model…': '로컬 AI 모델 초기화 중…',

  // Agent Memory System
  'Agent Memory': '에이전트 기억',
  'Review and manage what agents have learned':
    '에이전트가 학습한 내용 검토 및 관리',
  'Select Agent': '에이전트 선택',
  'All agents': '모든 에이전트',
  'Create Memory': '기억 생성',
  'Generate Synthesis': '종합 생성',
  'Total Memories': '총 기억',
  'Pending Review': '검토 대기 중',
  'High Confidence': '높은 신뢰도',
  'Low Confidence': '낮은 신뢰도',
  Approved: '승인됨',
  Synthesis: '종합',
  'No memories pending review': '검토 대기 중인 기억 없음',
  'No memories pending review for this agent':
    '이 에이전트에 대해 검토 대기 중인 기억 없음',
  'No approved memories yet': '아직 승인된 기억 없음',
  'Select an agent to view their memory synthesis':
    '기억 종합을 보려면 에이전트를 선택하세요',
  'Memory Synthesis for {agent}': '{agent}에 대한 기억 종합',
  'Last updated: {date}': '마지막 업데이트: {date}',
  'No synthesis generated yet': '아직 생성된 종합 없음',
  'Delete Memory': '기억 삭제',
  'Are you sure you want to delete this memory? This action cannot be undone.':
    '이 기억을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
  Facts: '사실',
  Preferences: '선호도',
  Behaviors: '행동',
  'Domain Knowledge': '도메인 지식',
  Relationships: '관계',
  Procedures: '절차',
  Corrections: '수정',
  'All Categories': '모든 카테고리',
  'Filter by category': '카테고리별 필터',
  high: '높음',
  medium: '중간',
  low: '낮음',
  High: '높음',
  Medium: '중간',
  Low: '낮음',
  'Confidence level: {level}': '신뢰도 수준: {level}',
  'Auto-approved': '자동 승인됨',
  'Review notes (optional)': '검토 메모 (선택 사항)',
  'Add notes about this memory...': '이 기억에 대한 메모 추가...',
  Forget: '잊기',
  Memorize: '기억하기',
  'Edit Memory': '기억 편집',
  'Memory content': '기억 내용',
  'Explain your changes...': '변경 사항 설명...',
  'Save & Approve': '저장 및 승인',
  'Select All': '모두 선택',
  'Deselect All': '모두 선택 해제',
  '{count} selected': '{count}개 선택됨',
  'Reject Selected': '선택 항목 거부',
  'Approve Selected': '선택 항목 승인',
  'Learned: {date}': '학습일: {date}',
  'Used {count} times': '{count}회 사용됨',
  'Memory approved': '기억 승인됨',
  'Memory rejected': '기억 거부됨',
  'Memory edited and approved': '기억 편집 및 승인됨',
  'Memory deleted': '기억 삭제됨',
  'Learn from conversation': '대화에서 학습',
  'Learning...': '학습 중...',
  'Memory learning failed': '기억 학습 실패',
  'New memories learned': '새로운 기억 학습됨',
  Insight: '통찰',
  'Review and approve to save': '검토 및 승인하여 저장',
  Dismiss: '무시',
  Fact: '사실',
  Preference: '선호도',
  Behavior: '행동',
  Relationship: '관계',
  Procedure: '절차',
  Correction: '수정',
  Title: '제목',
  Content: '내용',
  Category: '카테고리',
  Confidence: '신뢰도',
  Keywords: '키워드',
  'Comma-separated list of keywords': '쉼표로 구분된 키워드 목록',

  // Pinned Messages
  'Pin message': '메시지 고정',
  'Unpin message': '메시지 고정 해제',
  'Message pinned successfully': '메시지가 성공적으로 고정되었습니다',
  'Add a description to help you remember why this message is important.':
    '이 메시지가 중요한 이유를 기억하는 데 도움이 되는 설명을 추가하세요.',
  Description: '설명',
  'Brief description of why this is important...':
    '이것이 중요한 이유에 대한 간략한 설명...',
  'Pinned Messages': '고정된 메시지',
  'No pinned messages': '고정된 메시지 없음',
  'Messages you pin will appear here for quick reference.':
    '고정한 메시지가 여기에 빠른 참조를 위해 표시됩니다.',
  'View conversation': '대화 보기',
  'From conversation with {agentName}': '{agentName}와의 대화에서',
  'Filter by agent': '에이전트별 필터',
  'No pinned conversations': '고정된 대화 없음',
  'No conversations found': '대화를 찾을 수 없습니다',
  'View summary': '요약 보기',
  'No summary available': '요약을 사용할 수 없습니다',
  'No pinned messages yet. Pin important messages from conversations to make them available here.':
    '아직 고정된 메시지가 없습니다. 대화에서 중요한 메시지를 고정하여 여기에서 사용할 수 있게 하세요.',

  // Memory Learning
  'Learn from this message': '이 메시지에서 배우기',
  '{count} insights extracted': '{count}개의 인사이트가 추출되었습니다',
  'No new insights found in this message':
    '이 메시지에서 새로운 인사이트를 찾을 수 없습니다',

  // Agent Management
  'Edit Knowledge': '지식 편집',
  'Edit Knowledge for {name}': '{name}의 지식 편집',
  'Save Changes': '변경 사항 저장',
  'Delete Agent': '에이전트 삭제',
  'Are you sure you want to delete "{name}"? This action cannot be undone.':
    '"{name}"을(를) 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
} as const
