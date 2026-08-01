# 🧠 SmartNotes - Advanced Learning Platform

SmartNotes is a comprehensive SaaS platform that transforms traditional note-taking into an intelligent learning ecosystem. Built with modern technologies and AI-powered features, it provides students and learners with the tools they need to maximize their educational potential.

> **🎉 Major Update:** SmartNotes has been completely redesigned and enhanced with advanced AI features, collaborative learning tools, and a modern SaaS architecture.

---

## ✨ Key Features

### 🎯 **Core Learning Tools**
- **Enhanced Note Editor** - Rich text, Markdown, and Mind Map modes with collaborative editing
- **AI-Powered Assistant** - Personalized tutoring, explanations, and learning recommendations
- **Advanced Study Sessions** - Pomodoro timer with focus tracking and productivity analytics
- **Smart Flashcards** - Spaced repetition system with adaptive difficulty adjustment
- **Interactive Quizzes** - AI-generated questions with detailed explanations

### 🤝 **Collaborative Learning**
- **Study Groups** - Real-time collaboration with video sessions and shared materials
- **Peer Learning** - Community features with discussion forums and knowledge sharing
- **Live Sessions** - Virtual study rooms with screen sharing and interactive tools
- **Progress Tracking** - Group analytics and individual performance insights

### 🧠 **AI-Enhanced Features**
- **Intelligent Content Analysis** - Automatic summarization and key point extraction
- **Personalized Learning Paths** - Adaptive curriculum based on performance and goals
- **Smart Recommendations** - AI-suggested study materials and improvement areas
- **Voice Integration** - Speech-to-text note taking and audio explanations

### 📊 **Analytics & Insights**
- **Learning Analytics** - Comprehensive progress tracking and performance metrics
- **Study Patterns** - Behavioral analysis and optimization suggestions
- **Goal Setting** - SMART goals with milestone tracking and achievements
- **Retention Analysis** - Memory curve tracking and review scheduling

---

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Modern UI library with hooks and concurrent features
- **TypeScript** - Type-safe development with enhanced developer experience
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Radix UI** - Accessible, unstyled UI components
- **Framer Motion** - Smooth animations and micro-interactions
- **React Query** - Powerful data fetching and state management

### **Backend**
- **Node.js** - JavaScript runtime for server-side development
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Full-stack type safety
- **Drizzle ORM** - Type-safe database operations
- **MySQL** - Reliable relational database
- **Passport.js** - Authentication middleware

### **AI & ML**
- **LLM Provider abstraction** - Interchangeable providers via `LLM_PROVIDER` env var
- **Cloud (OpenAI-compatible)** - OpenAI, OpenRouter, Grok (xAI), DeepSeek, or any OpenAI-compatible endpoint
- **QVAC (local/edge)** - Local inference via llama.cpp (`@qvac/sdk`, P2P model download)
- **Speech Recognition API** - Voice-to-text functionality
- **Text-to-Speech API** - Audio content generation

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 22.17 (required by `@qvac/sdk`; the rest of the stack runs on 18+, but the local LLM provider needs 22.17+)
- MySQL 8.0+
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/FrancKINANI/smart_notes.git
   cd smart_notes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the template (never commit the real `.env`):
   ```bash
   cp .env.example .env
   ```
   Key variables: `LLM_PROVIDER`, `OPENROUTER_API_KEY` (or `OPENAI_API_KEY` / `XAI_API_KEY` / `DEEPSEEK_API_KEY`), and optionally `QVAC_MODEL_SRC` for local inference. See the [Local/Edge LLM](#-localedge-llm-qvac) section below.

4. **Database Setup**
   ```bash
   npm run db:push
   npm run migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   Open [http://localhost:5000](http://localhost:5000) in your browser

---

## 📱 New Features Overview

### **🎨 Enhanced Dashboard**
- Modern design with dark/light theme support
- Quick actions and smart suggestions
- Interactive progress visualization
- Real-time analytics and insights

### **🧠 AI Learning Assistant**
- Conversational interface with natural language processing
- Multiple interaction modes (Chat, Tutor, Quiz, Explain)
- Voice input/output capabilities
- Personalized learning recommendations

### **📝 Advanced Note Editor**
- Multi-modal editing (Rich Text, Markdown, Mind Maps)
- Real-time collaborative editing
- Voice-to-text note creation
- Template system for different note types

### **⏰ Smart Study Sessions**
- Customizable Pomodoro timer
- Focus tracking and distraction monitoring
- Session analytics and productivity insights
- Ambient sounds and environment controls

### **🎯 Enhanced Flashcards**
- Spaced repetition algorithm
- Adaptive difficulty adjustment
- 3D flip animations
- Comprehensive learning analytics

### **👥 Study Groups**
- Real-time video/audio sessions
- Screen sharing capabilities
- Group chat and file sharing
- Member management and moderation

---

## 📊 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run benchmark:llm` - Run the LLM provider comparative benchmark
- `npm run db:push` - Push database schema changes
- `npm run migrate` - Run database migrations

---

## 🧠 LLM Providers (cloud & local)

All LLM calls go through a single server-side abstraction: `server/services/llm-provider.ts`.
The active provider is selected **at runtime, without restarting the server**:

1. **Admin interface (recommended)** — an instance operator chooses the provider on the
   `/admin` page (or via `GET/PUT /api/admin/llm-settings`). The choice is persisted in the
   `llm_settings` table and applied **hot** (the running server picks it up on the next LLM call).
2. **Env fallback (retro-compatible)** — if no config exists in the database, the server falls
   back to the `LLM_PROVIDER` environment variable.

Cloud API keys are **never stored in the database** — they are read only from environment
variables (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY`, `LLM_API_KEY`).
No client-side LLM calls — the REST API contract of `/api/chat` is unchanged:

| `provider` (DB/admin or `LLM_PROVIDER`) | Backend | Key required | Notes |
| --- | --- | --- | --- |
| `openrouter` *(default)* | OpenRouter (OpenAI-compatible) | `OPENROUTER_API_KEY` | Hundreds of models via one key |
| `openai` | OpenAI | `OPENAI_API_KEY` | |
| `grok` | xAI (Grok) | `XAI_API_KEY` | |
| `deepseek` | DeepSeek | `DEEPSEEK_API_KEY` | |
| `openai-compatible` | Any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM…) | `LLM_API_KEY` (optional) | Configure `baseUrl` + `modelName` (admin) or `LLM_BASE_URL` + `LLM_MODEL` |
| `qvac` | QVAC (local llama.cpp) | none | Local inference, P2P model download |

> **Mistral (legacy)**: the dedicated Mistral preset was removed, but Mistral is
> OpenAI-compatible and remains reachable via `openai-compatible`:
> `provider=openai-compatible` with `baseUrl=https://api.mistral.ai/v1`, `modelName=mistral-medium`.

Example:
```bash
# Cloud (default)
LLM_PROVIDER=openrouter OPENROUTER_API_KEY=sk-... npm run dev

# Local edge inference (fallback env, if no admin config in DB)
LLM_PROVIDER=qvac npm run dev
```

---

## 💻 Local/Edge LLM (QVAC)

[QVAC](https://github.com/tetherto/qvac) runs the model **on the machine that hosts the server**
(auto-hosting) via llama.cpp (`@qvac/sdk`, `qvac-fabric`), with no API key and no per-token cost.
This is the target setup for an **edge/local deployment**, and can be switched to/from a cloud
provider by changing `LLM_PROVIDER`.

### Prerequisites
- **Node.js ≥ 22.17** (required by `@qvac/sdk`)
- **~5-10 GB free disk** for the model cache (LLM weights are downloaded on first start)
- **Network access on first start** for the P2P model download (`~/.qvac/models`, never committed)
- RAM: ≥ 2 GB free (≥ 4 GB recommended); on Linux, GPU acceleration needs Vulkan ≥ 1.4
  (CPU fallback works automatically)

> **Note on `b4a`**: the `b4a` package is a **direct dependency** in `package.json` as a
> workaround for a missing transitive dependency of QVAC's P2P stack (`hyperdht` → `bogon`).
> Do not remove it during dependency cleanup — QVAC's Bare worker fails to start without it.
> The rationale is also documented as a code comment at the top of
> `server/services/llm-provider.ts`.

### Configuration (admin, no restart)

Edge mode activates live from the **`/admin`** page (reserved for `admin` accounts):

1. Choose **Cloud** or **Edge (local QVAC)** — config is persisted in database (`llm_settings`).
2. Click **"Test connection"**: a test prompt is sent and latency + response excerpt
   are displayed, to validate **before** switching.
3. **"Save and apply"**: the switch is immediate (no server restart).

> ⚠️ **First call in Edge mode**: the first call can take several tens of
> seconds (model loading into RAM) or fail/be slow if the initial P2P download
> is in progress — the interface displays an explanatory message after 10 s, don't leave a
> silent spinner.

```env
# Fallback env (used only if no config is saved in database)
LLM_PROVIDER=qvac
# Optional: registry constant, or URL / local path to a .gguf
QVAC_MODEL_SRC=LLAMA_3_2_1B_INST_Q4_0
```

### Sizing (RAM / CPU)

> ⚠️ **Edge mode requires the server to have continuous RAM/CPU**: the model remains
> loaded in memory between calls. Measured order of magnitude: **~130 MB RSS for the
> 1B Q4 model** (`LLAMA_3_2_1B_INST_Q4_0`) — this is a **minimum**, larger models
> (3B, 7B) will proportionally require more (several GB). On a shared machine,
> plan for isolation (container/dedicated) so that inference does not degrade the other
> services. In CPU-only mode, generation is slow: reserve Edge mode for cases where
> latency is not critical (batch, offline).

Known limitations:
- **First-call latency**: the first `chat()` after a switch to Edge loads the model into RAM
  (and downloads it on the very first run) — expect minutes, not seconds, on that first call.
- **No strict offline guarantee on first start**: the initial model download needs network.
  Once cached, inference works fully offline.
- Smaller local models (1B-3B Q4) produce shorter/lower-quality answers than frontier cloud
  models — run the benchmark before deciding to switch.
- **Hot-switch is per-instance, not per-user**: the Cloud/Edge choice is an **administration**
  action for the whole self-hosted instance; individual end users don't pick a provider.

### Benchmark (decide before switching)
```bash
npm run benchmark:llm                # openrouter + qvac
npm run benchmark:llm -- --providers=qvac
npm run benchmark:llm -- --cases=5
```
The script sends realistic product prompts (student chat, quiz generation, note summaries) to each
provider, measures latency / output length / estimated cost, and writes the **full raw outputs** to
`scripts/benchmark-results/benchmark-*.json` for manual quality review. It does **not** pick a winner
— the decision to switch remains yours.

---

## 🎯 What's New in This Version

✅ **Complete UI/UX Redesign** - Modern, professional interface
✅ **AI-Powered Learning** - Intelligent tutoring and content generation
✅ **Collaborative Features** - Real-time study groups and peer learning
✅ **Advanced Study Tools** - Enhanced sessions, flashcards, and quizzes
✅ **Mobile Experience** - Fully responsive design
✅ **Performance Optimizations** - Faster loading and smoother interactions
✅ **Accessibility Improvements** - WCAG 2.1 AA compliance
✅ **Developer Experience** - Better tooling and documentation

---

## 📄 Documentation

- **[Detailed Documentation](README_ENHANCED.md)** - Comprehensive platform guide
- **[Improvements Summary](IMPROVEMENTS_SUMMARY.md)** - Complete list of enhancements
- **[API Documentation](docs/api.md)** - Backend API reference
- **[Component Library](docs/components.md)** - UI component documentation

---

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines before submitting pull requests.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📞 Support

For support and questions:
- 📧 Email: support@smartnotes.app
- 💬 Discord: [Join our community](https://discord.gg/smartnotes)
- 📖 Documentation: [docs.smartnotes.app](https://docs.smartnotes.app)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to SmartNotes.

- [Report a bug](https://github.com/FrancKINANI/smart_notes/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/FrancKINANI/smart_notes/issues/new?template=feature_request.md)
- [Submit a pull request](https://github.com/FrancKINANI/smart_notes/pulls)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and changes
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [Security Checklist](SECURITY_CHECKLIST.md) - Security best practices

## 🙏 Acknowledgments

- **OpenAI** - For providing powerful AI capabilities
- **Radix UI** - For accessible component primitives
- **Tailwind CSS** - For the utility-first CSS framework
- **React Community** - For the amazing ecosystem and tools

---

**Made with ❤️ for learners everywhere**

*Transform your learning experience with SmartNotes - where intelligence meets education.*
