---
marp: true
theme: default
paginate: true
backgroundColor: #030712
color: #f8fafc
style: | # css
  section {
    font-family: system-ui, -apple-system, sans-serif;
    background: #030712;
    background-image:
      radial-gradient(circle at 25% 25%, rgba(51, 102, 255, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.06) 0%, transparent 50%);
  }
  h1, h2, h3 {
    font-family: Optima, Candara, 'Noto Sans', source-sans-pro, sans-serif;
    color: #f8fafc;
    font-weight: 600;
  }
  h1 {
    font-size: 2.5em;
    font-weight: 700;
  }
  h2 {
    color: #3366FF;
  }
  strong {
    color: #6690FF;
  }
  a {
    color: #3366FF;
  }
  code {
    background: #1e293b;
    border-radius: 6px;
    padding: 2px 8px;
    color: #f8fafc;
  }
  pre {
    background: #1e293b;
    border-radius: 8px;
    padding: 1em;
    overflow-x: auto;
  }
  pre code {
    background: transparent;
    padding: 0;
    color: #f8fafc;
    font-size: 0.85em;
  }
  blockquote {
    border-left: 4px solid #3366FF;
    padding-left: 1em;
    color: #94a3b8;
    font-style: italic;
    background: rgba(51, 102, 255, 0.05);
    padding: 0.5em 1em;
    border-radius: 0 8px 8px 0;
  }
  ul li {
    margin: 0.5em 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    background: #1e293b;
    color: #3366FF;
    border: 1px solid #334155;
  }
  td {
    background: #0f172a;
    border: 1px solid #334155;
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2em;
  }
  .highlight {
    background: linear-gradient(90deg, #3366FF 0%, #6690FF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .stat {
    font-size: 3em;
    font-weight: 700;
    color: #3366FF;
  }
  .stat-label {
    font-size: 0.9em;
    color: #94a3b8;
  }
  section.lead {
    background-image:
      radial-gradient(circle at 30% 30%, rgba(51, 102, 255, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(99, 102, 241, 0.12) 0%, transparent 50%);
  }
  section.lead h1 {
    font-size: 3.5em;
    text-align: center;
  }
  section.lead p {
    text-align: center;
    font-size: 1.3em;
  }
  img[alt~="center"] {
    display: block;
    margin: 0 auto;
  }
  ::selection {
    background: rgba(51, 102, 255, 0.3);
  }
  small {
    font-size: 0.7em;
    color: #94a3b8;
    float: right;
    margin-top: .4em;
  }
---

<!-- _class: lead -->

# 𝐃𝐄𝐕𝐒

**Delegate complex tasks to a swarm of AI agents**

_The AI Orchestration Platform that delivers what you ask for._

<br>

🌐 **[DEVS.new](https://devs.new)**

---

# The Problem

## AI promises much, but delivers _"almost"_

> _"Write a 27-page book in Shakespeare's style about love between humans and robots."_

**What you get from current AI services:**

❌ A 12-page summary
❌ Modern language with occasional "thee" and "thou"
❌ No chapter structure
❌ Incomplete narrative arc

**The gap:** GenAI services **cannot ensure** that explicit and implicit requirements are met.

---

# Why This Matters

## Trust is the barrier to AI delegation

<div class="columns">
<div>

### Current State

- AI outputs need constant human review
- No validation of requirements
- Single-agent limitations
- Approximate results at best
- Users stuck in "prompt engineering hell"

</div>
<div>

### The Cost

- **Productivity loss**: Hours spent iterating
- **Missed opportunity**: Can't delegate at scale
- **Frustration**: AI feels unreliable
- **Adoption stall**: Enterprises hesitate

</div>
</div>

---

# The Trust Barrier

## Over half of people distrust AI systems

> _"54% of people are wary about trusting AI systems."_
> — KPMG & University of Melbourne, 2025

**Why?** Because delegation requires predictability.

<div class="columns">
<div>

### Simple Delegation

- Context fully known
- Few uncertainties
- Easy to verify

</div>
<div>

### Complex Delegation

- Unknown or inferred context
- Ambiguity in requirements
- Which process? Which methodology?

</div>
</div>

**𝐃𝐄𝐕𝐒 solves complex delegation.**

---

# Single Agent vs Agent Teams

## The paradigm shift

<div class="columns">
<div>

### Traditional: AI Assistant

- One model handles everything
- Limited context window
- No specialization
- **High cognitive load on you**

</div>
<div>

### 𝐃𝐄𝐕𝐒: Specialized Teams

- Each agent has specific expertise
- Clear roles & responsibilities
- Agents collaborate like humans
- **Distributed cognitive load**

</div>
</div>

**Analogy:** One person building a house vs. a construction crew with specialists.

---

# Introducing 𝐃𝐄𝐕𝐒

## The AI Orchestration Platform That Delivers

With three pillars that change everything:

| Pillar                        | What it solves                                    |
| ----------------------------- | ------------------------------------------------- |
| 🎨 **Agent Builder**          | Build & customize AI agents with ease             |
| 👥 **Dynamic Team Formation** | Multi-agent collaboration with real methodologies |
| 📚 **Knowledge Integration**  | Your context, your documents, your rules          |

---

# Key Differentiators <small>Why 𝐃𝐄𝐕𝐒 shines</small>

| Feature                     | Open WebUI     | Manus, Perplexity | 𝐃𝐄𝐕𝐒                  |
| --------------------------- | -------------- | ----------------- | --------------------- |
| **Requirement validation**  | ❌             | Some              | ✅ Built-in           |
| **Multi-agent orchestrat.** | ❌ 1 agent     | Basic             | ✅ Sophisticated      |
| **Methodology support**     | ❌             | ❌                | ✅ PDCA, DMAIC, 8D... |
| **Privacy**                 | ✅ Self-hosted | ❌ Cloud-only     | ✅ By design          |
| **Agent memory**            | ❌             | Limited           | ✅ With human review  |
| **Knowledge integration**   | Basic          | ✅ Connectors     | ✅ Connectors + sync  |
| **Extendable**              | ✅             | ❌                | ✅ Marketplace        |
| **Open source**             | ✅             | ❌                | ✅ MIT License        |

---

# Pillar 1: Agent Builder

## Build your perfect AI workforce

<div class="columns">
<div>

### Pre-built Agents

- Product Manager
- Developer
- QA Engineer
- Technical Writer
- Research Analyst
- _...and many more_

</div>
<div>

### Custom Agent Builder

- Define personality & role
- Set instructions & constraints
- Assign tools & capabilities
- Enable agent memory

</div>
</div>

**Key feature:** Agents _remember_ — they learn from conversations and improve over time.

---

# Pillar 2: Dynamic Team Formation

## AI teams that work like real organizations

```
User Request → Task Analyzer → Team Formation → Coordinated Execution → Validated Output
```

**How it works:**

1. **TaskAnalyzer** breaks down complexity and extracts requirements
2. **Team Builder** recruits the right agents with matching skills
3. **Orchestrator** coordinates parallel/sequential execution
4. **Validator** ensures all requirements are met
5. **Refinement cycles** fix anything that doesn't pass

---

# Real Methodologies, Real Results

## Not just chat — structured problem solving

| Methodology | Best For                                |
| ----------- | --------------------------------------- |
| **PDCA**    | Iterative improvement cycles            |
| **DMAIC**   | Data-driven process optimization        |
| **8D**      | Root cause analysis & corrective action |
| **A3**      | Structured problem-solving on one page  |
| **Agile**   | Adaptive, flexible workflows            |

**Teams form automatically** based on task complexity and required skills.

---

# Pillar 3: Knowledge Integration

## Your context makes all the difference

<div class="columns">
<div>

### Knowledge Base

- Upload documents & files
- Folder watching with auto-sync
- Content deduplication
- Full-text search

</div>
<div>

### Connectors

- 📁 Google Drive
- 📧 Gmail
- 📅 Google Calendar
- 📝 Notion
- _...more coming_

</div>
</div>

**Result:** Agents work with _your_ context, not generic knowledge.

---

# Architecture

## Browser-Native, Privacy-First

<div class="columns">
<div>

### No Server Required

- Runs 100% in browser
- IndexedDB for storage
- Service Workers for offline
- Web Crypto for security

</div>
<div>

### Your Keys, Your Choice

- OpenAI
- Anthropic
- Google Gemini
- Mistral
- Ollama (local)
- Custom endpoints

</div>
</div>

**Data never leaves your device.** Period.

---

# Marketplace Ecosystem

## Extensible by design — no coding required

<div class="columns">
<div>

### Extension Types

- 📱 **Apps** — Full workflows
- 🤖 **Agents** — Personas
- 🔗 **Connectors** — Services
- 🔧 **Tools** — Capabilities

</div>
<div>

### Zero Barrier to Create

- 🗣️ **Vibe-generate** extensions in natural language
- No coding skills needed
- AI builds it for you

</div>
</div>

**Vision:** Anyone — technical or not — can extend 𝐃𝐄𝐕𝐒 and share with the community.

---

# Market Opportunity

## The AI agent market is exploding

<div class="columns">
<div>

### Market Size

- **$5.5B** AI agents market (2024)
- **44% CAGR** through 2030
- **$47B** projected by 2030

_Source: Markets&Markets, G.V. Research_

</div>
<div>

### Why Now?

- Multi-agent research maturing
- Enterprise AI adoption accelerating

</div>
</div>

**𝐃𝐄𝐕𝐒 targets:** Power users, developers, SMBs, privacy-conscious enterprises.

---

# Business Model

## Sustainable open-source

| Tier            | Target        | Model                                    |
| --------------- | ------------- | ---------------------------------------- |
| **Free**        | Individuals   | Open source, self-hosted, unlimited      |
| **Pro**         | Power users   | Hosted at DEVS.new, premium features     |
| **Enterprise**  | Organizations | Priority support, SSO, custom deployment |
| **Marketplace** | Creators      | Revenue share on premium extensions      |

<br>

**Philosophy:** Core is forever free. Premium = convenience + support.

---

# The Team

## Arnaud Leymet

<div class="columns">
<div>

**Founder & CEO**

- 🎯 18+ years building platforms
- 👥 45+ engineers mentored
- 📱 30M+ app downloads
- 🔄 20M+ daily API requests

</div>
<div>

**Track Record**

- 🗣 Speaker:<br>GitHub Universe, Google Next
- 🏆 Best chatbot tech<br>(Microsoft, 2017)
- 🚀 3 successful exits (acquired)

</div>
</div>

**Current:** Principal Engineer @ France's #2 telco (23M customers)

---

# Traction & Status

## Launching now — join the wave

<div class="columns">
<div>

### ✅ Shipped

- Full AI orchestration engine
- Agent memory with HITL review
- Knowledge base + connectors
- P2P sync across devices
- Marketplace architecture

</div>
<div>

### 🚀 Coming

- Public launch campaign
- Community building
- Extension ecosystem
- Enterprise pilots

</div>
</div>

**Status:** Production-ready. Seeking early adopters and contributors.

---

# Open Source Commitment

## Built for the community, by the community

- 🔓 **MIT License** — Use freely, modify openly
- 👥 **Community-driven** — PRs welcome
- 📖 **Transparent** — All code visible
- 🌍 **Multi-language** — 6 languages supported
- ♿ **Accessible** — Keyboard nav, screen readers

**GitHub:** github.com/codename-co/devs

---

# The Vision

## Democratizing AI delegation

> _"A world where AI augmentation isn't a luxury for the few, but a fundamental tool available to all — where anyone can leverage the power of AI teams to amplify their capabilities."_

<br>

**The impossible becomes inevitable.**

---

<!-- _class: lead -->

# Start Delegating Today

Try it. Break it. Contribute.

🌐 **[devs.new](https://devs.new)**

📖 [github.com/codename-co/devs](https://github.com/codename-co/devs)

📦 `docker run -p 80:80 codename/devs`

<br>

_Open source. Privacy-first. Browser-native._
