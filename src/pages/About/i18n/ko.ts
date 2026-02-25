import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Hero
  'AI Augmentation for Everyone': '모두를 위한 AI 증강',
  '{product} is a browser-native AI agent orchestration platform. Delegate complex tasks to teams of specialised agents that plan, collaborate, and deliver — all running':
    '{product}은 브라우저 네이티브 AI 에이전트 오케스트레이션 플랫폼입니다. 계획하고 협업하고 결과를 내는 전문 에이전트 팀에 복잡한 작업을 위임하세요 — 모두',
  'entirely on your device': '당신의 기기에서 완전히',
  '\u201CAI augmentation shouldn\u2019t be a luxury for the few, but a fundamental tool available to all — where anyone can leverage the power of AI teams to amplify their capabilities and achieve their goals.\u201D':
    '\u201CAI 증강은 소수의 사치가 아니라 모두에게 열린 기본 도구여야 합니다 — 누구나 AI 팀의 힘을 활용하여 자신의 역량을 증폭하고 목표를 달성할 수 있는 곳.\u201D',

  // Principles section
  Philosophy: '철학',
  'Built on Conviction': '신념 위에 세우다',
  'Three non-negotiable principles guide every decision we make.':
    '세 가지 양보할 수 없는 원칙이 우리의 모든 결정을 이끕니다.',
  'Privacy by Design': '설계 단계의 프라이버시',
  'Every byte of your data stays on your device. No servers. No telemetry. No compromise.':
    '데이터의 모든 바이트가 당신의 기기에 남습니다. 서버 없음. 텔레메트리 없음. 타협 없음.',
  'Universally Accessible': '보편적으로 접근 가능',
  'A browser is all you need. No installation, no GPU, no special hardware — just open and create.':
    '브라우저만 있으면 됩니다. 설치 불필요, GPU 불필요, 특별한 하드웨어 불필요 — 열고 만드세요.',
  'Open Source Forever': '영원한 오픈 소스',
  'Built in the open, shaped by the community. Every line of code is yours to read, improve, and share.':
    '공개적으로 구축되고 커뮤니티에 의해 형성됩니다. 모든 코드 라인은 읽고, 개선하고, 공유할 수 있습니다.',

  // Capabilities section
  Capabilities: '기능',
  'Powerful by Design': '설계로 강력하게',
  'A depth of engineering so you can focus on what matters — your ideas.':
    '중요한 것에 집중할 수 있도록 깊이 있는 엔지니어링 — 당신의 아이디어.',
  'Multi-Agent Orchestration': '멀티 에이전트 오케스트레이션',
  'Collective Intelligence': '집단 지성',
  'Compose teams of specialised AI agents that plan, execute, and validate together — mirroring how the best human teams operate.':
    '함께 계획하고 실행하고 검증하는 전문 AI 에이전트 팀을 구성하세요 — 최고의 인간 팀이 운영하는 방식을 반영합니다.',
  'Provider Independence': '공급자 독립성',
  'Your Models, Your Choice': '당신의 모델, 당신의 선택',
  'Seamlessly switch between OpenAI, Anthropic, Google Gemini, Mistral, Ollama, or any OpenAI-compatible endpoint. Never locked in.':
    'OpenAI, Anthropic, Google Gemini, Mistral, Ollama 또는 OpenAI 호환 엔드포인트 간에 원활하게 전환하세요. 절대 종속되지 않습니다.',
  'Zero-Trust Architecture': '제로 트러스트 아키텍처',
  'Security as a Foundation': '보안을 기반으로',
  'Web Crypto API encrypts your tokens. Service Workers sandbox execution. IndexedDB keeps everything local. Defense in depth, by default.':
    'Web Crypto API가 토큰을 암호화합니다. Service Workers가 실행을 격리합니다. IndexedDB가 모든 것을 로컬에 유지합니다. 기본적으로 심층 방어.',
  'Intelligent Task Analysis': '지능형 작업 분석',
  'Complexity, Simplified': '복잡함을 단순하게',
  'An LLM-powered analyser breaks your request into requirements, recruits the right agents, resolves dependencies, and orchestrates delivery.':
    'LLM 기반 분석기가 요청을 요구사항으로 분해하고, 적합한 에이전트를 모집하고, 종속성을 해결하고, 전달을 오케스트레이션합니다.',
  'Offline-First & P2P': '오프라인 우선 & P2P',
  'Works Anywhere': '어디서나 작동',
  'Fully functional without internet after first load. Optional Yjs-powered P2P sync lets you collaborate across devices without a central server.':
    '첫 로딩 후 인터넷 없이 완전히 작동합니다. 선택적 Yjs 기반 P2P 동기화로 중앙 서버 없이 기기 간 협업이 가능합니다.',
  'Extensible by Nature': '본질적으로 확장 가능',
  'Build on Top': '그 위에 구축하세요',
  'A marketplace of agents, tools, connectors, and apps — plus a sandboxed Extension Bridge so the community can create and share new capabilities.':
    '에이전트, 도구, 커넥터, 앱의 마켓플레이스 — 커뮤니티가 새로운 기능을 만들고 공유할 수 있는 샌드박스된 Extension Bridge도 포함.',

  // How it works section
  'Getting Started': '시작하기',
  'Four Steps to Delegation': '위임까지 네 단계',
  'From prompt to polished output in minutes, not hours.':
    '프롬프트에서 완성된 결과물까지 몇 시간이 아닌 몇 분 만에.',
  'Configure your AI provider': 'AI 공급자를 설정하세요',
  'Connect your preferred LLM — OpenAI, Anthropic, Gemini, Ollama, or any compatible endpoint.':
    '선호하는 LLM을 연결하세요 — OpenAI, Anthropic, Gemini, Ollama 또는 호환 엔드포인트.',
  'Describe your task': '작업을 설명하세요',
  'Tell DEVS what you need in natural language. Be ambitious — the orchestrator thrives on complexity.':
    'DEVS에 자연어로 필요한 것을 말하세요. 야심차게 — 오케스트레이터는 복잡함에서 빛납니다.',
  'Watch agents collaborate': '에이전트의 협업을 지켜보세요',
  'See specialised agents plan, execute, and validate in real-time. Intervene, guide, or just observe.':
    '전문 에이전트가 실시간으로 계획하고 실행하고 검증하는 것을 보세요. 개입하거나, 안내하거나, 관찰하세요.',
  'Receive & refine': '수령 및 개선',
  'Get structured artefacts — code, docs, analyses — and iterate with feedback until it\u2019s right.':
    '구조화된 산출물 — 코드, 문서, 분석 — 을 받고 피드백으로 반복하여 완성하세요.',

  // Use cases section
  'For Everyone': '모두를 위해',
  'Built for Builders': '만드는 사람을 위해',
  'Whether you\u2019re writing code or writing prose — DEVS adapts to you.':
    '코드를 작성하든 산문을 쓰든 — DEVS가 당신에게 맞춥니다.',
  Students: '학생',
  'Research, study planning & assignment help': '연구, 학습 계획 및 과제 도움',
  Developers: '개발자',
  'Rapid prototyping, code generation & reviews':
    '빠른 프로토타이핑, 코드 생성 및 리뷰',
  Creators: '크리에이터',
  'Brainstorming, writing & content production':
    '브레인스토밍, 글쓰기 및 콘텐츠 제작',
  Researchers: '연구자',
  'Literature review, data analysis & hypothesis testing':
    '문헌 검토, 데이터 분석 및 가설 검증',
  Managers: '관리자',
  'Project planning, task breakdown & operations':
    '프로젝트 계획, 작업 분류 및 운영',
  Entrepreneurs: '기업가',
  'Idea validation, strategy & business planning':
    '아이디어 검증, 전략 및 사업 계획',

  // FAQ section
  FAQ: 'FAQ',
  'Common Questions': '자주 묻는 질문',
  'Is my data private?': '내 데이터는 비공개인가요?',
  'Absolutely. All processing happens locally in your browser. We never collect, transmit, or store any of your data. Your API keys are encrypted with the Web Crypto API and never leave your device.':
    '물론입니다. 모든 처리는 브라우저에서 로컬로 이루어집니다. 데이터를 수집, 전송 또는 저장하지 않습니다. API 키는 Web Crypto API로 암호화되며 기기를 떠나지 않습니다.',
  'Which AI providers are supported?': '어떤 AI 공급자가 지원되나요?',
  'We support {providers}, and any provider compatible with the OpenAI API specification. You can switch providers at any time without losing your conversations or data.':
    '{providers}를 지원하며, OpenAI API 사양과 호환되는 모든 공급자를 지원합니다. 대화나 데이터를 잃지 않고 언제든지 공급자를 변경할 수 있습니다.',
  'Do I need to install anything?': '설치해야 하는 것이 있나요?',
  'Nothing at all. DEVS is a Progressive Web App that runs entirely in your browser. You can optionally \u201Cinstall\u201D it to your home screen for a native-like experience, but it\u2019s never required.':
    '전혀 없습니다. DEVS는 브라우저에서 완전히 실행되는 Progressive Web App입니다. 네이티브와 같은 경험을 위해 홈 화면에 \u201C설치\u201D할 수 있지만 필수는 아닙니다.',
  'Is this really free and open source?': '정말 무료이고 오픈 소스인가요?',
  'Yes — {license} licensed and always will be. The entire codebase is on GitHub. You can self-host, fork, or contribute. No premium tiers, no paywalls.':
    '예 — {license} 라이선스이며 항상 그럴 것입니다. 전체 코드베이스는 GitHub에 있습니다. 셀프 호스팅, 포크 또는 기여할 수 있습니다. 프리미엄 등급도 유료 장벽도 없습니다.',
  'Can I use it offline?': '오프라인에서 사용할 수 있나요?',
  'After the first load, the Service Worker caches everything you need. You can create agents, manage knowledge, and review past conversations without any internet connection. LLM calls obviously require connectivity to the provider.':
    '첫 로딩 후 Service Worker가 필요한 모든 것을 캐시합니다. 인터넷 연결 없이 에이전트를 만들고, 지식을 관리하고, 과거 대화를 검토할 수 있습니다. LLM 호출은 당연히 공급자와의 연결이 필요합니다.',
  'How does multi-agent orchestration work?':
    '멀티 에이전트 오케스트레이션은 어떻게 작동하나요?',
  'When you describe a complex task, the built-in orchestrator analyses it, breaks it into subtasks, recruits specialised agents, resolves dependencies, and coordinates parallel execution — just like a well-run project team.':
    '복잡한 작업을 설명하면 내장된 오케스트레이터가 분석하고, 하위 작업으로 분해하고, 전문 에이전트를 모집하고, 종속성을 해결하고, 병렬 실행을 조정합니다 — 잘 운영되는 프로젝트 팀처럼.',

  // CTA section
  'Shape the Future With Us': '우리와 함께 미래를 만드세요',
  '{product} is built by people who believe technology should empower, not enclose. Every contribution — code, ideas, feedback — makes AI augmentation more accessible to the world.':
    '{product}은 기술이 가두는 것이 아니라 힘을 주어야 한다고 믿는 사람들이 만듭니다. 모든 기여 — 코드, 아이디어, 피드백 — 가 AI 증강을 세계에 더 접근 가능하게 만듭니다.',
  'View on GitHub': 'GitHub에서 보기',
  'Open an Issue': 'Issue 열기',
  'Made with care for humans everywhere.':
    '전 세계 모든 사람을 위해 정성껏 만들었습니다.',
}
