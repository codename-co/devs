import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Platform Settings': '플랫폼 설정',
  'Configure AI providers, models and platform defaults for your organization':
    '조직을 위한 LLM 공급자, 모델 및 플랫폼의 기본 설정을 구성합니다.',
  Appearance: '외관',
  'Choose your preferred language': '선호하는 언어를 선택하세요',
  'Interface Language': '인터페이스 언어',
  'Platform Name': '플랫폼 이름',
  'Secure Storage': '안전한 저장소',
  'Manage your encryption keys and secure storage':
    '암호화 키 및 안전한 저장소를 관리하세요',
  'Master Key': '마스터 키',
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
  'AI Providers': 'LLM 공급자',
  'Choose your AI provider, manage your API credentials':
    'LLM 공급자를 선택하고 API 자격 증명을 관리하세요',
  'Add Provider': '공급자 추가',
  'No providers configured. Add one to get started.':
    '구성된 공급자가 없습니다. 시작하려면 하나 추가하세요.',
  'Set as Default': '기본값으로 설정',
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
  'Clear database': '데이터베이스 지우기',
  'Are you sure you want to clear all data? This action cannot be undone.':
    '모든 데이터를 지우시겠습니까? 이 작업은 취소할 수 없습니다.',
  'Database cleared successfully': '데이터베이스가 성공적으로 지워졌습니다',
  'Failed to clear database': '데이터베이스 지우기에 실패했습니다',
  'Database repaired successfully': '데이터베이스가 성공적으로 복구되었습니다',
  'Failed to repair database': '데이터베이스 복구에 실패했습니다',
  Created: '생성됨',
  Updated: '업데이트됨',
  'Add LLM Provider': 'LLM 공급자 추가',
  'Select Provider': '공급자 선택',
  'Server URL (Optional)': '서버 URL (선택 사항)',
  'API Key': 'API 키',
  'Enter your API key': 'API 키를 입력하세요',
  'Format:': '형식:',
  'Base URL': '기본 URL',
  Model: '모델',
  'Select a model': '모델 선택',
  'Custom Model Name': '사용자 정의 모델 이름',
  'Enter model name': '모델 이름을 입력하세요',
  'Validate & Add': '유효성 검사 및 추가',
  'Fetch Available Models': '사용 가능한 모델 가져오기',
  'Use Fetched Models': '가져온 모델 사용',
  'Manual Input': '수동 입력',
  'Model Name': '모델 이름',
  'Enter the exact name of the model you want to use':
    '사용하려는 모델의 정확한 이름을 입력하세요',
  'Available Models': '사용 가능한 모델',
  'Default Provider': '기본 공급자',
  'Provider set as default': '공급자가 기본값으로 설정되었습니다',
  'Advanced Settings': '고급 설정',
  '{files} files cached ({size})': '{files}개의 파일이 캐시됨 ({size})',
  'Local models cache': '로컬 모델 캐시',
  'Clear cache': '캐시 지우기',
  'Downloaded models are cached for 1 year to avoid re-downloading.':
    '다운로드된 모델은 1년 동안 캐시되어 재다운로드를 방지합니다.',
  'Local LLMs run entirely in your browser':
    '로컬 LLM은 브라우저에서 완전히 실행됩니다.',
  'No data is sent to external servers. Download happens at first use.':
    '외부 서버로 전송되는 데이터가 없습니다. 다운로드는 처음 사용 시 발생합니다.',
  'Requirements:': '요구 사항:',
  'WebGPU support': 'WebGPU 지원',
  'At least 8GB of RAM': '최소 8GB RAM',
  'Storage space for model files (2-4GB)': '모델 파일을 위한 저장 공간 (2-4GB)',
  'Your device:': '당신의 장치:',
  'WebGPU:': 'WebGPU:',
  'Brand: {brand}': '브랜드: {brand}',
  'Model: {model}': '모델: {model}',
  'Memory: {memory} or more (imprecise)': '메모리: {memory} 이상 (부정확)',
  'Vendor: {vendor}': '공급업체: {vendor}',
  'Browser: {browser}': '브라우저: {browser}',
  'Enable Speech-to-Text': '음성-텍스트 변환 활성화',
  'Allow voice input using your device microphone in the prompt area':
    '프롬프트 영역에서 기기 마이크를 사용한 음성 입력 허용',
  'Hide Default Agents': '기본 에이전트 숨기기',
  'Only show your custom agents in the agent picker and agents page':
    '에이전트 선택기 및 에이전트 페이지에서 사용자 정의 에이전트만 표시',
  Features: '기능',
  Voice: '음성',
  'Configure how you interact with agents':
    '에이전트와 상호 작용하는 방식을 구성합니다',
  'Auto Memory Learning': '자동 메모리 학습',
  'Automatically extract learnable information from conversations to build agent memory':
    '대화에서 학습 가능한 정보를 자동으로 추출하여 에이전트 메모리 구축',
  'Quick Reply Suggestions': '빠른 답변 제안',
  'Show AI-generated follow-up suggestions after each assistant response':
    '각 어시스턴트 응답 후 AI가 생성한 후속 제안 표시',
  'Web Search Grounding': '웹 검색 기반 응답',
  'Allow AI models to search the web for up-to-date information (supported by Google Gemini and Anthropic Claude)':
    'AI 모델이 최신 정보를 위해 웹을 검색할 수 있도록 허용 (Google Gemini 및 Anthropic Claude 지원)',
  'Global System Instructions': '전역 시스템 지침',
  "These instructions will be prepended to every agent's instructions":
    '이 지침은 모든 에이전트의 지침 앞에 추가됩니다',
  'Enter global instructions that apply to all agents...':
    '모든 에이전트에 적용되는 전역 지침을 입력하세요...',
  'Show Context Panel': '컨텍스트 패널 표시',
  'Display the contextual information panel on the right side of the screen':
    '화면 오른쪽에 컨텍스트 정보 패널 표시',
  'Make the platform your own': '플랫폼을 개인화하세요',
  'Share the platform': '플랫폼 공유',
  'Export the platform settings to another device or share it with others':
    '플랫폼 설정을 다른 기기로 내보내거나 다른 사용자와 공유',
  'Sync your data across devices using peer-to-peer connection':
    '피어 투 피어 연결을 사용하여 기기 간 데이터 동기화',
  'Server URL': '서버 URL',
  'URL of your Ollama server': 'Ollama 서버 URL',
  'Get your API key from': '다음에서 API 키 받기',
  'Enter model name manually': '모델 이름 수동 입력',
  'Fetching available models...': '사용 가능한 모델 가져오는 중...',
  'Enter the model name manually': '모델 이름을 수동으로 입력하세요',
  'models available': '사용 가능한 모델',
  'This provider is already configured': '이 제공업체는 이미 구성되어 있습니다',
  Computer: '컴퓨터',
  'Sandbox runtimes and system resources': '샌드박스 런타임 및 시스템 리소스',
  'Sandbox Runtimes': '샌드박스 런타임',
  Running: '실행 중',
  Executing: '실행 중',
  Loading: '로딩 중',
  Idle: '대기 중',
  Error: '오류',
  Start: '시작',
  Stop: '중지',
  'Pre-load the {runtime} runtime': '{runtime} 런타임 사전 로드',
  'Terminate the {runtime} runtime': '{runtime} 런타임 종료',
  'Run a test snippet in the {runtime} sandbox':
    '{runtime} 샌드박스에서 테스트 코드 실행',
  Try: '시도',
  'Isolated code execution environments running entirely in WebAssembly. Python uses a Web Worker; JavaScript runs in a lightweight QuickJS VM.':
    'WebAssembly에서 완전히 실행되는 격리된 코드 실행 환경. Python은 Web Worker를 사용하고, JavaScript는 경량 QuickJS VM에서 실행됩니다.',
  CPU: 'CPU',
  '{used} / {total} cores': '{used} / {total} 코어',
  'CPU usage': 'CPU 사용량',
  Memory: '메모리',
  'Memory usage': '메모리 사용량',
  Storage: '저장소',
  'Storage usage': '저장소 사용량',
  'Device Information': '장치 정보',
  Device: '장치',
  'GPU Vendor': 'GPU 제조사',
  'GPU Renderer': 'GPU 렌더러',
  WebGPU: 'WebGPU',
  Supported: '지원됨',
  'Not Supported': '지원되지 않음',
  'Local LLM (Browser)': '로컬 LLM (브라우저)',
  'Runs AI models entirely in your browser using WebGPU. No data is sent to external servers.':
    'WebGPU를 사용하여 브라우저에서 AI 모델을 완전히 실행합니다. 외부 서버로 데이터가 전송되지 않습니다.',
  'Default Model': '기본 모델',
  'Loaded Model': '로드된 모델',
  'No model loaded': '로드된 모델 없음',
  Unload: '언로드',
  'Unload model to free memory': '메모리 해제를 위해 모델 언로드',
  'WebGPU is not supported on this device. Local LLM inference requires a WebGPU-compatible browser.':
    '이 장치에서 WebGPU가 지원되지 않습니다. 로컬 LLM 추론에는 WebGPU 호환 브라우저가 필요합니다.',
  'Your device has less than 8GB of RAM. Local inference may be slow or unavailable for larger models.':
    '장치에 8GB 미만의 RAM이 있습니다. 로컬 추론이 느리거나 큰 모델에 사용할 수 없을 수 있습니다.',

  'System Resources': '시스템 리소스',
} as const
