import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Page titles
  Marketplace: '마켓플레이스',
  'Expand your platform capabilities with community extensions':
    '커뮤니티 확장 프로그램으로 플랫폼 기능 확장하기',
  'Find and install apps, agents, connectors, and tools from the community':
    '커뮤니티에서 앱, 에이전트, 커넥터, 도구를 찾아 설치하세요',

  // Tabs
  All: '전체',
  Apps: '앱',
  Agents: '에이전트',
  Connectors: '커넥터',
  Tools: '도구',
  Installed: '설치됨',
  Available: '사용 가능',

  // Search
  'Search extensions...': '확장 프로그램 검색...',
  'No description found': '설명을 찾을 수 없습니다',
  'Try a different search term': '다른 검색어를 시도해 보세요',

  // Categories
  Categories: '카테고리',
  Productivity: '생산성',
  Development: '개발',
  Communication: '커뮤니케이션',
  'Data & Analytics': '데이터 및 분석',
  'AI & Machine Learning': 'AI 및 머신러닝',
  Utilities: '유틸리티',

  // Filters
  Filter: '필터',
  'Sort by': '정렬',
  'Most popular': '인기순',
  'Recently updated': '최근 업데이트순',
  'Highest rated': '평점 높은순',
  Newest: '최신순',
  Alphabetical: '가나다순',

  // Extension Card
  Install: '설치',
  'Update available': '업데이트 가능',
  Update: '업데이트',
  Uninstall: '제거',
  Configure: '설정',
  Enable: '활성화',
  Disable: '비활성화',
  Verified: '인증됨',
  Official: '공식',
  Community: '커뮤니티',
  '{n} downloads': '{n} 다운로드',
  '{n} reviews': '{n} 리뷰',
  Free: '무료',
  Premium: '프리미엄',

  // Extension Detail
  Overview: '개요',
  Reviews: '리뷰',
  Changelog: '변경 로그',
  Documentation: '문서',
  'Version {v}': '버전 {v}',
  'Last updated': '마지막 업데이트',
  Author: '작성자',
  License: '라이선스',
  Website: '웹사이트',
  'Report issue': '문제 신고',
  'View source': '소스 보기',
  Permissions: '권한',
  'This extension requires:': '이 확장 프로그램은 다음이 필요합니다:',
  Dependencies: '의존성',
  'Requires these extensions:': '다음 확장 프로그램이 필요합니다:',
  Screenshots: '스크린샷',
  'Similar extensions': '유사한 확장 프로그램',

  // Reviews
  'Write a review': '리뷰 작성',
  Rating: '평점',
  'Your review': '리뷰 내용',
  'Submit review': '리뷰 제출',
  Helpful: '도움됨',
  '{n} people found this helpful': '{n}명이 도움이 되었다고 표시함',
  'Report review': '리뷰 신고',

  // Install flow
  'Installing...': '설치 중...',
  'Installation complete': '설치 완료',
  'Installation failed': '설치 실패',
  'This extension requires the following permissions:':
    '이 확장 프로그램은 다음 권한이 필요합니다:',
  Allow: '허용',
  Deny: '거부',
  Cancel: '취소',
  'Confirm installation': '설치 확인',

  // Publish
  'Publish Extension': '확장 프로그램 게시',
  'Share your extension with the community':
    '커뮤니티와 확장 프로그램을 공유하세요',
  'Create New Extension': '새 확장 프로그램 만들기',
  'Upload Extension': '확장 프로그램 업로드',
  'Upload a .yaml or .devs file': '.yaml 또는 .devs 파일 업로드',
  'Drop your extension file here': '확장 프로그램 파일을 여기에 드롭하세요',
  'Or browse files': '또는 파일 찾아보기',
  Validate: '검증',
  'Validating...': '검증 중...',
  'Validation successful': '검증 성공',
  'Validation failed': '검증 실패',
  'Fix the following issues:': '다음 문제를 수정하세요:',
  Publish: '게시',
  'Publishing...': '게시 중...',
  'Published successfully': '성공적으로 게시됨',
  'Publish failed': '게시 실패',
  Draft: '초안',
  Published: '게시됨',
  'Under review': '검토 중',
  Rejected: '거부됨',
  Edit: '편집',
  Delete: '삭제',
  Unpublish: '게시 취소',
  'View in marketplace': '마켓플레이스에서 보기',

  // Empty states
  'No extensions found': '확장 프로그램을 찾을 수 없습니다',
  'Be the first to publish an extension!':
    '첫 번째 확장 프로그램을 게시해 보세요!',
  'No installed extensions': '설치된 확장 프로그램 없음',
  'Browse the marketplace to find useful extensions':
    '마켓플레이스에서 유용한 확장 프로그램을 찾아보세요',
  'No apps available': '사용 가능한 앱 없음',
  'No agents available': '사용 가능한 에이전트 없음',
  'No connectors available': '사용 가능한 커넥터 없음',
  'No tools available': '사용 가능한 도구 없음',

  // Coming soon placeholder
  'Coming Soon': '곧 출시',
  'The DEVS Marketplace is under development':
    'DEVS 마켓플레이스가 개발 중입니다',
  "Soon you'll be able to discover and install community-built apps, agents, connectors, and tools.":
    '곧 커뮤니티에서 만든 앱, 에이전트, 커넥터, 도구를 찾아 설치할 수 있습니다.',
  "Want to be notified when it's ready?": '준비되면 알림을 받으시겠습니까?',
  'Join the waitlist': '대기자 명단에 등록',
  'Learn more about building extensions':
    '확장 프로그램 만들기에 대해 자세히 알아보기',

  // Trust levels
  Unverified: '미인증',
  'This extension has been reviewed and verified by DEVS':
    '이 확장 프로그램은 DEVS에서 검토 및 인증되었습니다',
  'This extension is developed by the DEVS team':
    '이 확장 프로그램은 DEVS 팀에서 개발했습니다',
  'This extension has not been reviewed yet':
    '이 확장 프로그램은 아직 검토되지 않았습니다',
  'This extension is community-maintained':
    '이 확장 프로그램은 커뮤니티에서 관리합니다',

  // Translation Page
  Translation: '번역',
  'Translate text using local AI': '로컬 AI를 사용하여 텍스트 번역',
  'Source Language': '원본 언어',
  'Target Language': '대상 언어',
  'Detected language: {lang}': '감지된 언어: {lang}',
  'Type more text to detect language...':
    '언어를 감지하려면 더 많은 텍스트를 입력하세요...',
  'Swap languages': '언어 교환',
  'Enter text to translate': '번역할 텍스트 입력',
  'Type or paste text here...': '여기에 텍스트를 입력하거나 붙여넣기...',
  'Translation will appear here...': '번역 결과가 여기에 표시됩니다...',
  'Copy translation': '번역 복사',
  Translate: '번역',
  'Translating...': '번역 중...',
  Clear: '지우기',
  'Translation failed. Please try again.':
    '번역에 실패했습니다. 다시 시도해 주세요.',

  // Extension Detail Modal
  'Extension type': '확장 유형',
  Copy: '복사',
  'Open in new tab': '새 탭에서 열기',
  'Privacy Policy': '개인정보 보호정책',

  // Hero Banner
  'Supercharge your AI workflows': 'AI 워크플로우를 강화하세요',
  'One-click install': '클릭 한 번으로 설치',
  'Community-driven': '커뮤니티 주도',
  '100% open source': '100% 오픈 소스',
  'Build my own extension': '나만의 확장 프로그램 만들기',

  // New Extension Page
  'Create Extension': '확장 프로그램 만들기',
  'Generate a custom extension using AI':
    'AI를 사용하여 맞춤 확장 프로그램 생성',
  'Back to Marketplace': '마켓플레이스로 돌아가기',
  'Build with AI': 'AI로 만들기',
  'Describe what you want to create and let AI generate a fully functional extension for you.':
    '만들고 싶은 것을 설명하면 AI가 완전히 작동하는 확장 프로그램을 생성해 드립니다.',
  'Step 1': '1단계',
  'Step 2': '2단계',
  'Choose extension type': '확장 프로그램 유형 선택',
  'Describe your extension': '확장 프로그램 설명',
  App: '앱',
  'Full UI applications with interactive pages':
    '인터랙티브 페이지가 있는 완전한 UI 애플리케이션',
  'A pomodoro timer app, a habit tracker, a mood journal with charts':
    '뽀모도로 타이머 앱, 습관 추적기, 차트가 있는 기분 일기',
  Agent: '에이전트',
  'AI agents with specialized instructions and personality':
    '전문화된 지시사항과 성격을 가진 AI 에이전트',
  'A code reviewer agent, a writing coach, a data analysis specialist':
    '코드 리뷰어 에이전트, 작문 코치, 데이터 분석 전문가',
  Connector: '커넥터',
  'Integrations with external services and APIs': '외부 서비스 및 API와의 통합',
  'A GitHub integration, a Slack connector, a weather data provider':
    'GitHub 통합, Slack 커넥터, 날씨 데이터 제공자',
  Tool: '도구',
  'Utility functions that agents can use':
    '에이전트가 사용할 수 있는 유틸리티 함수',
  'A URL shortener, a JSON formatter, a unit converter, a calculator':
    'URL 단축기, JSON 포맷터, 단위 변환기, 계산기',
  Examples: '예시',
  'Describe what your extension should do, its features, and how it should look...':
    '확장 프로그램이 무엇을 해야 하는지, 기능, 어떻게 보여야 하는지 설명하세요...',
  'Tips for better results': '더 나은 결과를 위한 팁',
  'Be specific about the features you want':
    '원하는 기능을 구체적으로 설명하세요',
  'Mention any UI preferences (colors, layout)':
    'UI 선호도(색상, 레이아웃)를 언급하세요',
  'Include example use cases': '예시 사용 사례를 포함하세요',
  'Describe the target users': '대상 사용자를 설명하세요',
  'Please provide a description for your extension':
    '확장 프로그램에 대한 설명을 제공해 주세요',
  'Failed to generate extension': '확장 프로그램 생성 실패',
  'Extension created successfully!':
    '확장 프로그램이 성공적으로 생성되었습니다!',
  'Generate Extension': '확장 프로그램 생성',
  'Generating...': '생성 중...',
  'Creating your extension...': '확장 프로그램을 생성하는 중...',
  'This may take a few seconds': '몇 초 정도 걸릴 수 있습니다',

  // Custom Extensions
  Custom: '사용자 정의',
  'AI-generated': 'AI 생성',
  'My extensions': '내 확장 프로그램',

  // Extension Editor Page
  'Edit and refine your extension': '확장 프로그램 편집 및 개선',
  'Extension not found': '확장 프로그램을 찾을 수 없습니다',
  'Editor tabs': '편집기 탭',
  Preview: '미리보기',
  Code: '코드',
  Chat: '채팅',
  Save: '저장',
  Done: '완료',
  Unsaved: '저장되지 않음',
  'Extension saved': '확장 프로그램이 저장되었습니다',
  'Failed to save extension': '확장 프로그램을 저장하지 못했습니다',
  'Failed to load extension': '확장 프로그램을 로드하지 못했습니다',
  'You have unsaved changes. Save before leaving?':
    '저장되지 않은 변경 사항이 있습니다. 나가기 전에 저장하시겠습니까?',
  "Your extension has been created! You can preview it, edit the code directly, or describe changes you'd like me to make.":
    '확장 프로그램이 생성되었습니다! 미리보기하거나 코드를 직접 편집하거나 원하는 변경 사항을 설명할 수 있습니다.',
  "Describe changes you'd like to make": '원하는 변경 사항을 설명하세요',
  'The AI will help you refine your extension':
    'AI가 확장 프로그램을 개선하는 데 도움을 줄 것입니다',
  "Describe what you'd like to change...": '변경하고 싶은 내용을 설명하세요...',
  Send: '보내기',
  'AI-suggested code changes are automatically applied':
    'AI가 제안한 코드 변경 사항이 자동으로 적용됩니다',
  'No AI provider configured': 'LLM 제공자가 구성되지 않았습니다',
  'Unknown error': '알 수 없는 오류',
  'Sorry, I encountered an error: {error}':
    '죄송합니다, 오류가 발생했습니다: {error}',
  'Code applied successfully!': '코드가 성공적으로 적용되었습니다!',
  'Code changes applied': '코드 변경 사항이 적용되었습니다',
  'Sorry, I encountered an error parsing the code changes.':
    '죄송합니다, 코드 변경 사항을 파싱하는 중 오류가 발생했습니다.',

  // Delete extension
  'Are you sure you want to delete this extension?':
    '이 확장 프로그램을 삭제하시겠습니까?',
  'This action cannot be undone.': '이 작업은 취소할 수 없습니다.',

  // Duplicate extension
  'Duplicate & edit': '복제 및 편집',

  // Run app
  Run: '실행',

  // Manual creation
  'or create manually': '또는 수동으로 생성',
}
