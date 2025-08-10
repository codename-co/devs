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
  'New Mission': '새로운 미션',
  'New Team': '새로운 팀',
  Missions: '미션',
  Teams: '팀',
  Settings: '설정',
  Agents: '에이전트',
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
  'Drop files here…': '여기에 파일을 드롭하세요…',
  'Use microphone': '마이크 사용',
  'Send prompt': '프롬프트 전송',

  // Page: /404
  'Page not found': '페이지를 찾을 수 없습니다',

  // Page: /
  'Let {productName} take it from here': '{productName}에게 맡기세요',
  'Delegate complex tasks to your own AI teams':
    '복잡한 작업을 자신의 AI 팀에 위임하세요',
  'Failed to get response from LLM. Please try again later.':
    'LLM의 응답을 받지 못했습니다. 나중에 다시 시도하세요.',

  // Page: /settings
  'Platform Settings': '플랫폼 설정',
  'Configure LLM providers, models and platform defaults for your organization':
    '조직을 위한 LLM 공급자, 모델 및 플랫폼의 기본 설정을 구성합니다.',
  'Language Settings': '언어 설정',
  'Choose your preferred language': '선호하는 언어를 선택하세요',
  'Interface Language': '인터페이스 언어',
  'Secure Storage': '안전한 저장소',
  'Manage your encryption keys and secure storage':
    '암호화 키 및 안전한 저장소를 관리하세요',
  'Master Key': '마스터 키',
  'Copy Master Key': '마스터 키 복사',
  'Master key copied to clipboard': '마스터 키가 클립보드에 복사되었습니다',
  'Failed to copy master key': '마스터 키 복사에 실패했습니다',
  'Regenerate Master Key': '마스터 키 재생성',
  'Are you sure you want to regenerate the master key? This will invalidate all existing encrypted data.':
    '마스터 키를 재생성하시겠습니까? 이 작업은 모든 기존 암호화된 데이터를 무효화합니다.',
  'Master key regenerated successfully':
    '마스터 키가 성공적으로 재생성되었습니다',
  'Failed to regenerate master key': '마스터 키 재생성에 실패했습니다',
  'Your master key is used to encrypt all sensitive data stored locally. Keep it safe and secure.':
    '귀하의 마스터 키는 로컬에 저장된 모든 민감한 데이터를 암호화하는 데 사용됩니다. 안전하게 보관하세요.',
  'LLM Providers': 'LLM 공급자',
  'Manage your API credentials': 'API 자격 증명을 관리하세요',
  'Add Provider': '공급자 추가',
  'No providers configured. Add one to get started.':
    '구성된 공급자가 없습니다. 시작하려면 하나 추가하세요.',
  'Secure storage is locked': '안전한 저장소가 잠겨 있습니다',
  'Enter your master password to unlock':
    '잠금을 해제하려면 마스터 비밀번호를 입력하세요',
  'Master password': '마스터 비밀번호',
  Unlock: '잠금 해제',
  'Storage unlocked': '저장소 잠금 해제',
  'Invalid password': '잘못된 비밀번호',
  'Please fill in all required fields': '모든 필수 필드를 입력하세요',
  'Invalid API key': '잘못된 API 키',
  'Credential added successfully': '자격 증명이 성공적으로 추가되었습니다',
  'Failed to add credential': '자격 증명 추가에 실패했습니다',
  'Credential deleted': '자격 증명이 삭제되었습니다',
  'Failed to delete credential': '자격 증명 삭제에 실패했습니다',
  'Database Management': '데이터베이스 관리',
  'Export, import, or clear your local database':
    '로컬 데이터베이스를 내보내거나 가져오거나 지웁니다',
  'Dump your entire database to a JSON file':
    '전체 데이터베이스를 JSON 파일로 내보냅니다',
  'Backup database': '데이터베이스 백업',
  'Restore your database from a JSON file':
    'JSON 파일에서 데이터베이스를 복원합니다',
  'Restore database': '데이터베이스 복원',
  'Clear all data from the database': '데이터베이스의 모든 데이터를 지웁니다',
  'Clear database': '데이터베이스 지우기',
  'Database exported successfully': '데이터베이스가 성공적으로 내보내졌습니다',
  'Failed to export database': '데이터베이스 내보내기에 실패했습니다',
  'Database imported successfully ({count} items)':
    '데이터베이스가 성공적으로 가져와졌습니다 ({count} 항목)',
  'Failed to import database - invalid file format':
    '데이터베이스 가져오기에 실패했습니다 - 잘못된 파일 형식',
  'Are you sure you want to clear all data? This action cannot be undone.':
    '모든 데이터를 지우시겠습니까? 이 작업은 취소할 수 없습니다.',
  'Database cleared successfully': '데이터베이스가 성공적으로 지워졌습니다',
  'Failed to clear database': '데이터베이스 지우기에 실패했습니다',
  'Add LLM Provider': 'LLM 공급자 추가',
  'Select Provider': '공급자 선택',
  'Server URL (Optional)': '서버 URL (선택 사항)',
  'API Key': 'API 키',
  'Enter your API key': 'API 키를 입력하세요',
  'Format:': '형식:',
  'Base URL': '기본 URL',
  'https://api.example.com/v1': 'https://api.exemple.com/v1',
  Model: '모델',
  'Select a model': '모델 선택',
  'Custom Model Name': '사용자 정의 모델 이름',
  'Enter model name': '모델 이름을 입력하세요',
  Cancel: '취소',
  'Validate & Add': '유효성 검사 및 추가',

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

  // AgentsNewPage
  'Agent Builder': '에이전트 빌더',
  'Design and configure your custom specialized AI agent':
    '사용자 정의 전문 AI 에이전트를 설계하고 구성합니다',
  'Agent Profile': '에이전트 프로필',
  "Define your agent's personality and capabilities":
    '에이전트의 성격과 능력을 정의합니다',
  'Agent created successfully! Redirecting to agents list...':
    '에이전트가 성공적으로 생성되었습니다! 에이전트 목록으로 리디렉션 중...',
  Name: '이름',
  'e.g., Mike the Magician': '예: Mike the Magician',
  'A friendly name for your agent': '에이전트의 친근한 이름',
  Role: '역할',
  'e.g., Performs magic tricks and illusions': '예: 마술과 환상을 수행합니다',
  'What does your agent do?': '에이전트는 무엇을 하나요?',
  Instructions: '지침',
  "Detailed instructions for the agent's personality, skills, constraints, and goals…":
    '에이전트의 성격, 기술, 제약 및 목표에 대한 자세한 지침…',
  "Detailed instructions for the agent's behavior":
    '에이전트의 행동에 대한 자세한 지침',
  'Advanced Configuration': '고급 구성',
  'Configure advanced settings for your agent':
    '에이전트의 고급 설정을 구성합니다',
  Provider: '공급자',
  Temperature: '온도',
  'Lower values = more focused, Higher values = more creative':
    '낮은 값 = 더 집중됨, 높은 값 = 더 창의적임',
  'Creating...': '생성 중...',
  'Create Agent': '에이전트 생성',
  'Reset Form': '양식 재설정',
  'Live Preview': '실시간 미리보기',
  Clear: '지우기',
  'Start a conversation to test your agent':
    '에이전트를 테스트하기 위해 대화를 시작하세요',
  'The chat will use your current form configuration':
    '채팅은 현재 양식 구성을 사용합니다',
  'Ask {agentName} something…': '{agentName}에게 무언가 물어보세요…',
  Send: '전송',
} as const
