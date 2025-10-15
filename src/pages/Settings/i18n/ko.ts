import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Platform Settings': '플랫폼 설정',
  'Configure LLM providers, models and platform defaults for your organization':
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
  'LLM Providers': 'LLM 공급자',
  'Choose your LLM provider, manage your API credentials':
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
} as const
