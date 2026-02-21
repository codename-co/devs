import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Page
  'Agent Skills': '에이전트 스킬',
  'Discover, install, and manage specialized skills for your agents':
    '에이전트를 위한 전문 스킬을 발견, 설치 및 관리하세요',
  'Browse the SkillsMP registry of 227k+ Agent Skills':
    '227k+ 에이전트 스킬이 있는 SkillsMP 레지스트리를 검색하세요',

  // Tabs
  Discover: '발견',
  Installed: '설치됨',

  // Search
  'Search skills...': '스킬 검색...',
  'Search by keyword or describe what you need':
    '키워드로 검색하거나 필요한 것을 설명하세요',
  Keyword: '키워드',
  'AI Search': 'AI 검색',
  'No skills found': '스킬을 찾을 수 없습니다',
  'Try a different search query': '다른 검색어를 시도해 보세요',
  'Searching...': '검색 중...',

  // Skill Card
  'by {author}': '{author} 제작',
  '{n} stars': '{n}개의 별',
  Install: '설치',
  'Installing...': '설치 중...',
  Uninstall: '제거',
  Enable: '활성화',
  Disable: '비활성화',
  'View Details': '상세 보기',
  Python: 'Python',
  Bash: 'Bash',
  JavaScript: 'JavaScript',
  Scripts: '스크립트',
  References: '참조',
  Assets: '에셋',
  Compatible: '호환',
  Partial: '부분적',

  // Skill Detail Modal
  'Skill Details': '스킬 상세',
  Instructions: '지침',
  Files: '파일',
  Settings: '설정',
  Author: '작성자',
  License: '라이선스',
  Stars: '별',
  Source: '소스',
  'View on GitHub': 'GitHub에서 보기',
  'Installed on': '설치 날짜',
  'Last updated': '최종 업데이트',
  'Available Scripts': '사용 가능한 스크립트',
  'Reference Documents': '참조 문서',
  'Asset Files': '에셋 파일',
  'Required Packages': '필수 패키지',
  Language: '언어',
  'No scripts included': '스크립트 없음',
  'This skill provides instructions only': '이 스킬은 지침만 제공합니다',
  'Assigned Agents': '할당된 에이전트',
  'All agents': '모든 에이전트',
  'Select specific agents': '특정 에이전트 선택',
  'Auto-activate': '자동 활성화',
  'Always inject skill instructions': '항상 스킬 지침 주입',
  'Confirm Uninstall': '제거 확인',
  'Are you sure you want to uninstall this skill?':
    '이 스킬을 제거하시겠습니까?',
  Cancel: '취소',
  'Skill installed successfully': '스킬이 성공적으로 설치되었습니다',
  'Skill uninstalled': '스킬이 제거되었습니다',
  'Failed to install skill': '스킬 설치에 실패했습니다',
  'Failed to fetch skill from GitHub':
    'GitHub에서 스킬을 가져오지 못했습니다',

  // Compatibility
  'Browser Compatible': '브라우저 호환',
  'Can execute Python and JavaScript scripts in-browser':
    '브라우저에서 Python 및 JavaScript 스크립트를 실행할 수 있습니다',
  'Partial Compatibility': '부분 호환',
  'Some scripts require system tools that can\'t run in-browser':
    '일부 스크립트는 브라우저에서 사용할 수 없는 시스템 도구가 필요합니다',
  'Instructions Only': '지침 전용',
  'Scripts are available for reference but can\'t execute in-browser':
    '스크립트는 참조용으로 제공되지만 브라우저에서 실행할 수 없습니다',

  // Execution
  'Run Script': '스크립트 실행',
  'Running script…': '스크립트 실행 중\u2026',
  'Initializing Python environment…': 'Python 환경 초기화 중\u2026',
  'Installing packages…': '패키지 설치 중\u2026',
  'Script executed successfully': '스크립트가 성공적으로 실행되었습니다',
  'Script execution failed': '스크립트 실행 실패',
  'Execution timed out': '실행 시간 초과',
  'Confirm Script Execution': '스크립트 실행 확인',
  'This script will run in a sandboxed Python environment.':
    '이 스크립트는 격리된 Python 환경에서 실행됩니다.',
  'Packages to install': '설치할 패키지',
  'Input files': '입력 파일',
  'Estimated execution time': '예상 실행 시간',
  Run: '실행',
  'Python Environment': 'Python 환경',
  Ready: '준비됨',
  'Loading…': '로딩 중\u2026',
  'Not initialized': '초기화되지 않음',
  'Pre-warm Python': 'Python 워밍업',
  'Download and initialize the Python environment in the background':
    '백그라운드에서 Python 환경을 다운로드하고 초기화합니다',
  'Incompatible package': '호환되지 않는 패키지',
  'This package may not work in the browser environment':
    '이 패키지는 브라우저 환경에서 작동하지 않을 수 있습니다',

  // Try it out
  'Try it out': '사용해 보기',
  'Select script': '스크립트 선택',
  'Arguments (JSON)': '인수 (JSON)',
  'Arguments must be a JSON object': '인수는 JSON 객체여야 합니다',
  'Invalid JSON': '잘못된 JSON',
  'No Python scripts available': '사용 가능한 Python 스크립트 없음',
  'Only Python scripts can be executed in the sandbox': '샌드박스에서는 Python 스크립트만 실행할 수 있습니다',
  'Pre-compiled in Pyodide': 'Pyodide에서 사전 컴파일됨',
  'Will be installed via micropip': 'micropip을 통해 설치됩니다',
  Done: '완료',
  'Return value': '반환값',
  Output: '출력',
  Warnings: '경고',
  Error: '오류',
  'Output files': '출력 파일',
  'packages installed': '패키지 설치됨',

  // Empty states
  'No skills installed': '설치된 스킬 없음',
  'Search the SkillsMP registry to discover and install skills':
    'SkillsMP 레지스트리에서 스킬을 검색하고 설치하세요',
  'Your installed skills will appear here':
    '설치된 스킬이 여기에 표시됩니다',
  'API key required': 'API 키 필요',
  'Enter your SkillsMP API key in Settings to search for skills':
    '스킬을 검색하려면 설정에서 SkillsMP API 키를 입력하세요',
  // Manual URL install
  'Install from GitHub URL': 'GitHub URL에서 설치',
  'Paste a GitHub URL to a skill directory or SKILL.md file':
    'GitHub URL을 붙여넣어 스킬 디렉토리 또는 SKILL.md 파일에서 설치하세요',
}
