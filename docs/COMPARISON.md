# DEVS — Competitive Landscape & Comparison Matrix

> Last updated: March 2026

## Overview

This document maps the AI agent platform landscape and compares DEVS against counterparts across key dimensions: openness, privacy, pricing, orchestration depth, and ease of use.

---

## Categories

We group solutions into **six categories** based on their primary value proposition:

| Category | Description | Solutions |
|---|---|---|
| **General-Purpose Agent Platforms** | End-to-end AI agent platforms for broad task execution (research, coding, browsing, file management) | Manus, Suna (Kortix), OpenManus, Lemon AI, HappyCapy |
| **Privacy-First / Local-First Agents** | Agents designed to run fully offline and/or self-hosted with strong privacy guarantees | **DEVS**, Open WebUI, AgenticSeek, DeepChat, HugstonOne, LlamaPen |
| **Multi-Agent Orchestration Frameworks** | Developer-oriented frameworks for building and coordinating teams of AI agents | **DEVS**, ROMA, Trace |
| **Software / App Builders (Vibe Coding)** | Platforms for building apps/websites via natural language prompts | Replit Agent, Base44, Dualite |
| **Computer-Use / Browser Automation** | Agents that control browsers, desktops, or mobile devices autonomously | Runner H (Surfer 2), MiniMax Agent, ChatGPT Agent Mode |
| **Specialized Content Generation** | Focused tools for document/slide/presentation creation | Nextdocs, DataKit, V7 Go |

---

## Detailed Profiles

### General-Purpose Agent Platforms

#### Manus (manus.im)
- **Type**: Closed-source SaaS (now part of Meta)
- **What it does**: General AI agent that executes tasks end-to-end — research, web browsing, coding, document generation, slide creation
- **Key features**: Projects (persistent workspaces with shared instructions/knowledge), Wide Research, scheduled tasks, Slack integration, browser operator, web app generation, AI slides
- **Pricing**: Free tier (300 refresh credits/day, 4,000 credits/mo) → Plus (~$39/mo, 8,000 credits) → Pro (~$199/mo, 40,000 credits). Team plans available.
- **Privacy**: Cloud-based; data processed on Meta infrastructure
- **BYOK**: No — uses Manus's own infrastructure
- **Open Source**: No

#### Suna / Kortix (kortix.com)
- **Type**: Open-source platform (self-hostable) + hosted SaaS
- **What it does**: Complete platform for building, managing, and deploying autonomous AI agents — browser automation, file management, web crawling, code execution, API integrations
- **Key features**: Agent builder UI, Docker-sandboxed agent runtimes, Next.js dashboard, Supabase backend, custom agent creation, multiple LLM provider support via LiteLLM
- **Pricing**: Free self-hosted; hosted pricing not publicly listed
- **Privacy**: Self-hostable; Supabase-based (cloud or self-hosted)
- **BYOK**: Yes (Anthropic, OpenAI, Groq, etc.)
- **Open Source**: Yes — custom license (19.5k★)
- **Tech stack**: Python/FastAPI + Next.js/React + Docker

#### OpenManus (github.com/FoundationAgents/OpenManus)
- **Type**: Open-source framework
- **What it does**: General AI agent framework — an open alternative to Manus. Supports web browsing, code execution, data analysis, multi-agent flows
- **Key features**: Browser use via Playwright, configurable LLM backend, multi-agent flow with data analysis agent, sandbox execution, A2A protocol support
- **Pricing**: Free (open source)
- **Privacy**: Self-hosted, local execution
- **BYOK**: Yes (any OpenAI-compatible API)
- **Open Source**: Yes — MIT License (55.1k★)
- **Tech stack**: Python

#### Lemon AI (github.com/hexdocom/lemonai)
- **Type**: Open-source self-evolving agent
- **What it does**: Full-stack general AI agent with VM sandbox for safe code execution, deep search, data analysis, content creation
- **Key features**: Self-evolving memory system, AI HTML editor for iterative refinement, Docker VM sandbox, MCP tool support, multiple search providers, vibe coding
- **Pricing**: Free (open source); online subscription available
- **Privacy**: Fully local execution with Docker sandbox
- **BYOK**: Yes (DeepSeek, Kimi, Qwen, Ollama, OpenAI, Claude, etc.)
- **Open Source**: Yes — Apache 2.0 variant (1.5k★)
- **Tech stack**: JavaScript/Vue + Node.js

#### HappyCapy (happycapy.ai)
- **Type**: Closed-source SaaS
- **What it does**: "Agent-native computer" — a cloud sandbox where AI agents execute tasks via a visual desktop GUI. Runs Claude Code in-browser with skills
- **Key features**: Browser-based sandbox, GUI for agent interactions, skill store, email integration (CapyMail), automation/scheduling, 150+ AI model access via skills
- **Pricing**: Free (limited) → Pro $17–20/mo (2,000 credits, sandbox upgrade) → Max $167–200/mo (unlimited Claude Code, 4-core sandbox, agent teams preview)
- **Privacy**: Cloud sandbox; data on HappyCapy infrastructure
- **BYOK**: No — uses HappyCapy's model access
- **Open Source**: No (compatible with open-source skills)

---

### Privacy-First / Local-First Agents

#### DEVS (this project)
- **Type**: Open-source browser-native PWA
- **What it does**: Multi-agent orchestration platform running entirely in the browser. Users delegate complex tasks to teams of AI agents that collaborate autonomously
- **Key features**: Browser-native (IndexedDB, Service Workers, Web Crypto), multi-agent orchestration with dependency resolution, hyper meta-prompting, agent memory & learning, knowledge base, P2P sync via Yjs/WebRTC, connector ecosystem (Google Drive, Gmail, Notion), local backup, marketplace, LLM observability/traces
- **Pricing**: Free (open source) — users pay only for their own LLM API usage
- **Privacy**: 100% client-side; no server, no data leaves the browser. Encrypted token storage
- **BYOK**: Yes — provider-agnostic (OpenAI, Anthropic, Gemini, Ollama, Mistral, and more)
- **Open Source**: Yes — MIT License
- **Tech stack**: TypeScript/React + Vite + Zustand + Yjs + IndexedDB

#### AgenticSeek (github.com/Fosowl/agenticSeek)
- **Type**: Open-source local agent
- **What it does**: Fully local Manus alternative — autonomous web browsing, code writing/execution, task planning, voice-enabled assistant
- **Key features**: Smart agent selection/routing, web browsing (selenium/stealth), code execution (Python, C, Go, Java+), task planning & decomposition, speech-to-text/TTS, session recovery
- **Pricing**: Free (open source) — local LLM = zero API cost
- **Privacy**: 100% local; all processing on-device
- **BYOK**: Yes (Ollama, LM Studio, OpenAI, DeepSeek, Google, HuggingFace, TogetherAI, OpenRouter)
- **Open Source**: Yes — GPL-3.0 (25.4k★)
- **Tech stack**: Python + Docker + SearxNG

#### DeepChat (github.com/ThinkInAIXYZ/deepchat)
- **Type**: Open-source desktop app
- **What it does**: Desktop AI agent platform unifying models, tools (MCP), and agent runtimes (ACP) in one Electron app
- **Key features**: Multi-LLM management (30+ providers), built-in Ollama integration, MCP tool calling, ACP agent protocol, multi-window/multi-tab UI, search enhancement (Brave, Google, Bing), privacy-focused local storage, screen hiding
- **Pricing**: Free (open source)
- **Privacy**: Local data storage; network proxy support; screen projection hiding
- **BYOK**: Yes (extensive provider list — OpenAI, Anthropic, Gemini, DeepSeek, Ollama, LM Studio, 30+ more)
- **Open Source**: Yes — Apache 2.0 (5.6k★)
- **Tech stack**: TypeScript/Vue + Electron

#### HugstonOne (hugston.com)
- **Type**: Downloadable desktop app (freemium)
- **What it does**: Local & offline AI inference app supporting 10,000+ GGUF models with code editor and live preview
- **Key features**: 100% offline local inference, GPU & CPU support, image-to-text & text-to-text, integrated code editor with live preview, model isolation
- **Pricing**: Free (password required via email); Enterprise edition available
- **Privacy**: 100% offline, runs fully locally
- **BYOK**: N/A — runs local GGUF models directly
- **Open Source**: No (proprietary but free)
- **Tech stack**: Desktop application (Windows)

#### Open WebUI (openwebui.com)
- **Type**: Open-source self-hosted AI platform
- **What it does**: Feature-rich, self-hosted AI interface designed for offline operation. Unified LLM frontend with RAG, pipelines, model management, multi-user support, and enterprise features
- **Key features**: Universal OpenAI-compatible API support, built-in Ollama integration, advanced RAG with 9 vector database options (ChromaDB, PGVector, Qdrant, Milvus, etc.), web search (15+ providers), Pipelines plugin framework, native Python function calling/tools, model builder for custom agents/personas, multi-model conversations, voice/video calls (multiple STT/TTS providers), image generation (DALL-E, ComfyUI, AUTOMATIC1111), RBAC/LDAP/SCIM 2.0/SSO, Channels (Slack/Discord-style collaboration), memory feature, OpenTelemetry observability, horizontal scaling with Redis, cloud storage backends (S3, GCS, Azure), community marketplace for models/prompts/tools, PWA support
- **Pricing**: Free (open source); Enterprise plans available (contact sales) for custom branding, SLA, LTS
- **Privacy**: Self-hosted; can run fully offline with local models. Data stays on your infrastructure
- **BYOK**: Yes — Ollama, any OpenAI-compatible API (OpenAI, Anthropic, Gemini, Groq, Mistral, OpenRouter, LM Studio, and more)
- **Open Source**: Yes — Open WebUI License (126k★)
- **Tech stack**: Python/SvelteKit + SQLite/PostgreSQL + Docker

#### LlamaPen
- **Type**: Browser-based Ollama GUI
- **What it does**: No-install-needed web GUI for Ollama — chat interface for local LLMs
- **Key features**: Zero installation, connects to local Ollama instance, web-based UI
- **Pricing**: Free
- **Privacy**: Fully local (connects to local Ollama)
- **BYOK**: N/A — uses local Ollama models
- **Open Source**: Yes

---

### Multi-Agent Orchestration Frameworks

#### ROMA (github.com/sentient-agi/ROMA)
- **Type**: Open-source meta-agent framework
- **What it does**: Recursive hierarchical multi-agent system for complex problem solving. Decomposes tasks into parallelizable subtasks using Atomizer → Planner → Executor → Aggregator → Verifier pipeline
- **Key features**: DSPy-based modules, recursive plan-execute loop, parallel batch execution, multiple prediction strategies (CoT, ReAct, CodeAct), 9 built-in toolkits, MCP integration, REST API, MLflow observability, E2B code execution
- **Pricing**: Free (open source) — LLM API costs apply
- **Privacy**: Self-hosted; supports file-based or PostgreSQL storage
- **BYOK**: Yes (OpenRouter, OpenAI, Anthropic, Fireworks, any LLM)
- **Open Source**: Yes — Apache 2.0 (5k★)
- **Tech stack**: Python + DSPy + Docker

#### Trace (trace.so)
- **Type**: Closed-source SaaS (beta / waitlist)
- **What it does**: AI orchestration layer for business operations — connects AI agents with human workflows across departments
- **Key features**: Context engine (knowledge graph), human-AI orchestration, workflow automation, SLA monitoring, department-level coordination, Slack/Notion/Jira/Google Drive integrations, execution governance
- **Pricing**: Not publicly listed (beta); raised $3M seed
- **Privacy**: Cloud-based; enterprise security
- **BYOK**: Unknown
- **Open Source**: No

---

### Software / App Builders (Vibe Coding)

#### Replit Agent
- **Type**: Closed-source SaaS
- **What it does**: AI agent that builds full-stack applications from natural language prompts — generates code, sets up infrastructure, deploys
- **Key features**: Autonomous long builds, workspace collaboration, one-click deployment, built-in hosting, GitHub integration
- **Pricing**: Free (limited daily credits) → Core $17/mo ($20 credits) → Pro $95–100/mo ($100 credits, up to 10 collaborators)
- **Privacy**: Cloud-based (Replit infrastructure)
- **BYOK**: No
- **Open Source**: No

#### Base44 (base44.com)
- **Type**: Closed-source SaaS
- **What it does**: AI-powered platform for building fully functional apps via natural language — auto-generates frontend, backend, auth, database
- **Key features**: Natural language app building, automatic backend/auth/DB generation, built-in hosting + analytics + custom domains, one-click publish, multiple AI model selection
- **Pricing**: Free tier → Paid from $20/mo
- **Privacy**: Cloud-based
- **BYOK**: No (platform selects models)
- **Open Source**: No

#### Dualite (dualite.dev)
- **Type**: Closed-source SaaS
- **What it does**: AI platform for building web & mobile apps from prompts — Figma-to-code, templates, code download
- **Key features**: 100+ templates, web & mobile app generation, Figma-to-code, prompt enhancer, GitHub import, authentication integration, backend database, custom domains
- **Pricing**: Free (5 messages) → Pro $29/mo (200 messages) → Launch $79/mo (unlimited)
- **Privacy**: Cloud-based
- **BYOK**: No
- **Open Source**: No

---

### Computer-Use / Browser Automation

#### Runner H / Surfer 2 (hcompany.ai)
- **Type**: Closed-source agent (API/demo)
- **What it does**: Cross-platform computer-use agent for desktop, web, and mobile — SOTA on OSWorld, WebVoyager, WebArena, AndroidWorld benchmarks
- **Key features**: Orchestrator + sub-agent architecture, visual grounding, failure recovery, cross-platform (desktop/web/mobile), surpasses human performance on desktop & mobile benchmarks
- **Pricing**: Enterprise/API (contact sales); runs are "extremely costly"
- **Privacy**: Cloud-based processing
- **BYOK**: No (uses H Company's proprietary Holo models + frontier models)
- **Open Source**: Partially (Surfer-H agent open-sourced)

#### MiniMax Agent (agent.minimax.io)
- **Type**: Closed-source SaaS
- **What it does**: General-purpose AI agent with task execution, browsing, research, PPT creation, website building, coding
- **Key features**: MaxClaw (customizable AI agents for Telegram/Discord/Slack), scheduled tasks, expert collection (Office, Finance, Coding), OpenClaw one-click setup, asset management
- **Pricing**: Free tier with credits; credit-based system
- **Privacy**: Cloud-based (MiniMax infrastructure)
- **BYOK**: No
- **Open Source**: No

#### ChatGPT Agent Mode (OpenAI)
- **Type**: Closed-source SaaS (part of ChatGPT)
- **What it does**: Autonomous agent mode within ChatGPT that can browse, code, analyze data, and execute multi-step tasks
- **Key features**: Integrated into ChatGPT ecosystem, browsing, code interpreter, file analysis, multi-step reasoning, tool use
- **Pricing**: Included with ChatGPT Plus ($20/mo) and Pro ($200/mo)
- **Privacy**: Cloud-based (OpenAI infrastructure)
- **BYOK**: No
- **Open Source**: No

---

### Specialized Content Generation

#### Nextdocs (nextdocs.io)
- **Type**: Closed-source SaaS
- **What it does**: AI document and slide/presentation generator — create docs, slides, social posts from prompts
- **Key features**: Multi-variant generation (up to 4 at once), brand kit, deep research integration, AI + manual editing, export to PDF/Google Slides/PowerPoint/Google Docs, MCP integration for Claude/ChatGPT
- **Pricing**: Free (500 credits, 8 pages) → Pro $18/mo → Pro+ $36/mo → Ultra $90/mo
- **Privacy**: Cloud-based
- **BYOK**: No
- **Open Source**: No

#### DataKit (datakit.page)
- **Type**: Open-source local data tool
- **What it does**: Browser-based local data analysis — import CSV, JSON, XLS, Parquet files and analyze with AI assistance
- **Key features**: Everything runs locally (data never leaves device), AI assistant (sees table structure only), BYOK (OpenAI, Anthropic, Ollama), remote sources (Postgres, S3, HuggingFace), self-hostable (Docker, Homebrew, pip, npm)
- **Pricing**: Free
- **Privacy**: 100% local; files never leave device
- **BYOK**: Yes (OpenAI, Anthropic, Ollama)
- **Open Source**: Yes

#### V7 Go (v7labs.com/go)
- **Type**: Closed-source SaaS (enterprise)
- **What it does**: AI document automation for high-stakes industries (finance, insurance, legal, real estate) — 300+ expert-built agents
- **Key features**: 95–99% accuracy on document tasks, 1,000+ integrations, knowledge hubs, document generation (slides, docs, Excel), multi-model support, SOC 2/HIPAA/GDPR compliance
- **Pricing**: Enterprise (book a demo); no public pricing
- **Privacy**: Enterprise-grade security (ISO, HIPAA, SOC 2, GDPR)
- **BYOK**: Partial (choose preferred LLM within platform)
- **Open Source**: No

---

## Comparison Matrix

### Core Capabilities

| Solution | Open Source | License | Browser-Native | Self-Hostable | Multi-Agent | Task Orchestration | Agent Memory |
|---|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **DEVS** | ✅ | MIT | ✅ | ✅ (static files) | ✅ | ✅ Advanced | ✅ |
| Manus | ❌ | Proprietary | ✅ (web app) | ❌ | ❌ | ✅ Basic | ✅ (Projects) |
| Suna (Kortix) | ✅ | Custom | ❌ | ✅ | ✅ | ✅ | ❌ |
| OpenManus | ✅ | MIT | ❌ | ✅ | ✅ | ✅ | ❌ |
| Lemon AI | ✅ | Apache 2.0+ | ❌ | ✅ | ❌ | ✅ Basic | ✅ |
| HappyCapy | ❌ | Proprietary | ✅ (cloud) | ❌ | Preview | ✅ | ❌ |
| AgenticSeek | ✅ | GPL-3.0 | ❌ | ✅ | ✅ | ✅ | ✅ |
| Open WebUI | ✅ | Open WebUI License | ❌ | ✅ (Docker/pip) | ❌ | ❌ | ✅ (experimental) |
| DeepChat | ✅ | Apache 2.0 | ❌ | ✅ (desktop) | ❌ | ❌ | ❌ |
| ROMA | ✅ | Apache 2.0 | ❌ | ✅ | ✅ | ✅ Advanced | ❌ |
| Trace | ❌ | Proprietary | ✅ (SaaS) | ❌ | ✅ | ✅ Advanced | ✅ |
| Replit Agent | ❌ | Proprietary | ✅ (web) | ❌ | ❌ | ❌ | ❌ |
| Base44 | ❌ | Proprietary | ✅ (web) | ❌ | ❌ | ❌ | ❌ |
| Dualite | ❌ | Proprietary | ✅ (web) | ❌ | ❌ | ❌ | ❌ |
| Runner H | ❌ | Proprietary | ✅ (web) | ❌ | ✅ | ✅ | ❌ |
| MiniMax Agent | ❌ | Proprietary | ✅ (web) | ❌ | ❌ | ✅ Basic | ✅ (MaxClaw) |
| ChatGPT Agent | ❌ | Proprietary | ✅ (web) | ❌ | ❌ | ✅ Basic | ✅ |
| Nextdocs | ❌ | Proprietary | ✅ (web) | ❌ | ❌ | ❌ | ❌ |
| DataKit | ✅ | OSS | ✅ | ✅ | ❌ | ❌ | ❌ |
| HugstonOne | ❌ | Proprietary | ❌ | ✅ (desktop) | ❌ | ❌ | ❌ |
| LlamaPen | ✅ | OSS | ✅ | ✅ | ❌ | ❌ | ❌ |
| V7 Go | ❌ | Proprietary | ✅ (web) | ❌ | ✅ | ✅ | ✅ |

### Privacy & Data Control

| Solution | Data Stays Local | No Server Required | Encrypted Storage | Offline Capable | P2P Sync |
|---|:---:|:---:|:---:|:---:|:---:|
| **DEVS** | ✅ | ✅ | ✅ (Web Crypto) | ✅ | ✅ (Yjs/WebRTC) |
| Manus | ❌ | ❌ | N/A | ❌ | ❌ |
| Suna (Kortix) | ⚠️ Self-host | ❌ | N/A | ❌ | ❌ |
| OpenManus | ✅ | ❌ (Python) | ❌ | ❌ | ❌ |
| Lemon AI | ✅ | ❌ (Docker) | ❌ | ⚠️ With local LLM | ❌ |
| HappyCapy | ❌ | ❌ | N/A | ❌ | ❌ |
| AgenticSeek | ✅ | ❌ (Docker) | ❌ | ✅ With local LLM | ❌ |
| Open WebUI | ⚠️ Self-host | ❌ (Docker/Python) | ✅ (SQLCipher) | ✅ With local LLM | ❌ |
| DeepChat | ✅ | ✅ (desktop) | ✅ (reserved) | ⚠️ With local LLM | ❌ |
| ROMA | ⚠️ Self-host | ❌ (Python) | ❌ | ❌ | ❌ |
| Trace | ❌ | ❌ | N/A | ❌ | ❌ |
| Replit Agent | ❌ | ❌ | N/A | ❌ | ❌ |
| Base44 | ❌ | ❌ | N/A | ❌ | ❌ |
| DataKit | ✅ | ✅ | N/A | ✅ | ❌ |
| HugstonOne | ✅ | ✅ | N/A | ✅ | ❌ |
| LlamaPen | ✅ | ✅ | N/A | ✅ | ❌ |

### LLM Provider Support & BYOK

| Solution | BYOK | OpenAI | Anthropic | Google Gemini | Ollama (Local) | Other Providers |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **DEVS** | ✅ | ✅ | ✅ | ✅ | ✅ | Mistral, custom endpoints |
| Manus | ❌ | — | — | — | — | Uses own infra |
| Suna (Kortix) | ✅ | ✅ | ✅ | ✅ | ❌ | Groq, via LiteLLM |
| OpenManus | ✅ | ✅ | ✅ | ✅ | ✅ | Any OpenAI-compatible |
| Lemon AI | ✅ | ✅ | ✅ | ✅ | ✅ | DeepSeek, Kimi, Qwen, VLLM |
| HappyCapy | ❌ | — | ✅ (Claude Code) | — | — | MiniMax M2.5, 150+ via skills |
| AgenticSeek | ✅ | ✅ | ✅ | ✅ | ✅ | DeepSeek, HuggingFace, TogetherAI, OpenRouter, LM Studio |
| Open WebUI | ✅ | ✅ | ✅ | ✅ | ✅ | Any OpenAI-compatible, Groq, DeepSeek, LM Studio, OpenRouter, Mistral |
| DeepChat | ✅ | ✅ | ✅ | ✅ | ✅ | 30+ providers (DeepSeek, Groq, LM Studio, etc.) |
| ROMA | ✅ | ✅ | ✅ | ✅ | ❌ | OpenRouter, Fireworks, any LLM |
| Trace | ❓ | ❓ | ❓ | ❓ | ❓ | Unknown (beta) |
| Replit Agent | ❌ | — | — | — | — | Uses own infra |
| DataKit | ✅ | ✅ | ✅ | ❌ | ✅ | — |

### Pricing Comparison

| Solution | Free Tier | Paid Starting At | Cost Model | Hidden Costs |
|---|:---:|---|---|---|
| **DEVS** | ✅ Unlimited | $0 (BYOK) | Pay your LLM provider directly | LLM API costs only |
| Manus | ✅ 4,000 credits/mo | ~$39/mo | Credit-based subscription | Credits consumed per task |
| Suna (Kortix) | ✅ Self-host | N/A (self-host) | Self-hosted free; SaaS TBD | Infrastructure + LLM API costs |
| OpenManus | ✅ Unlimited | $0 | Free + BYOK | LLM API + compute costs |
| Lemon AI | ✅ | $0 (self-host) | Free self-host; subscription available | Docker + LLM costs |
| HappyCapy | ✅ Limited | $17/mo | Subscription tiers | — |
| AgenticSeek | ✅ Unlimited | $0 | Free + local LLM | Hardware (GPU) for local LLM |
| Open WebUI | ✅ Unlimited | $0 (self-host) | Free self-host; Enterprise contact sales | Infrastructure + LLM API costs |
| DeepChat | ✅ Unlimited | $0 | Free desktop app | LLM API costs |
| ROMA | ✅ Unlimited | $0 | Free + BYOK | LLM API + compute costs |
| Trace | ✅ Beta/waitlist | TBD | Enterprise SaaS | — |
| Replit Agent | ✅ Limited | $17/mo | Subscription + credits | Credit top-ups |
| Base44 | ✅ Limited | $20/mo | Subscription | — |
| Dualite | ✅ 5 messages | $29/mo | Subscription | — |
| Runner H | ❌ | Enterprise | Contact sales | Very high compute costs |
| MiniMax Agent | ✅ Credits | Credit-based | Free credits + purchases | — |
| ChatGPT Agent | ❌ | $20/mo (Plus) | Subscription | — |
| Nextdocs | ✅ 500 credits | $18/mo | Subscription + credits | — |
| DataKit | ✅ Unlimited | $0 | Free | LLM API costs |
| HugstonOne | ✅ (password) | Enterprise | Free + enterprise | Hardware (GPU) |

---

## Unique Differentiators — DEVS vs. the Field

| Differentiator | DEVS | Closest Competitors |
|---|---|---|
| **Zero infrastructure** | Runs entirely in the browser — no Docker, no Python, no server | AgenticSeek, Suna, OpenManus, Open WebUI all require Docker/Python |
| **True browser-native** | PWA with IndexedDB + Service Workers + Web Crypto | Only DataKit and LlamaPen are also browser-native, but lack orchestration |
| **Multi-agent orchestration** | Advanced dependency-aware team coordination with parallel execution | ROMA (Python framework), Trace (SaaS), OpenManus (basic) |
| **Provider-agnostic BYOK** | Abstract LLM interface — swap providers without code changes | Open WebUI (any OpenAI-compatible), DeepChat (30+ providers), AgenticSeek (many) |
| **Agent memory & learning** | Conversation-based learning with human review workflow | Manus (Projects), Lemon AI (self-evolving), MiniMax (MaxClaw) |
| **P2P sync** | Yjs/WebRTC CRDT-based cross-device sync — no central server | No competitor offers browser-native P2P sync |
| **Offline-first** | Full functionality without internet (with local LLM) | AgenticSeek, HugstonOne (desktop apps, not browser) |
| **Connector ecosystem** | OAuth 2.0 PKCE integrations (Google Drive, Gmail, Calendar, Notion) | Suna (external tools), Trace (Slack/Notion/Jira) |
| **Marketplace & extensions** | Standardized YAML-based extension system for agents, tools, connectors | No direct equivalent in OSS space |
| **Complete privacy** | All data stays in browser; encrypted tokens; no telemetry | AgenticSeek (local), Open WebUI (self-host), DeepChat (desktop) — all need Docker/install |

---

## Competitive Positioning Map

```
                        PRIVACY / LOCAL-FIRST
                              ↑
                              |
          HugstonOne    AgenticSeek
          LlamaPen     Open WebUI
                      DeepChat    DEVS ★
                              |
   SIMPLE ←————————————————————————————————→ ADVANCED ORCHESTRATION
                              |
          DataKit        Lemon AI    ROMA
          Nextdocs           |      Trace
                        OpenManus
                              |
          Dualite        Suna/Kortix
          Base44              |     Manus
          Replit         HappyCapy
                              |
                    Runner H  |  V7 Go
                    MiniMax   ChatGPT Agent
                              |
                        CLOUD / MANAGED
```

---

## Summary & Recommendations

### When DEVS wins
- **Privacy-conscious users** who refuse to send data to any server
- **BYOK enthusiasts** who want complete control over LLM costs and providers
- **Teams wanting P2P collaboration** without a central server
- **Users on constrained devices** — 2GB RAM minimum, browser-only
- **Multi-agent orchestration** with sophisticated task decomposition
- **Offline/air-gapped environments** — works without internet after initial load

### When alternatives may be better
- **Manus** — for users who want a polished, zero-config SaaS experience and don't mind cloud processing
- **Replit Agent / Base44 / Dualite** — for app/website building (vibe coding) specifically
- **Runner H** — for enterprise-grade computer-use automation with SOTA benchmark performance
- **ROMA** — for Python developers building custom multi-agent research pipelines
- **V7 Go** — for enterprise document automation in regulated industries (finance, legal, insurance)
- **AgenticSeek** — for users who want fully local execution with voice control and don't need browser-native architecture
- **Open WebUI** — for teams wanting a polished, self-hosted multi-user LLM interface with enterprise features (RBAC, LDAP, SCIM, horizontal scaling) and extensive RAG capabilities
- **DeepChat** — for desktop users wanting a unified multi-provider chat interface with MCP/ACP support

---

## Notes on Methodology

- Data collected March 2026 from official websites, GitHub repositories, and public documentation
- Pricing reflects publicly available information; some platforms have opaque or enterprise-only pricing
- GitHub star counts are approximate and may have changed since data collection
- "Privacy" assessments are based on architecture claims, not independent audits
