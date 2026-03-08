import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Hero
  Comparison: '비교',
  '{productName} vs {alternative}': '{productName} vs {alternative}',
  'Full AI agent orchestration that runs in your browser — no cloud, no credits, no limits.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — 클라우드 없이, 크레딧 없이, 제한 없이.',
  'Try {productName} Free →': '{productName} 무료 체험 →',
  'View on GitHub': 'GitHub에서 보기',

  // TL;DR
  Privacy: '프라이버시',
  '100% client-side': '100% 클라이언트 측',
  'Cloud (Meta infra)': '클라우드 (Meta 인프라)',
  Pricing: '가격',
  'Free forever': '영원히 무료',
  'From $39/mo': '월 $39부터',
  Orchestration: '오케스트레이션',
  'Multi-agent teams': '멀티 에이전트 팀',
  'Single agent': '단일 에이전트',

  // Feature table
  'Feature Comparison': '기능 비교',
  'Head-to-Head Comparison': '일대일 비교',
  Feature: '기능',

  // Feature names + devs + alt
  'Open Source': '오픈 소스',
  'MIT License': 'MIT 라이선스',
  No: '아니오',
  'Browser-Native': '브라우저 네이티브',
  Yes: '예',
  'Web app (cloud)': '웹앱 (클라우드)',
  'Data Stays Local': '데이터 로컬 유지',
  'Multi-Agent Orchestration': '멀티 에이전트 오케스트레이션',
  Advanced: '고급',
  'Bring Your Own Keys': '자체 키 사용',
  'Offline Capable': '오프라인 지원',
  'P2P Sync': 'P2P 동기화',
  'Agent Memory': '에이전트 메모리',
  'Projects only': '프로젝트만',
  'LLM Provider Choice': 'LLM 제공자 선택',
  '6+ providers': '6개 이상 제공자',
  'Locked to {alternative}': '{alternative}에 종속',
  'Free Tier': '무료 플랜',
  Unlimited: '무제한',
  '4,000 credits/mo': '월 4,000 크레딧',

  // Advantages
  'Why {productName}': '왜 {productName}인가',
  'Why Teams Choose {productName} over {alternative}':
    '팀들이 {alternative} 대신 {productName}을 선택하는 이유',
  'True Privacy': '진정한 프라이버시',
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. Manus processes everything on Meta’s cloud infrastructure.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. Manus는 모든 것을 Meta의 클라우드 인프라에서 처리합니다.',
  'Zero Platform Cost': '플랫폼 비용 제로',
  'Pay only for your own LLM API usage. No $39/month subscription, no credit limits, no surprise bills.':
    '자체 LLM API 사용량만 지불하세요. 월 $39 구독 없이, 크레딧 제한 없이, 예상치 못한 청구서 없이.',
  'Multi-Agent Teams': '멀티 에이전트 팀',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} runs a single agent per task.':
    '의존성 해결과 병렬 실행으로 전문 에이전트 팀을 조율하세요. {alternative}는 작업당 단일 에이전트만 실행합니다.',
  'Provider Freedom': '제공자 자유',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own infrastructure.':
    'OpenAI, Anthropic, Gemini, Ollama, Mistral 등을 자유롭게 전환하세요. {alternative}는 자체 인프라에 종속시킵니다.',

  // Pricing
  'Stop Paying for the Platform': '플랫폼 비용 지불을 그만하세요',
  '{productName}': '{productName}',
  '$0/mo': '월 $0',
  'Unlimited agents': '무제한 에이전트',
  'All features included': '모든 기능 포함',
  'Full data privacy': '완전한 데이터 프라이버시',
  'BYOK — any LLM provider': 'BYOK — 모든 LLM 제공자',
  'Credit-based usage': '크레딧 기반 사용',
  'Paid tiers for more': '더 많은 기능은 유료 플랜',
  'Cloud-only processing': '클라우드 전용 처리',
  'Locked to {alternative} infra': '{alternative} 인프라에 종속',

  // Honest take
  'Honest Take': '솔직한 평가',
  'Who Should Choose What': '누가 무엇을 선택해야 할까',
  'Choose {productName} if you…': '다음에 해당하면 {productName}을 선택하세요…',
  'Care about data privacy and sovereignty':
    '데이터 프라이버시와 주권을 중시하는 경우',
  'Want full control over LLM providers and costs':
    'LLM 제공자와 비용을 완전히 제어하고 싶은 경우',
  'Need multi-agent orchestration with team coordination':
    '팀 조율이 가능한 멀티 에이전트 오케스트레이션이 필요한 경우',
  'Prefer open-source, self-hosted solutions':
    '오픈 소스 자체 호스팅 솔루션을 선호하는 경우',
  'Want to work offline or in air-gapped environments':
    '오프라인 또는 격리된 환경에서 작업하고 싶은 경우',
  'Consider {alternative} if you…':
    '다음에 해당하면 {alternative}를 고려하세요…',
  'Want a polished, zero-config SaaS experience out of the box':
    '설정 없이 바로 사용할 수 있는 세련된 SaaS 경험을 원하는 경우',
  'Prefer not to manage your own LLM API keys':
    '자체 LLM API 키를 관리하고 싶지 않은 경우',
  'Need built-in Slack integration and scheduled tasks':
    '내장 Slack 통합과 예약 작업이 필요한 경우',

  // OpenManus — Hero
  'Full AI agent orchestration that runs in your browser — no Python, no server, no setup.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — Python 없이, 서버 없이, 설정 없이.',

  // OpenManus — TL;DR
  Setup: '설정',
  'Zero install (browser)': '설치 불필요 (브라우저)',
  'Python environment': 'Python 환경',
  Architecture: '아키텍처',
  'Browser-native PWA': '브라우저 네이티브 PWA',
  'Python framework': 'Python 프레임워크',
  UX: 'UX',
  'Visual UI': '시각적 UI',
  'Command-line / code-first': '커맨드라인 / 코드 우선',

  // OpenManus — Feature table
  'No (Python)': '아니오 (Python)',
  'Yes (self-hosted)': '예 (자체 호스팅)',
  'Basic flows': '기본 플로우',
  'No (needs API)': '아니오 (API 필요)',
  'OpenAI-compatible': 'OpenAI 호환',

  // OpenManus — Advantages
  'Zero Setup': '설정 불필요',
  'No Python, no dependencies, no virtual environments — just open a browser and start orchestrating agents instantly.':
    'Python 없이, 의존성 없이, 가상 환경 없이 — 브라우저만 열면 즉시 에이전트 오케스트레이션을 시작하세요.',
  'Visual Experience': '시각적 경험',
  'Full graphical UI with agent visualization, real-time workflow tracking, and drag-and-drop. {alternative} is a code-first, command-line tool.':
    '에이전트 시각화, 실시간 워크플로우 추적, 드래그 앤 드롭이 가능한 완전한 그래픽 UI. {alternative}는 코드 우선 커맨드라인 도구입니다.',
  'Agent Memory & Learning': '에이전트 메모리 및 학습',
  'Agents remember context across conversations with a persistent memory system and human review. {alternative} has no built-in memory layer.':
    '에이전트가 영구 메모리 시스템과 인간 검토를 통해 대화 간 컨텍스트를 기억합니다. {alternative}에는 내장 메모리 레이어가 없습니다.',
  'Works on any device including mobile — no install, no server, no Python runtime. Everything runs client-side as a PWA.':
    '모바일 포함 모든 기기에서 작동 — 설치 없이, 서버 없이, Python 런타임 없이. 모든 것이 PWA로 클라이언트 측에서 실행됩니다.',

  // OpenManus — Pricing
  'Free (self-hosted)': '무료 (자체 호스팅)',
  'Requires Python environment': 'Python 환경 필요',
  'No managed hosting': '관리형 호스팅 없음',
  'Setup & maintenance required': '설정 및 유지보수 필요',
  'CLI-first interface': '커맨드라인 인터페이스',

  // OpenManus — Honest take
  'Need Python-based extensibility and custom agent code':
    'Python 기반 확장성과 커스텀 에이전트 코드가 필요한 경우',
  'Prefer a code-first approach over visual UI':
    '시각적 UI보다 코드 우선 접근을 선호하는 경우',
  'Want A2A protocol support': 'A2A 프로토콜 지원을 원하는 경우',

  // Lemon AI — Hero
  'Full AI agent orchestration that runs in your browser — no Docker, no Node.js, no limits.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — Docker 없이, Node.js 없이, 제한 없이.',

  // Lemon AI — TL;DR
  'Docker + Node.js': 'Docker + Node.js',
  'Desktop app (Vue + Node.js)': '데스크톱 앱 (Vue + Node.js)',

  // Lemon AI — Feature table
  'No (desktop app)': '아니오 (데스크톱 앱)',
  'Yes (Docker sandbox)': '예 (Docker 샌드박스)',
  'Partial (local LLM only)': '부분적 (로컬 LLM만)',
  'Self-evolving': '자기 진화',
  'Free + subscription': '무료 + 구독',

  // Lemon AI — Advantages
  'No Docker or Node.js needed, just open your browser. {alternative} requires a local Docker environment and Node.js backend to run.':
    'Docker나 Node.js가 필요 없습니다. 브라우저만 열면 됩니다. {alternative}는 로컬 Docker 환경과 Node.js 백엔드가 필요합니다.',
  'Full team orchestration with dependency resolution, not just single agent. {alternative} runs one agent at a time.':
    '단일 에이전트가 아닌 의존성 해결을 포함한 완전한 팀 오케스트레이션. {alternative}는 한 번에 하나의 에이전트만 실행합니다.',
  'Works on any device, no installation, progressive web app. {alternative} is a desktop application built with Vue + Node.js.':
    '모든 디바이스에서 작동, 설치 필요 없음, 프로그레시브 웹 앱. {alternative}는 Vue + Node.js로 만들어진 데스크톱 애플리케이션입니다.',
  'P2P Collaboration': 'P2P 협업',
  'Cross-device sync via WebRTC, real-time collaboration. {alternative} has no built-in sync or collaboration features.':
    'WebRTC를 통한 크로스 디바이스 동기화, 실시간 협업. {alternative}에는 내장 동기화 또는 협업 기능이 없습니다.',

  // Lemon AI — Pricing
  'Free + paid tiers': '무료 + 유료 등급',
  'Online subscription available': '온라인 구독 가능',
  'Requires Docker for sandbox': '샌드박스에 Docker 필요',
  'Node.js backend required': 'Node.js 백엔드 필요',
  'Single agent architecture': '단일 에이전트 아키텍처',

  // Lemon AI — Honest take
  'Need Docker VM sandbox for safe code execution':
    '안전한 코드 실행을 위한 Docker VM 샌드박스가 필요한 경우',
  'Want built-in deep search and vibe coding':
    '내장 딥 서치와 바이브 코딩을 원하는 경우',
  'Prefer a self-evolving memory system':
    '자기 진화 메모리 시스템을 선호하는 경우',

  // DeepChat — Hero
  'Full AI agent orchestration that runs in your browser — no download, no Electron, no limits.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — 다운로드 없이, Electron 없이, 제한 없이.',

  // DeepChat — TL;DR
  'Electron app download': 'Electron 앱 다운로드',
  'Single chat interface': '단일 채팅 인터페이스',
  'Desktop app (Electron)': '데스크톱 앱 (Electron)',

  // DeepChat — Feature table
  'No (Electron desktop)': '아니오 (Electron 데스크톱)',
  'No (single chat)': '아니오 (단일 채팅)',
  'Yes (30+ providers)': '예 (30개 이상 제공업체)',
  'Yes (with Ollama)': '예 (Ollama 포함)',
  '30+ providers': '30개 이상 제공업체',

  // DeepChat — Advantages
  'Zero Install': '설치 불필요',
  'No download, no Electron app. Just open your browser on any device. {alternative} requires a desktop application download.':
    '다운로드 없이, Electron 앱 없이. 어떤 기기에서든 브라우저를 여세요. {alternative}은 데스크톱 애플리케이션 다운로드가 필요합니다.',
  'Coordinate specialized agent teams with dependency resolution. {alternative} is a single-chat interface without orchestration.':
    '의존성 해결을 통해 전문 에이전트 팀을 조율합니다. {alternative}은 오케스트레이션 없는 단일 채팅 인터페이스입니다.',
  'Persistent agent memory with human review, categories, confidence levels. {alternative} has no memory system.':
    '인간 검토, 카테고리, 신뢰 수준을 갖춘 영구 에이전트 메모리. {alternative}에는 메모리 시스템이 없습니다.',
  'Cross-device synchronization via Yjs/WebRTC. {alternative} is limited to one device.':
    'Yjs/WebRTC를 통한 기기 간 동기화. {alternative}은 하나의 기기로 제한됩니다.',

  // DeepChat — Pricing
  Free: '무료',
  'Desktop-only (Electron)': '데스크톱 전용 (Electron)',
  'No multi-agent orchestration': '멀티 에이전트 오케스트레이션 없음',
  'No P2P sync or collaboration': 'P2P 동기화 또는 협업 없음',
  'No agent memory system': '에이전트 메모리 시스템 없음',

  // DeepChat — Honest take
  'Prefer a native desktop app experience with multi-window UI':
    '멀티 윈도우 UI를 갖춘 네이티브 데스크톱 앱 경험을 선호하는 경우',
  'Need MCP tool calling and ACP agent protocol support':
    'MCP 도구 호출 및 ACP 에이전트 프로토콜 지원이 필요한 경우',
  'Want built-in search enhancement (Brave, Google, Bing)':
    '내장 검색 강화 (Brave, Google, Bing)를 원하는 경우',

  // Kortix — Hero
  'Full AI agent orchestration that runs in your browser — no Docker, no database, no infrastructure.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — Docker 없이, 데이터베이스 없이, 인프라 없이.',

  // Kortix — TL;DR
  'Self-hosted (Docker + Supabase)': '자체 호스팅 (Docker + Supabase)',
  'Docker + Supabase stack': 'Docker + Supabase 스택',
  'Server-based (Python/FastAPI)': '서버 기반 (Python/FastAPI)',

  // Kortix — Feature table
  'Yes (custom license)': '예 (커스텀 라이선스)',
  'No (Next.js dashboard)': '아니오 (Next.js 대시보드)',
  'Self-hosted Supabase': '자체 호스팅 Supabase',
  'Single agent runtimes': '단일 에이전트 런타임',
  'Yes (via LiteLLM)': '예 (LiteLLM 경유)',
  Limited: '제한적',
  'Multiple (via LiteLLM)': '다수 (LiteLLM 경유)',
  'Zero Infrastructure': '제로 인프라',
  'Requires Docker + Supabase': 'Docker + Supabase 필요',

  // Kortix — Advantages
  'Open your browser and start working — no Docker, no Supabase, no FastAPI server. {alternative} requires a full infrastructure stack to self-host.':
    '브라우저를 열고 바로 작업을 시작하세요 — Docker 없이, Supabase 없이, FastAPI 서버 없이. {alternative}는 자체 호스팅을 위해 전체 인프라 스택이 필요합니다.',
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. 자체 호스팅 서버조차 없습니다.',
  'Works on any device with a browser — desktop, tablet, or mobile. No server requirements, no Docker containers, fully offline capable.':
    '브라우저가 있는 모든 기기에서 작동 — 데스크톱, 태블릿, 모바일. 서버 요구 사항 없이, Docker 컨테이너 없이, 완전한 오프라인 지원.',
  'No Infrastructure': '인프라 불필요',
  'No Docker containers, no PostgreSQL database, no Python backend to maintain. {alternative} needs ongoing server management and updates.':
    'Docker 컨테이너 없이, PostgreSQL 데이터베이스 없이, 유지 관리할 Python 백엔드 없이. {alternative}는 지속적인 서버 관리와 업데이트가 필요합니다.',

  // Kortix — Pricing
  'Requires server hosting costs': '서버 호스팅 비용 필요',
  'Docker + Supabase infrastructure': 'Docker + Supabase 인프라',
  'Ongoing maintenance overhead': '지속적인 유지보수 부담',
  'Server administration required': '서버 관리 필요',

  // Kortix — Honest take
  'Need Docker-sandboxed code execution for agent runtimes':
    '에이전트 런타임을 위한 Docker 샌드박스 코드 실행이 필요한 경우',
  'Want server-side agent runtimes with persistent processes':
    '영구 프로세스를 갖춘 서버 측 에이전트 런타임을 원하는 경우',
  'Need built-in browser automation via Playwright':
    'Playwright를 통한 내장 브라우저 자동화가 필요한 경우',

  // AgenticSeek — Hero
  'Full AI agent orchestration that runs in your browser — no Docker, no Python, no setup.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — Docker 없이, Python 없이, 설정 없이.',

  // AgenticSeek — TL;DR
  'Docker + Python setup': 'Docker + Python 설정',
  'Single agent routing': '단일 에이전트 라우팅',
  'Desktop (Python + Docker)': '데스크톱 (Python + Docker)',

  // AgenticSeek — Feature table
  'GPL-3.0': 'GPL-3.0',
  'No (Python + Docker)': '아니오 (Python + Docker)',
  'Smart routing': '스마트 라우팅',
  'Yes (local LLM)': '예 (로컬 LLM)',
  'Session recovery': '세션 복구',
  '8+ providers': '8개 이상 제공업체',

  // AgenticSeek — Advantages
  'No Python, no Docker, no SearxNG — just open your browser. {alternative} requires a full Docker + Python environment.':
    'Python 없이, Docker 없이, SearxNG 없이 — 브라우저만 여세요. {alternative}는 전체 Docker + Python 환경이 필요합니다.',
  'Full team orchestration with dependency resolution and parallel execution. {alternative} uses smart routing to a single agent.':
    '의존성 해결과 병렬 실행을 포함한 완전한 팀 오케스트레이션. {alternative}는 단일 에이전트에 대한 스마트 라우팅을 사용합니다.',
  'Works on any device including mobile. {alternative} is desktop-only with Python + Docker.':
    '모바일 포함 모든 기기에서 작동. {alternative}는 Python + Docker로 데스크톱 전용입니다.',
  'Cross-device sync via Yjs/WebRTC. {alternative} has no collaboration features.':
    'Yjs/WebRTC를 통한 기기 간 동기화. {alternative}에는 협업 기능이 없습니다.',

  // AgenticSeek — Pricing
  'Requires Docker + Python': 'Docker + Python 필요',
  'SearxNG setup needed': 'SearxNG 설정 필요',
  'Desktop only — no mobile': '데스크톱 전용 — 모바일 없음',
  'GPL-3.0 license (restrictive)': 'GPL-3.0 라이선스 (제한적)',

  // AgenticSeek — Honest take
  'Need autonomous web browsing with stealth capabilities':
    '스텔스 기능을 갖춘 자율 웹 브라우징이 필요한 경우',
  'Want local code execution in multiple languages (Python, C, Go, Java)':
    '여러 언어(Python, C, Go, Java)로 로컬 코드 실행을 원하는 경우',
  'Prefer voice-enabled interaction with speech-to-text':
    '음성 인식을 통한 음성 상호작용을 선호하는 경우',

  // Base44 — TL;DR
  'Cloud-based': '클라우드 기반',
  'App generation': '앱 생성',

  // Base44 — Feature table
  'Platform-selected': '플랫폼 선택',
  'General-Purpose AI': '범용 AI',
  'App building only': '앱 빌딩만',
  'Limited free tier': '제한된 무료 플랜',

  // Base44 — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud infrastructure.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. {alternative}는 모든 것을 클라우드 인프라에서 처리합니다.',
  'Pay only for your own LLM API usage. No ${price}/month subscription, no feature gates, no surprise bills.':
    '자체 LLM API 사용량만 지불하세요. 월 ${price} 구독 없이, 기능 제한 없이, 예상치 못한 청구서 없이.',
  'Beyond App Building': '앱 빌딩을 넘어서',
  'Coordinate specialized agent teams for any task — research, writing, analysis, development. {alternative} is limited to generating apps.':
    '모든 작업을 위해 전문 에이전트 팀을 조율하세요 — 연구, 작성, 분석, 개발. {alternative}는 앱 생성에 제한됩니다.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} selects AI models for you with no choice.':
    'OpenAI, Anthropic, Gemini, Ollama, Mistral 등을 자유롭게 전환하세요. {alternative}는 선택권 없이 AI 모델을 자동 선택합니다.',

  // Base44 — Pricing
  'Paid plans for more features': '더 많은 기능을 위한 유료 플랜',
  'No bring-your-own-key support': 'BYOK 지원 없음',

  // Base44 — Honest take
  'Want to generate full-stack apps from natural language prompts':
    '자연어 프롬프트로 풀스택 앱을 생성하고 싶은 경우',
  'Prefer built-in hosting, auth, and database without setup':
    '설정 없이 내장 호스팅, 인증, 데이터베이스를 선호하는 경우',
  'Need one-click publish with custom domains and analytics':
    '커스텀 도메인과 분석이 가능한 원클릭 배포가 필요한 경우',

  // ChatGPT — TL;DR
  'Cloud (OpenAI infra)': '클라우드 (OpenAI 인프라)',

  // ChatGPT — Feature table
  'Yes, with human review': '예, 인간 검토 포함',
  'Locked to OpenAI': 'OpenAI에 종속',
  'No — subscription required': '아니오 — 구독 필요',

  // ChatGPT — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. ChatGPT Agent Mode processes everything on OpenAI’s cloud infrastructure.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. ChatGPT 에이전트 모드는 모든 것을 OpenAI의 클라우드 인프라에서 처리합니다.',
  'Pay only for your own LLM API usage. No $20–$200/month subscription, no feature gates, no usage caps.':
    '자체 LLM API 사용량만 지불하세요. 월 $20–$200 구독 없이, 기능 제한 없이, 사용량 한도 없이.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into OpenAI’s models only.':
    'OpenAI, Anthropic, Gemini, Ollama, Mistral 등을 자유롭게 전환하세요. {alternative}는 OpenAI 모델에만 종속시킵니다.',

  // ChatGPT — Pricing
  '$20/mo Plus or $200/mo Pro': '월 $20 Plus 또는 월 $200 Pro',
  'Locked to OpenAI models': 'OpenAI 모델에 종속',
  'No bring-your-own-key option': 'BYOK 옵션 없음',

  // ChatGPT — Honest take
  'Want a polished, all-in-one ChatGPT experience with zero setup':
    '설정 없이 세련된 올인원 ChatGPT 경험을 원하는 경우',
  'Need built-in browsing, code interpreter, and file analysis in one tool':
    '하나의 도구에서 내장 브라우징, 코드 인터프리터, 파일 분석이 필요한 경우',

  // DataKit — Hero
  'Full AI agent orchestration that runs in your browser — not just data analysis, but any task.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — 데이터 분석뿐 아니라 모든 작업.',

  // DataKit — TL;DR
  Scope: '범위',
  'Multi-agent platform': '멀티 에이전트 플랫폼',
  'Data analysis tool': '데이터 분석 도구',
  'LLM Providers': 'LLM 제공자',
  'Data-focused AI': '데이터 중심 AI',
  Collaboration: '협업',
  'P2P sync & teams': 'P2P 동기화 및 팀',
  'Single-user': '단일 사용자',

  // DataKit — Feature table
  Likely: '가능성 있음',
  'Data analysis only': '데이터 분석만',

  // DataKit — Advantages
  'Coordinate specialized agent teams for any task — research, writing, analysis, development. {alternative} is focused solely on data file analysis.':
    '모든 작업을 위해 전문 에이전트 팀을 조율하세요 — 연구, 작성, 분석, 개발. {alternative}는 데이터 파일 분석에만 집중합니다.',
  'Agent Memory & Knowledge': '에이전트 메모리 및 지식',
  'Agents learn from conversations and access a full knowledge base. {alternative} has no memory or knowledge management.':
    '에이전트가 대화에서 학습하고 전체 지식 베이스에 접근합니다. {alternative}에는 메모리나 지식 관리가 없습니다.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} is limited to data-specific AI capabilities.':
    'OpenAI, Anthropic, Gemini, Ollama, Mistral 등을 자유롭게 전환하세요. {alternative}는 데이터 특화 AI 기능에 제한됩니다.',
  'Cross-device sync via Yjs/WebRTC for seamless teamwork. {alternative} is a single-user data analysis tool.':
    '원활한 팀워크를 위한 Yjs/WebRTC를 통한 기기 간 동기화. {alternative}는 단일 사용자 데이터 분석 도구입니다.',

  // DataKit — Pricing
  'Free (open source)': '무료 (오픈 소스)',
  'Data analysis only — no orchestration':
    '데이터 분석만 — 오케스트레이션 없음',
  'No multi-agent collaboration': '멀티 에이전트 협업 없음',
  'No agent memory or knowledge base': '에이전트 메모리 또는 지식 베이스 없음',
  'No P2P sync or cross-device support':
    'P2P 동기화 또는 크로스 디바이스 지원 없음',

  // DataKit — Honest take
  'Need dedicated CSV, JSON, XLS, or Parquet file analysis with AI assistance':
    'AI 지원을 통한 전용 CSV, JSON, XLS 또는 Parquet 파일 분석이 필요한 경우',
  'Want a lightweight, focused tool specifically for local data exploration':
    '로컬 데이터 탐색을 위한 가볍고 집중된 도구를 원하는 경우',
  'Prefer a single-purpose data tool over a full orchestration platform':
    '전체 오케스트레이션 플랫폼보다 단일 목적 데이터 도구를 선호하는 경우',

  // Dualite — TL;DR
  'From $29/mo': '월 $29부터',
  'App/web builder': '앱/웹 빌더',

  // Dualite — Feature table
  '5 messages': '5개 메시지',
  'Figma-to-Code': 'Figma에서 코드로',

  // Dualite — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. Dualite processes everything on their cloud servers.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. Dualite는 모든 것을 클라우드 서버에서 처리합니다.',
  'Pay only for your own LLM API usage. No $29–$79/month subscription, no message limits, no surprise bills.':
    '자체 LLM API 사용량만 지불하세요. 월 $29–$79 구독 없이, 메시지 제한 없이, 예상치 못한 청구서 없이.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-prompt app generation.':
    '의존성 해결과 병렬 실행으로 전문 에이전트 팀을 조율하세요. {alternative}는 단일 프롬프트 앱 생성에 집중합니다.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own models.':
    'OpenAI, Anthropic, Gemini, Ollama, Mistral 등을 자유롭게 전환하세요. {alternative}는 자체 모델에 종속시킵니다.',

  // Dualite — Pricing
  'Message-based limits': '메시지 기반 제한',
  '5 free messages only': '무료 5개 메시지만',

  // Dualite — Honest take
  'Need Figma-to-code conversion and app templates out of the box':
    '기본 제공 Figma-코드 변환과 앱 템플릿이 필요한 경우',
  'Want a visual app builder with authentication and backend included':
    '인증과 백엔드가 포함된 비주얼 앱 빌더를 원하는 경우',
  'Prefer prompt-to-app generation over multi-agent orchestration':
    '멀티 에이전트 오케스트레이션보다 프롬프트-앱 생성을 선호하는 경우',

  // HugstonOne — Hero
  'Multi-agent orchestration in any browser — vs a Windows-only local inference app.':
    '모든 브라우저에서의 멀티 에이전트 오케스트레이션 — Windows 전용 로컬 추론 앱과 비교.',

  // HugstonOne — TL;DR
  Platform: '플랫폼',
  'Any browser, any OS': '모든 브라우저, 모든 OS',
  'Windows desktop only': 'Windows 데스크톱 전용',
  Agents: '에이전트',
  'Multi-agent orchestration': '멀티 에이전트 오케스트레이션',
  'Single-model inference': '단일 모델 추론',
  'Proprietary (free)': '독점 (무료)',

  // HugstonOne — Feature table
  'No (proprietary)': '아니오 (독점)',
  'Cross-Platform': '크로스 플랫폼',
  'Any OS with a browser': '브라우저가 있는 모든 OS',
  'Windows only': 'Windows 전용',
  'No — single-model only': '아니오 — 단일 모델만',
  'Cloud LLM Providers': '클라우드 LLM 제공자',
  'None — local GGUF only': '없음 — 로컬 GGUF만',
  'Local Model Support': '로컬 모델 지원',
  'Via Ollama': 'Ollama 경유',
  '10,000+ GGUF models': '10,000개 이상 GGUF 모델',
  'Knowledge Base': '지식 베이스',
  'Yes — fully local': '예 — 완전히 로컬',

  // HugstonOne — Advantages
  'Any Device, Any OS': '모든 기기, 모든 OS',
  'Works on Mac, Linux, Windows, tablets, and phones — anywhere you have a browser. {alternative} is locked to Windows desktops.':
    'Mac, Linux, Windows, 태블릿, 휴대폰에서 작동 — 브라우저가 있는 곳이라면 어디든. {alternative}는 Windows 데스크톱에 종속됩니다.',
  'Orchestrate entire teams of specialized AI agents that collaborate on complex tasks. {alternative} runs a single model at a time.':
    '복잡한 작업에 협력하는 전문 AI 에이전트 팀 전체를 오케스트레이션하세요. {alternative}는 한 번에 하나의 모델만 실행합니다.',
  'Cloud + Local Models': '클라우드 + 로컬 모델',
  'Access OpenAI, Anthropic, Gemini, Mistral, and more — plus local models via Ollama. {alternative} only supports local GGUF inference.':
    'OpenAI, Anthropic, Gemini, Mistral 등에 접근 — Ollama를 통한 로컬 모델도 지원. {alternative}는 로컬 GGUF 추론만 지원합니다.',
  'Open Source & Extensible': '오픈 소스 및 확장 가능',
  'Fully open-source under the MIT license with a marketplace, plugins, and community contributions. {alternative} is proprietary and closed.':
    'MIT 라이선스 하의 완전한 오픈 소스 — 마켓플레이스, 플러그인, 커뮤니티 기여 포함. {alternative}는 독점적이고 비공개입니다.',

  // HugstonOne — Pricing
  'Free (email required)': '무료 (이메일 필요)',
  'Windows only — no Mac or Linux': 'Windows 전용 — Mac이나 Linux 없음',
  'No cloud LLM provider support': '클라우드 LLM 제공자 지원 없음',
  'Proprietary — not open source': '독점 — 오픈 소스 아님',

  // HugstonOne — Honest take
  'Want a simple local GGUF inference app on Windows':
    'Windows에서 간단한 로컬 GGUF 추론 앱을 원하는 경우',
  'Need GPU-accelerated local model inference with image-to-text':
    'GPU 가속 로컬 모델 추론과 이미지-텍스트 변환이 필요한 경우',
  'Prefer a desktop app with an integrated code editor and live preview':
    '통합 코드 에디터와 실시간 미리보기가 있는 데스크톱 앱을 선호하는 경우',

  // LlamaPen — Hero
  'Full AI agent orchestration that runs in your browser — no download, no Ollama dependency, no limits.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — 다운로드 없이, Ollama 의존성 없이, 제한 없이.',

  // LlamaPen — TL;DR
  'Browser UI for Ollama': 'Ollama용 브라우저 UI',

  // LlamaPen — Feature table
  'Provider Support': '제공자 지원',
  '6+ providers (cloud + local)': '6개 이상 제공자 (클라우드 + 로컬)',
  'Ollama only': 'Ollama만',
  'Yes (Ollama web UI)': '예 (Ollama 웹 UI)',
  'Yes (PWA)': '예 (PWA)',
  'Requires Ollama running': 'Ollama 실행 필요',
  'Marketplace & Connectors': '마켓플레이스 및 커넥터',

  // LlamaPen — Advantages
  'Multi-Provider Freedom': '멀티 제공자 자유',
  'Connect to OpenAI, Anthropic, Gemini, Ollama, and more. {alternative} only works with a local Ollama instance.':
    'OpenAI, Anthropic, Gemini, Ollama 등에 연결하세요. {alternative}는 로컬 Ollama 인스턴스에서만 작동합니다.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface.':
    '의존성 해결과 병렬 실행으로 전문 에이전트 팀을 조율하세요. {alternative}는 단일 채팅 인터페이스입니다.',
  'Agent Memory & Knowledge Base': '에이전트 메모리 및 지식 베이스',
  'Persistent memory with human review, plus a full knowledge base for document ingestion. {alternative} has neither.':
    '인간 검토를 포함한 영구 메모리와 문서 수집을 위한 전체 지식 베이스. {alternative}에는 둘 다 없습니다.',
  'P2P Sync & Ecosystem': 'P2P 동기화 및 에코시스템',
  'Cross-device sync via Yjs/WebRTC, marketplace, connectors, and traces. {alternative} offers none of these.':
    'Yjs/WebRTC를 통한 기기 간 동기화, 마켓플레이스, 커넥터, 트레이스. {alternative}는 이 중 아무것도 제공하지 않습니다.',

  // LlamaPen — Pricing
  'Ollama-only (no cloud providers)': 'Ollama만 (클라우드 제공자 없음)',
  'No P2P sync or marketplace': 'P2P 동기화 또는 마켓플레이스 없음',

  // LlamaPen — Honest take
  'Only use local Ollama models and want the simplest possible chat UI':
    '로컬 Ollama 모델만 사용하고 가장 간단한 채팅 UI를 원하는 경우',
  'Don’t need multi-agent orchestration or agent memory':
    '멀티 에이전트 오케스트레이션이나 에이전트 메모리가 필요 없는 경우',
  'Want a lightweight, zero-config interface exclusively for Ollama':
    'Ollama 전용 가볍고 설정 없는 인터페이스를 원하는 경우',

  // MiniMax — TL;DR
  'Cloud (MiniMax infra)': '클라우드 (MiniMax 인프라)',
  'Free tier + credits': '무료 플랜 + 크레딧',
  'Expert collection': '전문가 컬렉션',

  // MiniMax — Feature table
  'Credit-based': '크레딧 기반',

  // MiniMax — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. MiniMax Agent processes everything on their cloud infrastructure.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. MiniMax Agent는 모든 것을 클라우드 인프라에서 처리합니다.',
  'Pay only for your own LLM API usage. No credit system, no usage caps, no surprise bills.':
    '자체 LLM API 사용량만 지불하세요. 크레딧 시스템 없이, 사용량 한도 없이, 예상치 못한 청구서 없이.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} offers an expert collection but lacks true multi-agent orchestration.':
    '의존성 해결과 병렬 실행으로 전문 에이전트 팀을 조율하세요. {alternative}는 전문가 컬렉션을 제공하지만 진정한 멀티 에이전트 오케스트레이션이 부족합니다.',

  // MiniMax — Pricing
  'Free + credits': '무료 + 크레딧',
  'Credit-based usage system': '크레딧 기반 사용 시스템',
  'No bring-your-own-key': 'BYOK 없음',

  // MiniMax — Honest take
  'Want ready-made chatbot deployment to Telegram, Discord, or Slack':
    'Telegram, Discord 또는 Slack에 즉시 배포 가능한 챗봇을 원하는 경우',
  'Need built-in PPT creation and website building tools':
    '내장 PPT 생성 및 웹사이트 빌딩 도구가 필요한 경우',
  'Prefer a zero-config SaaS with scheduled task execution':
    '예약 작업 실행이 가능한 설정 없는 SaaS를 선호하는 경우',

  // NextDocs — TL;DR
  'From $18/mo': '월 $18부터',
  'Document generation': '문서 생성',

  // NextDocs — Feature table
  'Platform-locked': '플랫폼 종속',
  'Docs & slides only': '문서 및 슬라이드만',
  'Unlimited Usage': '무제한 사용',
  'Credit-based limits': '크레딧 기반 제한',

  // NextDocs — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud servers.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. {alternative}는 모든 것을 클라우드 서버에서 처리합니다.',
  'Pay only for your own LLM API usage. No $18–$90/month subscription, no credit limits, no feature gates.':
    '자체 LLM API 사용량만 지불하세요. 월 $18–$90 구독 없이, 크레딧 제한 없이, 기능 제한 없이.',
  'Beyond Document Generation': '문서 생성을 넘어서',
  'Coordinate specialized agent teams for any task — research, writing, analysis, development. {alternative} is limited to generating documents and slides.':
    '모든 작업을 위해 전문 에이전트 팀을 조율하세요 — 연구, 작성, 분석, 개발. {alternative}는 문서와 슬라이드 생성에 제한됩니다.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their platform with no BYOK option.':
    'OpenAI, Anthropic, Gemini, Ollama, Mistral 등을 자유롭게 전환하세요. {alternative}는 BYOK 옵션 없이 플랫폼에 종속시킵니다.',

  // NextDocs — Pricing
  'Free tier limited to 500 credits': '무료 플랜은 500 크레딧으로 제한',
  'Pro plans from $18 to $90/month': 'Pro 플랜은 월 $18에서 $90',

  // NextDocs — Honest take
  'Need polished document and slide generation from prompts':
    '프롬프트에서 세련된 문서와 슬라이드 생성이 필요한 경우',
  'Want multi-variant output with brand kit consistency':
    '브랜드 키트 일관성을 갖춘 다중 변형 출력을 원하는 경우',
  'Prefer built-in export to PDF, Google Slides, and PowerPoint':
    'PDF, Google Slides, PowerPoint로의 내장 내보내기를 선호하는 경우',

  // Replit — TL;DR
  'Cloud (Replit infra)': '클라우드 (Replit 인프라)',
  'Single agent (app builder)': '단일 에이전트 (앱 빌더)',

  // Replit — Feature table
  'Limited daily credits': '일일 크레딧 제한',

  // Replit — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. Replit Agent processes everything on their cloud infrastructure.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. Replit Agent는 모든 것을 클라우드 인프라에서 처리합니다.',
  'Pay only for your own LLM API usage. No $17–$100/month subscription, no credit limits, no surprise bills.':
    '자체 LLM API 사용량만 지불하세요. 월 $17–$100 구독 없이, 크레딧 제한 없이, 예상치 못한 청구서 없이.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-agent app building.':
    '의존성 해결과 병렬 실행으로 전문 에이전트 팀을 조율하세요. {alternative}는 단일 에이전트 앱 빌딩에 집중합니다.',

  // Replit — Pricing
  'Credit-based usage ($20–$100)': '크레딧 기반 사용 ($20–$100)',
  'Paid tiers for more builds': '더 많은 빌드를 위한 유료 플랜',

  // Replit — Honest take
  'Need one-click deployment and built-in hosting for apps':
    '앱을 위한 원클릭 배포와 내장 호스팅이 필요한 경우',
  'Want an all-in-one IDE with instant infrastructure setup':
    '즉각적인 인프라 설정이 가능한 올인원 IDE를 원하는 경우',
  'Prefer a managed platform for full-stack app generation':
    '풀스택 앱 생성을 위한 관리형 플랫폼을 선호하는 경우',

  // Roma — Hero
  'Full AI agent orchestration that runs in your browser — no Python, no Docker, no setup.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — Python 없이, Docker 없이, 설정 없이.',

  // Roma — TL;DR
  'Python + Docker setup': 'Python + Docker 설정',
  'Code-first / API-first': '코드 우선 / API 우선',
  'Python + DSPy framework': 'Python + DSPy 프레임워크',

  // Roma — Feature table
  'Recursive pipeline': '재귀 파이프라인',
  'OpenRouter + major providers': 'OpenRouter + 주요 제공자',

  // Roma — Advantages
  'No Python, no Docker, no DSPy — just open your browser. {alternative} requires a full Python environment with Docker.':
    'Python 없이, Docker 없이, DSPy 없이 — 브라우저만 여세요. {alternative}는 Docker를 포함한 전체 Python 환경이 필요합니다.',
  'Full graphical UI with agent visualization and real-time workflow tracking. {alternative} is a code-first framework with a REST API.':
    '에이전트 시각화와 실시간 워크플로우 추적이 가능한 완전한 그래픽 UI. {alternative}는 REST API를 갖춘 코드 우선 프레임워크입니다.',
  'Persistent memory system and knowledge base with human review. {alternative} focuses on execution pipelines without built-in memory.':
    '인간 검토를 포함한 영구 메모리 시스템과 지식 베이스. {alternative}는 내장 메모리 없이 실행 파이프라인에 집중합니다.',
  'Works on any device including mobile — no install, no server infrastructure. Everything runs client-side as a PWA.':
    '모바일 포함 모든 기기에서 작동 — 설치 없이, 서버 인프라 없이. 모든 것이 PWA로 클라이언트 측에서 실행됩니다.',

  // Roma — Pricing
  'Requires Python + Docker': 'Python + Docker 필요',
  'No visual UI — code-first only': '시각적 UI 없음 — 코드 우선만',
  'Server infrastructure needed': '서버 인프라 필요',
  'No built-in knowledge base': '내장 지식 베이스 없음',

  // Roma — Honest take
  'Need recursive task decomposition with DSPy-based prediction strategies':
    'DSPy 기반 예측 전략을 포함한 재귀적 작업 분해가 필요한 경우',
  'Want a programmable pipeline with Atomizer, Planner, Executor, and Verifier stages':
    'Atomizer, Planner, Executor, Verifier 단계를 갖춘 프로그래밍 가능한 파이프라인을 원하는 경우',
  'Prefer MLflow observability and E2B sandboxed code execution':
    'MLflow 관찰 가능성과 E2B 샌드박스 코드 실행을 선호하는 경우',

  // RunnerH — TL;DR
  'Cloud-based processing': '클라우드 기반 처리',
  'Enterprise (contact sales)': '엔터프라이즈 (영업팀 문의)',
  'Computer-use agent': '컴퓨터 사용 에이전트',

  // RunnerH — Feature table
  Partially: '부분적',
  'Cloud API/demo': '클라우드 API/데모',
  'Sub-agent architecture': '서브 에이전트 아키텍처',
  'Proprietary Holo models': '독점 Holo 모델',
  'Cross-Platform Automation': '크로스 플랫폼 자동화',
  'Browser-based': '브라우저 기반',
  'Desktop, web & mobile': '데스크톱, 웹 및 모바일',
  'None (enterprise only)': '없음 (엔터프라이즈만)',

  // RunnerH — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. Runner H processes everything on H Company’s cloud infrastructure.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. Runner H는 모든 것을 H Company의 클라우드 인프라에서 처리합니다.',
  'Pay only for your own LLM API usage. Runner H runs are “extremely costly” and require enterprise contracts.':
    '자체 LLM API 사용량만 지불하세요. Runner H 실행은 “매우 비싸며” 엔터프라이즈 계약이 필요합니다.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-task computer-use automation.':
    '의존성 해결과 병렬 실행으로 전문 에이전트 팀을 조율하세요. {alternative}는 단일 작업 컴퓨터 사용 자동화에 집중합니다.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into proprietary Holo models.':
    'OpenAI, Anthropic, Gemini, Ollama, Mistral 등을 자유롭게 전환하세요. {alternative}는 독점 Holo 모델에 종속시킵니다.',

  // RunnerH — Pricing
  'Extremely costly per run': '실행당 매우 높은 비용',
  'No self-serve pricing': '셀프 서비스 가격 없음',
  'Locked to proprietary models': '독점 모델에 종속',

  // RunnerH — Honest take
  'Need SOTA computer-use automation across desktop, web, and mobile':
    '데스크톱, 웹, 모바일 전반에 걸친 SOTA 컴퓨터 사용 자동화가 필요한 경우',
  'Require cross-platform GUI interaction with visual grounding':
    '시각적 그라운딩을 포함한 크로스 플랫폼 GUI 상호작용이 필요한 경우',
  'Have an enterprise budget and need benchmark-leading task completion':
    '엔터프라이즈 예산이 있고 벤치마크 선도 작업 완료가 필요한 경우',

  // Trace — TL;DR
  'Not listed (beta)': '미등록 (베타)',
  'Closed-source': '비공개 소스',

  // Trace — Feature table
  'Workflow-based': '워크플로우 기반',
  Unknown: '알 수 없음',
  Availability: '가용성',
  'Available now': '현재 이용 가능',
  'Beta / waitlist': '베타 / 대기 목록',
  'Not publicly listed': '공개 미등록',

  // Trace — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. Trace processes everything on their cloud infrastructure.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. Trace는 모든 것을 클라우드 인프라에서 처리합니다.',
  'Available & Free': '이용 가능 및 무료',
  'Use {productName} today at no cost — no waitlist, no beta access required. Trace is still in closed beta with undisclosed pricing.':
    '지금 무료로 {productName}을 사용하세요 — 대기 목록 없이, 베타 접근 필요 없이. Trace는 아직 비공개 베타로 가격이 공개되지 않았습니다.',
  'Open Source & Transparent': '오픈 소스 및 투명',
  'Fully open-source under MIT license — inspect, modify, and self-host. Trace is closed-source with no public codebase.':
    'MIT 라이선스 하의 완전한 오픈 소스 — 검사, 수정, 자체 호스팅. Trace는 공개 코드베이스 없는 비공개 소스입니다.',
  'Works Offline': '오프라인 작동',
  'Run entirely in your browser without internet after initial load. Trace’s cloud-based architecture requires a constant connection.':
    '초기 로드 후 인터넷 없이 브라우저에서 완전히 실행됩니다. Trace의 클라우드 기반 아키텍처는 지속적인 연결이 필요합니다.',

  // Trace — Pricing
  'Closed beta / waitlist only': '비공개 베타 / 대기 목록만',
  'Pricing not publicly available': '가격 비공개',
  'BYOK status unknown': 'BYOK 상태 알 수 없음',

  // Trace — Honest take
  'Need a knowledge-graph context engine for enterprise workflows':
    '엔터프라이즈 워크플로우를 위한 지식 그래프 컨텍스트 엔진이 필요한 경우',
  'Want built-in SLA monitoring and department-level coordination':
    '내장 SLA 모니터링과 부서 수준 조율을 원하는 경우',
  'Require deep Slack, Notion, Jira, and Google Drive integrations out of the box':
    '기본 제공 심층 Slack, Notion, Jira, Google Drive 통합이 필요한 경우',

  // V7Go — Feature table
  'Document processing': '문서 처리',
  'Document processing only': '문서 처리만',
  'No free tier': '무료 플랜 없음',

  // V7Go — Advantages
  'All data stays in your browser — IndexedDB, encrypted tokens, zero telemetry. {alternative} processes all documents on their cloud infrastructure.':
    '모든 데이터가 브라우저에 남습니다 — IndexedDB, 암호화된 토큰, 텔레메트리 제로. {alternative}는 모든 문서를 클라우드 인프라에서 처리합니다.',
  'Pay only for your own LLM API usage. No enterprise contracts, no per-page pricing, no sales calls required.':
    '자체 LLM API 사용량만 지불하세요. 엔터프라이즈 계약 없이, 페이지당 가격 없이, 영업 전화 필요 없이.',
  'Beyond Document Processing': '문서 처리를 넘어서',
  'Coordinate specialized agent teams for any task — research, writing, analysis, development. {alternative} is focused on document understanding and data extraction.':
    '모든 작업을 위해 전문 에이전트 팀을 조율하세요 — 연구, 작성, 분석, 개발. {alternative}는 문서 이해와 데이터 추출에 집중합니다.',
  'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} uses their own platform-selected models with no choice.':
    'OpenAI, Anthropic, Gemini, Ollama, Mistral 등을 자유롭게 전환하세요. {alternative}는 선택권 없이 플랫폼이 선택한 모델을 사용합니다.',

  // V7Go — Pricing
  'No free tier available': '이용 가능한 무료 플랜 없음',
  'Enterprise-only pricing': '엔터프라이즈 전용 가격',
  'Cloud-only document processing': '클라우드 전용 문서 처리',

  // V7Go — Honest take
  'Need specialized document understanding and data extraction at enterprise scale':
    '엔터프라이즈 규모의 전문 문서 이해와 데이터 추출이 필요한 경우',
  'Want automated workflows for processing PDFs, images, and structured documents':
    'PDF, 이미지, 구조화된 문서를 처리하기 위한 자동화된 워크플로우를 원하는 경우',
  'Require enterprise integrations and dedicated support for document automation':
    '문서 자동화를 위한 엔터프라이즈 통합과 전담 지원이 필요한 경우',

  // HappyCapy — Hero
  'Full AI agent orchestration that runs in your browser — no cloud sandbox, no credits, no limits.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 — 클라우드 샌드박스 없이, 크레딧 없이, 제한 없이.',

  // HappyCapy — TL;DR
  'Cloud sandbox': '클라우드 샌드박스',
  'From ${price}/mo': '월 ${price}부터',
  'Closed source': '비공개 소스',

  // HappyCapy — Feature table
  'No (cloud infra)': '아니오 (클라우드 인프라)',
  'Agent teams (preview)': '에이전트 팀 (미리보기)',
  'Via skills': '스킬 사용',
  '{alternative} models': '{alternative} 모델',
  'Limited credits': '제한된 크레딧',

  // HappyCapy — Advantages
  'All processing stays in your browser — IndexedDB, encrypted tokens, zero telemetry. {alternative} runs everything on a cloud sandbox.':
    '모든 처리는 브라우저에서 이루어집니다 — IndexedDB, 암호화된 토큰, 텔레메트리 없음. {alternative}는 클라우드 샌드박스에서 모든 것을 실행합니다.',
  'No subscription, no credits. {alternative} starts at $17/mo and goes up to $200/mo for full features.':
    '구독료 없음, 크레딧 없음. {alternative}는 월 $17부터 시작하여 전체 기능은 월 $200까지 올라갑니다.',
  'Full MIT-licensed codebase — inspect, modify, self-host. {alternative} is closed source.':
    '완전한 MIT 라이선스 코드베이스 — 검사, 수정, 자체 호스팅 가능. {alternative}는 비공개 소스입니다.',
  'Use any LLM provider — OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their model access.':
    '어떤 LLM 제공자도 사용 가능 — OpenAI, Anthropic, Gemini, Ollama, Mistral 등. {alternative}는 자체 모델 접근에 종속시킵니다.',

  // HappyCapy — Pricing
  'Closed-source platform': '비공개 소스 플랫폼',
  'Locked to {alternative} models': '{alternative} 모델에 종속',

  // HappyCapy — Honest take
  'Want a managed cloud sandbox environment':
    '관리형 클라우드 샌드박스 환경을 원하는 경우',
  'Need built-in email integration and scheduling':
    '내장 이메일 통합과 일정 관리가 필요한 경우',
  'Prefer access to 150+ models without managing API keys':
    'API 키 관리 없이 150개 이상의 모델에 접근하고 싶은 경우',

  // DeepChat — Feature table (additional)
  'Apache 2.0': 'Apache 2.0',

  // CTA
  'Ready to Take Control of Your AI Workflow?':
    'AI 워크플로우를 직접 관리할 준비가 되셨나요?',
  'Start using {productName} for free — no account needed, no credit card, no server to set up.':
    '{productName}을 무료로 시작하세요 — 계정 불필요, 신용카드 불필요, 서버 설정 불필요.',
  'Get Started →': '시작하기 →',
  'View Source on GitHub': 'GitHub에서 소스 보기',

  // Open WebUI
  'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no server to maintain.':
    '브라우저에서 실행되는 완전한 AI 에이전트 오케스트레이션 \u2014 Docker 불필요, Python 불필요, 서버 유지보수 불필요.',
  'Docker + Python stack': 'Docker + Python 스택',
  'Self-hosted server required': '자체 호스팅 서버 필요',
  'Open WebUI License': 'Open WebUI 라이선스',
  'No (server required)': '아니오 (서버 필요)',
  Experimental: '실험적',
  'OpenAI-compatible APIs + Ollama': 'OpenAI 호환 API + Ollama',
  'Unlimited (self-hosted)': '무제한 (자체 호스팅)',
  'True Zero Infrastructure': '진정한 제로 인프라',
  'Open your browser and start working \u2014 no Docker, no Python, no database, no server to maintain. {alternative} requires Docker, Python, and a database backend to self-host.':
    '브라우저를 열고 바로 시작하세요 \u2014 Docker, Python, 데이터베이스, 서버 유지보수 모두 불필요. {alternative}은 자체 호스팅을 위해 Docker, Python, 데이터베이스 백엔드가 필요합니다.',
  'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface without multi-agent orchestration.':
    '의존성 해결 및 병렬 실행으로 전문 에이전트 팀을 조율합니다. {alternative}은 멀티 에이전트 오케스트레이션이 없는 단일 채팅 인터페이스입니다.',
  'Serverless Privacy': '서버리스 프라이버시',
  'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one. {alternative} requires a running server that stores your data.':
    '모든 데이터가 브라우저에 남습니다 \u2014 IndexedDB, 암호화된 토큰, 제로 텔레메트리. 자체 호스팅 서버조차 없습니다. {alternative}은 데이터를 저장하는 실행 중인 서버가 필요합니다.',
  'Cross-device synchronization via Yjs/WebRTC with no central server. {alternative} requires Redis and a database for multi-user support.':
    '중앙 서버 없이 Yjs/WebRTC를 통한 크로스 디바이스 동기화. {alternative}은 다중 사용자 지원을 위해 Redis와 데이터베이스가 필요합니다.',
  'Requires Docker + Python infrastructure': 'Docker + Python 인프라 필요',
  'Enterprise plans for advanced features':
    '고급 기능을 위한 엔터프라이즈 플랜',
  'Need advanced RAG with vector database options (ChromaDB, PGVector, Qdrant)':
    '벡터 데이터베이스 옵션이 있는 고급 RAG가 필요합니다 (ChromaDB, PGVector, Qdrant)',
  'Want enterprise features like RBAC, LDAP, SSO, and horizontal scaling':
    'RBAC, LDAP, SSO, 수평 확장과 같은 엔터프라이즈 기능이 필요합니다',
  'Need image generation, voice/video calls, and a Pipelines plugin framework':
    '이미지 생성, 음성/영상 통화, Pipelines 플러그인 프레임워크가 필요합니다',
}
