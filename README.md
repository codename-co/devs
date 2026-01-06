<div align="center">

[<img src="./public/favicon.svg" width="48" alt="DEVS Logo" />](https://devs.new)

# <span title='DEVS, from Latin "Deus"'>𝐃𝐄𝐕𝐒</span>

**Delegate complex tasks to a swarm of AI agents**
<br />
through a universally accessible, privacy-first platform.

[ **<https://devs.new>** ]

[Features](#features) • [Quick start](#self-hosting) • [Self-Hosting](#self-hosting)

---

</div>

## Features

<span title='DEVS, from Latin "Deus"'>𝐃𝐄𝐕𝐒</span> is an open-source, browser-native platform that enables users to delegate complex tasks to a swarm of AI agents. Here are some of its standout features:

### Artificial Intelligence

- [x] 🤖 **LLM provider independence**: <abbr title="Bring Your Own Key">BYOK</abbr> support for OpenAI, Anthropic, Google Gemini, Mistral, Ollama, and custom endpoints.
- [x] 🧠 **Local AI models**: Run HuggingFace open models directly in your browser.
- [ ] 💰 **Cost tracking**: Monitor usage and estimate costs across providers.

### Swarm Intelligence

- [x] 🤖 **AI Studio**: Pre-built agents, custom agent builder.
- [x] 📝 **Methodologies**: <abbr title="8 Disciplines">8D</abbr>, <abbr title="A3 Problem Solving">A3</abbr>, Agile, <abbr title="Analysis, Objectives, Strategies, Tactics, Control">AOSTC</abbr>, <abbr title="Define, Measure, Analyze, Improve, Control">DMAIC</abbr>, <abbr title="Plan-Do-Check-Act">PDCA</abbr>, Scrum, <abbr title="You Only Live Once">YOLO</abbr>, and your own.
- [ ] 🎭 **Hyper meta-prompting**: Multi-layered prompt generation for dynamic task handling.
- [ ] 👥 **Dynamic team formation**: Mimicking human organizational structures.
- [ ] 🎯 **Intelligent orchestration**: Automated task management with human oversight.

### Privacy

- [x] 🌐 **Browser-native**: The browser is the <abbr title="Operating System">OS</abbr>. Runs entirely in your browser, no server dependencies.
- [x] 🛡️ **Privacy-first**: All data stays on your device, no tracking, no cookies.
- [x] 🥷 **Offline capable**: Works without internet after initial load.

### User Experience

- [x] 📱 **Mobile-first design**: Optimized for touch and small screens.
- [x] 🌐 **Multi-language support**: Accessibility for global users.
- [x] 💄 **Customizable**: Tailor the platform to your specific needs.

### Diffusion

- [x] 🌐 **Universal access**: Web-based platform accessible from anywhere: <https://devs.new>
- [x] ⚙️ **Open-source**: Community-driven development and transparency.
- [x] 🐳 **Docker-ready**: One-command self-hosting with an image of ~10MB ([registry](https://hub.docker.com/r/codename/devs)).
- [x] 📱 **QR Code support**: Easily share and access your platform configuration.
- [x] 🤝 **Team collaboration**: Peer-to-peer networking and sharing.

## Self-Hosting

```shell
docker run -d -p 80:80 codename/devs
```

Then open <http://localhost> in your browser.

Alternatively, check out the [compose.yaml](compose.yaml) file for a Docker Compose setup.

```docker
services:
  devs:
    image: codename/devs
    ports:
      - 8080:80
```

See <https://hub.docker.com/r/codename/devs> for more details.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
