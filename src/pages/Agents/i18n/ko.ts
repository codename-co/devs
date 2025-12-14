import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
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
  Model: '모델',
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
  Current: '현재', // current conversation
  'No conversation history yet. Start chatting with this agent to build history.':
    '아직 대화 기록이 없습니다. 이 에이전트와 대화를 시작하여 기록을 만드세요.',
  'No instructions defined.': '정의된 지침이 없습니다.',
  '{count} messages': '{count}개의 메시지',
} as const
