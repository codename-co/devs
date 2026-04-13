<div align="center">

[<img src="./public/favicon.svg" width="48" alt="DEVS Logo" />](https://devs.new)

# <span title='DEVS, from Latin "Deus"'>DEVS</span>

**Delegate complex tasks to a swarm of AI agents**
<br />
through a universally accessible, privacy-first platform.

[ **<https://devs.new>** ]

[Features](#features) • [Self-Hosting](#self-hosting) • [Contributing](#contributing) • [Documentation](#documentation)

---

</div>

## Features

<span title='DEVS, from Latin "Deus"'>DEVS</span> is an open-source, browser-native platform that enables users to delegate complex tasks to a swarm of AI agents. Here are some of its standout features:

### Artificial Intelligence

- [x] 🤖 **LLM provider independence**: <abbr title="Bring Your Own Key">BYOK</abbr> support for OpenAI, Anthropic, Google Gemini, Mistral, OpenRouter, HuggingFace, Ollama, LM Studio, Vertex AI, and more.
- [x] 🧠 **Local AI models**: Run HuggingFace open models directly in your browser via WebGPU.
- [x] 💰 **Traces & Cost tracking**: LLM observability with real-time cost tracking and performance metrics.
- [x] 🖥️ **Sandboxed code execution**: Agents can write and execute JavaScript (QuickJS) and Python (Pyodide) in WASM-isolated sandboxes — no server needed.

### Swarm Intelligence

- [x] 🤖 **AI Studio**: Pre-built agents, custom agent builder with AI-generated portraits.
- [x] 📝 **Methodologies**: <abbr title="8 Disciplines">8D</abbr>, <abbr title="A3 Problem Solving">A3</abbr>, Agile, <abbr title="Analysis, Objectives, Strategies, Tactics, Control">AOSTC</abbr>, <abbr title="Define, Measure, Analyze, Improve, Control">DMAIC</abbr>, <abbr title="Plan-Do-Check-Act">PDCA</abbr>, Scrum, <abbr title="You Only Live Once">YOLO</abbr>, and your own.
- [x] 🧠 **Agent Memory**: Agents learn and remember information from conversations with human review.
- [x] 🔧 **Tools**: Equip agents with capabilities like Wikipedia search, arXiv search, calculator, code execution, and more.
- [x] 🎯 **Multi-agent orchestration**: Automated task coordination with decomposition, dependency resolution, and parallel execution.
- [x] 🔌 **Skills**: Installable capability bundles that extend what agents can do.
- [ ] 🎭 **Hyper meta-prompting**: Multi-layered prompt generation for dynamic task handling.
- [ ] 👥 **Dynamic team formation**: Mimicking human organizational structures.

### Integrations

- [x] 🔗 **Connectors**: Integrations with Google Drive, Gmail, Calendar, Notion, Slack, Figma, Dropbox, OneDrive, Outlook, and more.
- [x] 🏪 **Marketplace**: Extensible platform with apps, agents, connectors, and tools.
- [ ] 🎤 **Meeting Bot**: AI agents join Google Meet as real participants.

### Privacy

- [x] 🌐 **Browser-native**: The browser is the <abbr title="Operating System">OS</abbr>. Runs entirely in your browser, no server dependencies.
- [x] 🛡️ **Privacy-first**: All data stays on your device, no tracking, no cookies.
- [x] 🥷 **Offline capable**: Works without Internet connection after initial load.
- [x] 💾 **Local Backup**: Preserve your data with bidirectional sync to a local folder on your host, with human-readable Markdown files.

### User Experience

- [x] 📱 **Mobile-first design**: Optimized for touch and small screens.
- [x] 🌐 **Multi-language support**: English, French, German, Spanish, Arabic, Korean.
- [x] 🔍 **Global Search**: Unified search across agents, conversations, tasks, and files (<kbd>Cmd/Ctrl+K</kbd>).
- [x] 💄 **Customizable**: Tailor the platform to your specific needs.
- [x] 📂 **Spaces**: Multi-workspace isolation for different projects or contexts.

### Collaboration

- [x] 🌐 **Universal access**: Web-based platform accessible from anywhere: <https://devs.new>
- [x] 🔄 **P2P Sync**: Cross-device synchronization with CRDT-based conflict resolution.
- [x] 🤝 **Team collaboration**: Peer-to-peer networking and sharing.
- [x] 📱 **QR Code support**: Easily share and access your platform configuration.

### Deployment

- [x] ⚙️ **Open-source**: Community-driven development and transparency.
- [x] 🐳 **Docker-ready**: One-command self-hosting with an image of ~60MB ([registry](https://hub.docker.com/r/codename/devs)).

## Self-Hosting

<details open>
<summary>

### 🐳 Docker

</summary>

```shell
docker run -d -p 80:80 codename/devs
```

Then open <http://localhost> in your browser.

</details>

<details open>
<summary>

### 🐳 Docker compose

</summary>

Alternatively, check out the [compose.yaml](compose.yaml) file for a Docker Compose setup.

```docker
services:
  devs:
    image: codename/devs
    ports:
      - 8080:80
```

See <https://hub.docker.com/r/codename/devs> for more details.

</details>

## Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

- [Architecture](docs/ARCHITECTURE.md) — System architecture and data layer
- [Conventions](docs/CONVENTIONS.md) — Code style, naming, and patterns
- [Decisions](docs/DECISIONS.md) — Architectural decision records
- [Glossary](docs/GLOSSARY.md) — Term definitions
- [Vision](docs/VISION.md) — Project vision and design principles
- [TODO](docs/TODO.md) — Feature status and roadmap

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
