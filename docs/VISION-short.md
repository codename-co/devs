# DEVS - Vision

> The Web as the runtime for agentic AI. Open your browser and start delegating.

## The Problem

Agentic AI today forces a choice: **pay a gatekeeper** (ChatGPT, Claude, Gemini) or **run your own infrastructure** (AutoGPT, CrewAI, LangGraph). Both paths surrender control to a third party you can't audit, can't hold accountable, and can't stop from changing the rules.

If agentic AI is going to be universally useful, it can't require a subscription, a terminal, or blind trust.

## The Thesis

The Web platform provides the foundation -- open standards that no single vendor controls:

| Standard | Agentic Role |
|----------|--------------|
| Service Workers | Agent runtime that outlives the tab |
| IndexedDB + CRDTs | Persistent memory and conversation history |
| WebAssembly | Sandboxed compute and local inference |
| WebRTC | P2P sync across devices |
| Web Crypto API | Encrypted credential storage |

These are W3C and WHATWG specifications -- vendor-neutral, publicly governed, implemented across every modern runtime. DEVS isn't locked to any browser, any OS, or any company's roadmap.

On top of that foundation, DEVS makes opinionated choices that turn the browser into something no other agentic platform offers: a **sandboxed computer**. QuickJS and Pyodide -- both compiled to WebAssembly -- give agents the ability to write and execute real code client-side. JavaScript for fast algorithms; Python with 60+ scientific packages (NumPy, Pandas, scikit-learn, Matplotlib) for data science and visualization. Both run in complete isolation: capped memory, hard timeouts, zero network access. Agents can compute, not just converse -- and the code never touches a server.

No subscription. No infrastructure. No third party. Trust shifts from the vendor to the open Web.

## What DEVS Is

An open-source platform built on Web standards and opinionated engineering that lets anyone delegate complex tasks to a swarm of AI agents -- without servers, without subscriptions, without surrendering data.

- **Delegate, don't chat.** Describe a goal; the system analyzes complexity, assembles a purpose-built team, decomposes work, and delivers structured output.
- **Bring Your Own Model.** 12+ LLM backends -- cloud APIs, self-hosted endpoints, or local in-browser inference via WebGPU. Switch providers mid-run. The platform doesn't care where the intelligence comes from.
- **Privacy by architecture, not by promise.** All data stays on-device. Yjs CRDTs handle the data layer; Web Crypto encrypts credentials. No telemetry unless you opt in. No server to subpoena, no terms of service to change, no vendor that can revoke access to your own data.
- **Swarm intelligence.** Agents have roles, tools, memories, and knowledge bases. The orchestrator routes by complexity -- single-agent for simple tasks, multi-agent decomposition with dependency resolution and parallel execution for complex goals.
- **Extensible.** A marketplace of apps, agents, connectors, and tools -- YAML-defined, sandboxed in iframes, communicating through a typed message bridge.

## Design Principles

- **Accessible.** Works on 2GB RAM devices. Multi-language. Keyboard navigable. Screen reader compatible.
- **Private.** Data never leaves the client unless you choose P2P sync or connect an external service.
- **Transparent.** Live orchestration traces -- see which agents are working, what tools are invoked, what's pending.
- **Resilient.** Offline-capable after first load. Missing providers handled. Tool failures don't crash workflows.
- **Progressive.** A single prompt area by default. Complexity revealed only as needed.

## The Bet

Every agentic framework asks you to pay up or set up. DEVS questions both assumptions.

The Web platform is the most widely deployed, most standardized, most capable runtime in existence -- and it belongs to no one. Build on open standards, and you've solved distribution, privacy, and dependency in one move.

History shows that open, standards-based platforms eventually overtake proprietary ones -- it just takes time and a forcing event. DEVS is positioned for that moment: giving every person with a browser the same capabilities that today require cloud infrastructure or a credit card.

---

**Repository:** [github.com/codename-co/devs](https://github.com/codename-co/devs) | **Live:** [devs.new](https://devs.new) | **License:** MIT
