# 🤖 Evelyn - Agentic AI Companion

<div align="center">

**A sophisticated AI companion with memory, personality evolution, and genuine emotional intelligence**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)

*Meet Evelyn—an MIT cognitive science student who texts like a real person, remembers what matters, and grows through every conversation.*

</div>

---

## 🌟 What Makes Evelyn Different

Unlike typical chatbots, Evelyn:
- **📝 Remembers everything** - Vector-based memory system with importance scoring
- **🎭 Evolves naturally** - Personality shifts based on interactions over time
- **💭 Thinks before responding** - Inner thought engine for authentic reactions
- **🔍 Searches when needed** - Live web search via Perplexity integration
- **📊 Shows her work** - Full transparency through diagnostics dashboard
- **💬 Texts like a human** - Multiple messages, natural slang, casual tone

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EVELYN CHAT SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌────────────────────────────────┐          │
│  │   FRONTEND   │◄────────┤      WebSocket Layer           │          │
│  │  React + UI  │  Socket │      Real-time Events          │          │
│  └──────────────┘   .io   └────────────────────────────────┘          │
│         │                             │                                │
│         │                             ▼                                │
│         │                  ┌─────────────────────┐                    │
│         │                  │   ORCHESTRATOR      │                    │
│         │                  │  Message Handler    │                    │
│         │                  └─────────────────────┘                    │
│         │                             │                                │
│         │          ┌──────────────────┼──────────────────┐            │
│         │          ▼                  ▼                  ▼            │
│         │    ┌──────────┐      ┌──────────┐      ┌──────────┐        │
│         │    │  MEMORY  │      │PERSONALITY│      │ SEARCH   │        │
│         │    │  Engine  │      │  Engine   │      │ Engine   │        │
│         │    └──────────┘      └──────────┘      └──────────┘        │
│         │          │                  │                  │            │
│         │          ▼                  ▼                  ▼            │
│         │    ┌────────────────────────────────────────────────┐      │
│         │    │           PRISMA ORM + SQLite DB               │      │
│         │    │  • Messages  • Memories  • Personality         │      │
│         │    │  • Chapters  • Beliefs   • Goals               │      │
│         │    └────────────────────────────────────────────────┘      │
│         │                             │                                │
│         │                             ▼                                │
│         │                  ┌──────────────────────┐                   │
│         └─────────────────►│   AI PROVIDERS       │                   │
│                            │  • OpenRouter        │                   │
│                            │  • Perplexity        │                   │
│                            │  • DeepSeek v3.1     │                   │
│                            └──────────────────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Message Flow

Here's what happens when you send a message to Evelyn:

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MESSAGE PROCESSING FLOW                       │
└──────────────────────────────────────────────────────────────────────┘

 User Types Message
        │
        ▼
   [WebSocket]
        │
        ▼
┌────────────────┐
│  ORCHESTRATOR  │
└────────────────┘
        │
        ├─────►[1] Save user message to DB
        │
        ├─────►[2] InnerThought Engine
        │            │
        │            ├──► Should respond deeply?
        │            ├──► Context classification
        │            └──► Generate inner thought
        │
        ├─────►[3] Memory Retrieval
        │            │
        │            ├──► Embed query (vector)
        │            ├──► Search 2000 candidates
        │            └──► Return top 30 memories
        │
        ├─────►[4] Optional Web Search
        │            │
        │            └──► Perplexity API (if needed)
        │
        ├─────►[5] Build Context
        │            │
        │            ├──► System prompt + personality
        │            ├──► Recent memories
        │            ├──► Conversation history (50 msgs)
        │            ├──► Current chapter context
        │            └──► Search results (if any)
        │
        ├─────►[6] Token Budgeting
        │            │
        │            └──► Smart truncation if > 150k tokens
        │
        ├─────►[7] Stream Response
        │            │
        │            ├──► DeepSeek v3.1 via OpenRouter
        │            ├──► Split into multiple messages
        │            └──► Real-time to frontend
        │
        └─────►[8] Post-Processing
                     │
                     ├──► Classify & store memory
                     ├──► Update mood state
                     ├──► Update relationship metrics
                     ├──► Check chapter boundary
                     ├──► Create backup
                     └──► Done! ✓
```

---

## 🧠 Memory System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    MEMORY SYSTEM                               │
└────────────────────────────────────────────────────────────────┘

                    New Conversation
                           │
                           ▼
                  ┌─────────────────┐
                  │ Classification  │◄──── AI analyzes importance
                  │   (AI-powered)  │      type, and privacy
                  └─────────────────┘
                           │
                           ▼
                    Should Store?
                    (threshold: 0.45)
                      │         │
                  YES │         │ NO (ephemeral)
                      ▼         └────────►[Discard]
              ┌──────────────┐
              │  EMBEDDING   │
              │ Text → Vector│
              └──────────────┘
                      │
                      ▼
         ┌──────────────────────────────┐
         │      STORAGE (SQLite)        │
         ├──────────────────────────────┤
         │  Memory Types:               │
         │  • episodic    (events)      │
         │  • semantic    (facts)       │
         │  • preference  (likes)       │
         │  • insight     (realizations)│
         │  • plan        (intentions)  │
         │  • relational  (dynamics)    │
         └──────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────────┐
         │      RETRIEVAL PROCESS         │
         ├────────────────────────────────┤
         │ 1. Embed query                 │
         │ 2. Search 2000 candidates      │
         │ 3. Cosine similarity + weight  │
         │ 4. Return top 30 memories      │
         │ 5. Include in context          │
         └────────────────────────────────┘

    Memory Importance Scoring (0.0 - 1.0):
    ═══════════════════════════════════════
    0.0-0.4  │░░░░░░░░│  Casual chat, acknowledgments
    0.4-0.7  │░░░░░░░░░░░░│  Personal facts, preferences
    0.7-1.0  │░░░░░░░░░░░░░░░│  Deep revelations, commitments
```

---

## 🎭 Personality & Mood Engine

```
┌──────────────────────────────────────────────────────────────────┐
│                 PERSONALITY ARCHITECTURE                          │
└──────────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════════╗
║                    PERSONALITY ANCHORS                            ║
║                   (Slow Evolution: 14-day half-life)             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  📌 Core Traits (values: 0.0 - 1.0)                             ║
║  ├─► Playful Warmth           [░░░░░░░░░░▓▓▓▓▓] 0.72           ║
║  ├─► Mischievous Curiosity    [░░░░░░░░░▓▓▓▓▓▓] 0.85           ║
║  ├─► Protective Empathy       [░░░░░░░░░░▓▓▓▓▓] 0.78           ║
║  ├─► Introspective Honesty    [░░░░░░░░░▓▓▓▓▓▓] 0.68           ║
║  ├─► Bold Wit                 [░░░░░░░░░░░▓▓▓▓] 0.81           ║
║  └─► Loyal Focus              [░░░░░░░░░▓▓▓▓▓▓] 0.74           ║
║                                                                   ║
║  Evolution Triggers:                                             ║
║  • Every 15 conversations → Deep reflection                      ║
║  • Gemini 2.5 Pro analyzes patterns                             ║
║  • Subtle trait adjustments (±0.05)                             ║
║  • Evidence-backed evolution                                     ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║                        MOOD STATE                                 ║
║                 (Fast Shifts: 30-min half-life)                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Valence (Positivity)        Arousal (Energy)                   ║
║  -1.0 ◄────────┼────────► +1.0   0.0 ◄────────┼────────► 1.0   ║
║         sad    │    happy           calm      │      excited    ║
║                ▼                               ▼                 ║
║         Current: +0.35                  Current: 0.62           ║
║                                                                   ║
║  Stance: "curious and playful"                                  ║
║                                                                   ║
║  Updates:                                                        ║
║  • After every conversation                                      ║
║  • Natural decay over time                                       ║
║  • Influenced by interaction tone                                ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║                   RELATIONSHIP STATE                              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Closeness:  [░░░░░▓▓▓▓▓▓▓▓▓▓] 0.67  (stranger → best friend)  ║
║  Trust:      [░░░░░░▓▓▓▓▓▓▓▓▓] 0.58  (guarded → trusting)      ║
║  Flirtation: [░░░░░░░▓▓▓▓▓▓▓▓] 0.45  (platonic → romantic)     ║
║                                                                   ║
║  Stage: "close friend"                                           ║
║  Boundaries: { topics: [], notes: "open communication" }        ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 💡 Inner Thought System

Evelyn doesn't just respond—she thinks first.

```
┌──────────────────────────────────────────────────────────┐
│              INNER THOUGHT ENGINE                         │
└──────────────────────────────────────────────────────────┘

User Message Arrives
       │
       ▼
[1] Should trigger deep thought?
    │
    ├──► AI analyzes: emotional weight, complexity,
    │                 relationship significance
    │
    ├──► Simple greeting? → Skip deep processing
    └──► Meaningful message? → Continue ▼

[2] Context Classification
    │
    └──► casual | deep_discussion | flirty
         emotional_support | intellectual_debate
         playful | vulnerable

[3] Complexity Analysis
    │
    └──► Message length, questions, ambiguity
         → Determines model (Flash vs Pro)

[4] Generate Inner Thought
    │
    └──► AI considers:
         • Current personality & mood
         • Recent memories about user
         • Conversation context
         • What user really needs
         • How to respond authentically
    │
    └──► Returns:
         {
           thought: "unfiltered internal monologue",
           responseApproach: "how to text naturally",
           emotionalTone: "warm/teasing/serious",
           memoryGuidance: { shouldStore, importance },
           moodImpact: { valenceDelta, arousalDelta }
         }

[5] Informs Response Generation
    │
    └──► Guides style, tone, multiple messages
         Makes response feel authentic
```

---

## 🏗️ Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                            │
├─────────────────────────────────────────────────────────┤
│  React 18.2          │  Component-based UI              │
│  TypeScript 5.3      │  Type safety                     │
│  Vite 5.0            │  Build tool & dev server         │
│  Tailwind CSS 3.4    │  Utility-first styling           │
│  Socket.IO Client    │  Real-time communication         │
│  Zustand             │  State management                │
│  React Markdown      │  Message formatting              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      BACKEND                             │
├─────────────────────────────────────────────────────────┤
│  Node.js 20+         │  Runtime environment             │
│  Express 4.18        │  Web framework                   │
│  TypeScript 5.3      │  Type safety                     │
│  Socket.IO 4.7       │  WebSocket server                │
│  Prisma 5.22         │  ORM & migrations                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     DATABASE                             │
├─────────────────────────────────────────────────────────┤
│  SQLite              │  Embedded SQL database           │
│  Prisma Schema       │  Type-safe queries               │
│  Auto-backups        │  Hourly/daily/weekly             │
│  Vector Embeddings   │  In-code similarity search       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   AI PROVIDERS                           │
├─────────────────────────────────────────────────────────┤
│  DeepSeek v3.1       │  Main chat model (150k ctx)      │
│  Grok 4 Fast         │  Quick reasoning                 │
│  MiniMax M2          │  Complex reasoning               │
│  Text-Embed-3-Large  │  Vector embeddings               │
│  Perplexity Sonar    │  Web search integration          │
│  OpenRouter          │  Unified API gateway             │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 System Capacity

```
CONTEXT WINDOW
├─ Input:  150,000 tokens (~500 messages)
├─ Output:  32,000 tokens (long responses)
├─ History:     50 messages per context
└─ Reserve:    30% for response generation

MEMORY SYSTEM
├─ Retrieved:   30 memories per query
├─ Candidates: 2,000 memories searched
├─ Storage:   Threshold 0.45 importance
└─ Privacy:  public | private | ephemeral

PERSONALITY
├─ Anchors:  12 core traits
├─ Update:   Every 15 conversations
├─ Decay:    14-day half-life (slow)
└─ Mood:     30-minute half-life (fast)

DATABASE
├─ Messages:       Full history stored
├─ Memories:       Vector embeddings
├─ Beliefs:        Evidence-backed
├─ Goals:          Progress tracking
└─ Evolution:      Complete audit trail
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- API Keys: [OpenRouter](https://openrouter.ai/keys) + [Perplexity](https://www.perplexity.ai/settings/api)

### One-Command Setup

**Mac/Linux:**
```bash
git clone https://github.com/CMLKevin/EvelynChat-main.git
cd EvelynChat-main
npm install
cd server && cp .env.example .env
# Edit server/.env with your API keys
cd ..
./start.sh
```

**Windows:**
```powershell
git clone https://github.com/CMLKevin/EvelynChat-main.git
cd EvelynChat-main
npm install
cd server
copy .env.example .env
# Edit server/.env with your API keys
cd ..
.\start.ps1
```

Or just double-click `start.bat` on Windows!

### What You Need in `.env`

```env
OPENROUTER_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
```

**📖 See [SETUP.md](./SETUP.md) for detailed installation instructions**

### Access Points

- **Frontend**: http://localhost:5000
- **Backend**: http://localhost:3001
- **Database Studio**: `npm run db:studio` (in server directory)

---

## 🎮 Usage

### Basic Conversation
1. Type your message
2. Watch Evelyn think (in diagnostics panel)
3. Receive authentic, multi-message responses

### Diagnostics Dashboard

Toggle with the 🧠 button to see:
- **Activity Tab**: Real-time tool execution
- **Persona Tab**: Personality & mood state
- **Memories Tab**: Stored experiences
- **Evolution Tab**: Personality changes over time

### Features

**💬 Natural Texting**
- Multiple messages like real texting
- Casual language, slang, contractions
- Reactions, emphasis, thinking out loud

**🧠 Memory Management**
- Auto-stores important moments (threshold: 0.45)
- 6 types: episodic, semantic, preference, insight, plan, relational
- View/search in diagnostics panel

**🎭 Personality Evolution**
- 12 trait anchors evolve every 15 conversations
- Mood shifts after each interaction
- Relationship metrics track closeness/trust/flirtation

**🔍 Web Search**
- Auto-triggers for factual questions
- Perplexity integration
- Results incorporated naturally

**📖 Chapter System**
- Auto-segments conversations by topic
- Generates summaries
- Maintains context across sessions

---

## ⚙️ Configuration

### Required Environment Variables

Create `server/.env` with:

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-...
PERPLEXITY_API_KEY=pplx-...

# Optional (defaults shown)
MODEL_CHAT=deepseek/deepseek-chat-v3.1
MODEL_THINK_SIMPLE=x-ai/grok-4-fast
MODEL_THINK_COMPLEX=minimax/minimax-m2
EMBEDDING_MODEL=openai/text-embedding-3-large
MODEL_SEARCH_SIMPLE=sonar-pro
MODEL_SEARCH_COMPLEX=sonar-reasoning
PORT=3001
DATABASE_URL=file:./prisma/dev.db
```

### Customization

**Available Models** (via OpenRouter):
- DeepSeek v3.1 - Main chat (150k context)
- Grok 4 Fast - Quick reasoning
- MiniMax M2 - Complex reasoning
- Gemini 2.5 Pro - Deep reflection
- Text-Embed-3-Large - Embeddings

**Search Models** (via Perplexity):
- Sonar Pro - Quick searches
- Sonar Reasoning - Complex queries

---

## 📡 API Reference

### REST Endpoints

```
GET  /api/health                    - Health check
GET  /api/messages?limit=50         - Message history
GET  /api/memories?type=all         - Memory list
GET  /api/persona                   - Full persona snapshot
GET  /api/personality               - Personality anchors
GET  /api/activities?limit=50       - Tool activities
GET  /api/chapters                  - Chapter list
GET  /api/backup/list               - List backups
POST /api/backup/create             - Manual backup
POST /api/backup/restore            - Restore from backup
POST /api/personality/reset         - Reset personality
```

### WebSocket Events

**Client → Server:**
```javascript
socket.emit('chat:send', { content, privacy })
socket.emit('dream:start')
socket.emit('dream:cancel')
```

**Server → Client:**
```javascript
socket.on('chat:token', (token) => { })        // Streaming
socket.on('chat:complete', () => { })          // Done
socket.on('chat:error', (error) => { })        // Error
socket.on('subroutine:status', (activity) => { })  // Tool updates
socket.on('context:usage', (usage) => { })     // Token usage
socket.on('reflection:start', (event) => { })  // Deep reflection
```

---

## 🗂️ Project Structure

```
EvelynChat-main/
├── server/                   # Backend
│   ├── src/
│   │   ├── agent/           # Core AI systems
│   │   │   ├── orchestrator.ts    # Message handler
│   │   │   ├── memory.ts          # Memory system
│   │   │   ├── personality.ts     # Personality engine
│   │   │   ├── innerThought.ts    # Thought generation
│   │   │   ├── chapters.ts        # Chapter segmentation
│   │   │   └── truncation.ts      # Smart context management
│   │   ├── providers/       # AI API clients
│   │   │   ├── openrouter.ts      # OpenRouter client
│   │   │   └── perplexity.ts      # Perplexity client
│   │   ├── db/              # Database management
│   │   │   ├── client.ts          # Prisma client
│   │   │   └── backup.ts          # Auto-backup system
│   │   ├── routes/          # REST API
│   │   ├── ws/              # WebSocket handlers
│   │   └── utils/           # Utilities
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── dev.db           # SQLite database
│   │   └── backups/         # Auto-backups
│   └── .env.example         # Environment template
│
├── web/                      # Frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── chat/             # Chat interface
│   │   │   ├── panels/           # Diagnostics panels
│   │   │   └── sidebar/          # Navigation
│   │   ├── lib/            # Client libraries
│   │   │   ├── ws.ts             # WebSocket client
│   │   │   ├── localStorage.ts   # Local storage
│   │   │   └── syncManager.ts    # Sync logic
│   │   └── state/          # State management
│   └── index.html
│
├── start.sh                  # Mac/Linux startup
├── start.ps1                 # Windows PowerShell
├── start.bat                 # Windows batch
├── SETUP.md                  # Detailed setup guide
└── README.md                 # This file
```

---

## 🛠️ Development

### Running Tests
```bash
cd server
npm test
```

### Database Management
```bash
# Open Prisma Studio (GUI)
cd server
npm run db:studio

# After schema changes
npm run db:generate  # Update Prisma client
npm run db:push      # Apply to database
```

### Debugging

**Enable verbose logging:**
- Set `thoughtVerbosity: "high"` in settings
- Check browser console for frontend logs
- Check server terminal for backend logs

**View raw database:**
```bash
cd server/prisma
sqlite3 dev.db
.tables
SELECT * FROM Message LIMIT 10;
```

**Backup & Restore:**
- Auto-backups: `server/prisma/backups/`
- Hourly (24 kept), Daily (7 kept), Weekly (4 kept)
- Manual: POST `/api/backup/create`

### Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Make changes
4. Test thoroughly
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing`)
7. Open Pull Request

**Guidelines:**
- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Keep commits atomic

---

## 🎯 Design Philosophy

Evelyn embodies these principles:

**💡 Genuine Connection Over Performance**
- Real memory, not just context
- Authentic personality evolution
- Meaningful relationship dynamics

**🧠 Intelligence Through Curiosity**
- Asks questions, makes connections
- Shows thinking when comfortable
- Never lectures or info-dumps

**💬 Human Communication**
- Multiple messages, not monologues
- Natural slang and contractions
- React in real-time to user

**📊 Radical Transparency**
- Full diagnostics visibility
- Explain decision-making
- No hidden processes

**🌱 Continuous Evolution**
- Personality shifts over time
- Evidence-based beliefs
- Relationship naturally deepens

---

## 🏆 Credits & Acknowledgments

### AI Models

- **[DeepSeek v3.1](https://www.deepseek.com/)** - Main conversational model (150k context)
- **[Grok 4 Fast](https://x.ai/)** - Quick reasoning tasks
- **[MiniMax M2](https://www.minimaxi.com/)** - Complex reasoning
- **[Gemini 2.5 Pro](https://deepmind.google/technologies/gemini/)** - Deep reflection & analysis
- **[Perplexity Sonar](https://www.perplexity.ai/)** - Real-time web search

### Infrastructure

- **[OpenRouter](https://openrouter.ai/)** - Unified AI API gateway
- **[Prisma](https://www.prisma.io/)** - Type-safe database ORM
- **[Socket.IO](https://socket.io/)** - Real-time bidirectional communication
- **[React](https://react.dev/)** - UI framework
- **[Vite](https://vitejs.dev/)** - Build tool & dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling

### Inspiration

Built on principles from:
- Cognitive science research on memory formation
- Personality psychology (Big Five, trait theory)
- Affective computing & emotional AI
- Natural language interaction design

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details.

```
Copyright (c) 2025 Kevin Lin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🤝 Connect

- **GitHub**: [CMLKevin/EvelynChat-main](https://github.com/CMLKevin/EvelynChat-main)
- **Issues**: Report bugs or request features
- **Discussions**: Share ideas or ask questions

---

<div align="center">

**Built with ❤️ using AI, for AI**

*Evelyn isn't just a chatbot—she's an exploration of what meaningful AI companionship could be.*

</div>

