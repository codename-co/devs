# DEVS - Vision

> The Web as the runtime for agentic AI. Open your browser and start delegating.

## The Problem

Agentic AI is arriving fast, and arriving locked down. Every existing solution falls into one of two traps:

1. **Paid APIs behind a wall.** The major agentic platforms — ChatGPT, Claude, Gemini — gate their best capabilities behind subscriptions or per-token billing. Delegating real work to a swarm of agents means paying someone else for every thought. For students, small businesses, and most of the world, that's a non-starter.

2. **Open-source with a PhD in DevOps.** The self-hosted alternatives (AutoGPT, CrewAI, LangGraph) are powerful but demand Python environments, API key wiring, Docker stacks, or cloud VMs. "Anyone can use it" really means "any engineer with a free afternoon can set it up."

Both paths share a deeper problem: **trust**. You are handing your prompts, your data, and your model choice to a third party you cannot control. You can't audit what happens to your data on their servers. You can't verify they won't change pricing, degrade the model, or shut down the service. You can't stop them from training on your inputs. The terms of service can change tomorrow — and you have no recourse.

For anyone in a regulated, privacy-sensitive, or sovereignty-conscious context, that dependency is a blocker. And for everyone else, it's a risk they've simply been trained to accept.

If agentic AI is going to be universally useful, it can't ask everyone to pay a gatekeeper, run infrastructure, or surrender control to use it.

## The Thesis

There's a third option — one that doesn't charge per token and doesn't require a terminal. It's already on every device with a screen. The Web platform has quietly accumulated every primitive an agent swarm needs — and these aren't proprietary browser features, they're open standards:

| Primitive | Web Standard | Agentic Role |
|-----------|-------------|--------------|
| Background execution | Service Workers | Agent runtime that outlives the tab |
| Durable state | IndexedDB + CRDTs | Persistent memory, conversation history |
| Inter-agent coordination | Broadcast Channel, Yjs | Multi-agent messaging and sync |
| Compute | WebAssembly, WebGPU | Local inference, heavy processing |
| Networking | Fetch, WebSocket, WebRTC | LLM API calls, P2P sync |
| Security | Web Crypto API | Encrypted credential storage |
| File system | File System Access API | Local backup, folder watching |

These are W3C and WHATWG specifications — vendor-neutral, publicly governed, implemented across every modern runtime. Building on Web standards means DEVS isn't locked to any browser, any OS, or any company's roadmap. The platform runs wherever the standards do.

Together they can host a real agent swarm — dynamic team formation, structured orchestration, tool use — entirely client-side. No subscription. No infrastructure. No third party standing between you and your agents. Trust shifts from "trust the vendor" to "trust the open Web."

On top of that foundation, DEVS makes opinionated engineering choices that turn the browser into something no other agentic platform offers: a **sandboxed computer**. Two runtimes — QuickJS (JavaScript) and Pyodide (CPython 3.11), both compiled to WebAssembly — give agents the ability to write and execute real code without ever leaving the browser. JavaScript for fast algorithms; Python with 60+ pre-compiled packages (NumPy, Pandas, scikit-learn, Matplotlib, OpenCV) for data science, analysis, and visualization. Both run in complete isolation: capped memory, hard timeouts, no network access, no filesystem outside a virtual sandbox. Agents can compute, not just converse — and the code never touches a server.

## What DEVS Is

**DEVS** is an open-source platform built on Web standards and opinionated engineering that lets anyone delegate complex tasks to a swarm of AI agents — without servers, without subscriptions, without surrendering data, and without vendor lock-in.

### Core Capabilities

1. **Delegate, don't chat.** Users describe a goal; the system analyzes complexity, assembles a purpose-built team, decomposes work, and delivers structured output.

2. **Bring Your Own Model.** A unified provider abstraction sits in front of 12+ LLM backends — cloud APIs (OpenAI, Anthropic, Google, Mistral), self-hosted endpoints (Ollama, LM Studio), and local in-browser inference (HuggingFace Transformers + WebGPU). Users switch mid-run. The platform doesn't care where the intelligence comes from — and neither does the bill.

3. **Privacy by architecture, not by promise.** All data stays on the device. Yjs CRDTs provide the data layer; IndexedDB handles persistence; Web Crypto API encrypts credentials. No telemetry is collected unless the user explicitly opts in. There is no server to subpoena, no terms of service to change, no vendor decision that can revoke access to your own data.

4. **Swarm intelligence.** Agents have roles, tools, memories, and knowledge bases. The orchestrator routes tasks by complexity tier — simple prompts go single-agent; complex goals trigger multi-agent decomposition with dependency resolution, parallel execution, and synthesis.

5. **Extensible.** A marketplace of apps, agents, connectors, and tools — all defined in YAML, executed in sandboxed iframes, communicating through a typed message bridge.

## Who It's For

- **Everyone who's been priced out** — students, freelancers, small teams, and the global majority who can't justify $20+/month per seat for AI tooling
- **Privacy-conscious professionals** who can't send proprietary data to third-party APIs they don't control
- **Developers** who want to prototype agentic workflows without infrastructure
- **Regulated industries** (healthcare, legal, finance) needing sovereignty over data and models
- **Anyone tired of dependency** — on pricing changes, on service degradation, on a vendor's goodwill

## Design Principles

| Principle | What It Means in Practice |
|-----------|--------------------------|
| **Accessibility first** | Works on 2GB RAM devices. Multi-language. Keyboard navigable. Screen reader compatible. |
| **Privacy by design** | Data never leaves the client unless the user explicitly connects P2P sync or an external connector. No third party can access, monetize, or revoke access to your data. |
| **Progressive disclosure** | A single prompt area by default. Complexity revealed as needed. |
| **Real-time transparency** | Users see the orchestration trace — which agents are working, what tools are invoked, what's pending. |
| **Graceful degradation** | Offline after first load. Missing providers handled. Tool failures don't crash workflows. |

## Where It's Ready, Where It Isn't

### Ready Now
- Multi-provider LLM integration with BYOK
- Agent studio with custom roles, tools, and knowledge
- Multi-agent orchestration with task decomposition
- Agent memory with human review
- P2P cross-device sync via WebRTC
- Local backup to the file system
- Marketplace for community extensions
- Connectors to Google Drive, Gmail, Calendar, Notion, Slack, Figma, Dropbox
- LLM observability with cost tracking

### Active Development
- Intelligent orchestration with requirement validation
- Dynamic team formation mimicking organizational structures
- Hyper meta-prompting for adaptive prompt generation
- WebGPU local inference integration
- Meeting bot for Google Meet

### Future
- Federated learning across devices
- Extended tool ecosystem (shell, API, advanced web grounding)
- Community-driven methodology library
- Plugin system for arbitrary browser capabilities

## The Bet

Every agentic framework today asks you to either pay up or set up. And every one of them puts a third party between you and your work — a party whose incentives, pricing, and policies you cannot control.

DEVS questions both assumptions.

The Web platform is the most widely deployed, most standardized, most capable runtime in existence — and it belongs to no one. Build on open standards, add opinionated engineering where the standards leave room, and you've solved distribution, privacy, and dependency in one move.

History shows that open, standards-based platforms eventually overtake proprietary ones — it just takes time and a forcing event. DEVS is positioned for that moment: giving every person with a browser the same capabilities that today require cloud infrastructure or a credit card.

That's the bet.

---

**Repository:** [github.com/codename-co/devs](https://github.com/codename-co/devs) | **Live:** [devs.new](https://devs.new) | **License:** MIT
