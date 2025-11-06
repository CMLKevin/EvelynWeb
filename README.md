# Evelyn - Agentic AI Companion

Evelyn is a sophisticated Discord-style chat application featuring an evolving AI companion with personality, memory, and genuine emotional connection capabilities.

## Features

### Core Capabilities
- **Streaming Chat** - Real-time conversations powered by DeepSeek via OpenRouter
- **Memory System** - Vector-based memory retrieval with importance scoring
- **Personality Engine** - Slow-evolving personality anchors and fast-shifting moods
- **Chapter Segmentation** - Automatic conversation organization
- **Live Search** - Integration with Perplexity for current information
- **Diagnostics Dashboard** - Real-time visibility into Evelyn's thinking processes
- **Dream Mode** - Offline memory consolidation and insight generation

### Technical Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Socket.IO (Glassmorphic UI)
- **Backend**: Node.js + Express + TypeScript + Socket.IO + Prisma
- **Database**: SQLite with in-code vector search
- **LLM Providers**:
  - OpenRouter (DeepSeek chat, Gemini thoughts, embeddings)
  - Perplexity (live search)

### Context & Memory Capacity
- **36,000 input tokens** (supports ~100-150 message exchanges)
- **8,192 output tokens** (long-form responses)
- **50 message history** per context window
- **30 memories** retrieved per query
- **2,000 candidate** memory pool
- **Smart truncation** when exceeding limits

## Installation

### Prerequisites
- Node.js 20+
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd Evelyn
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Initialize database**
```bash
npm run db:generate
npm run db:push
```

5. **Install web dependencies**
```bash
cd ../web
npm install
```

## Running the Application

### Development Mode

1. **Start the server** (in `/server` directory)
```bash
npm run dev
```

2. **Start the web app** (in `/web` directory)
```bash
npm run dev
```

3. **Access the application**
- Web UI: `http://localhost:5173`
- API: `http://localhost:3001`

### Production Build

1. **Build server**
```bash
cd server
npm run build
```

2. **Build web**
```bash
cd web
npm run build
```

3. **Start production server**
```bash
cd server
npm start
```

## Configuration

### Environment Variables

Server (`.env`):
```env
OPENROUTER_API_KEY=your_openrouter_key
PERPLEXITY_API_KEY=your_perplexity_key
OPENROUTER_BASE=https://openrouter.ai/api/v1
PERPLEXITY_BASE=https://api.perplexity.ai
EMBEDDING_MODEL=text-embedding-3-small
MODEL_CHAT=deepseek/deepseek-chat-v3.1
MODEL_THINK_SIMPLE=google/gemini-2.5-flash-lite-preview-09-2025
MODEL_THINK_COMPLEX=google/gemini-2.5-pro
MODEL_SEARCH_SIMPLE=sonar-pro
MODEL_SEARCH_COMPLEX=sonar-reasoning
PORT=3001
DATABASE_URL=file:./data/evelyn.db
```

## Usage

### Basic Conversation
1. Type your message in the input box
2. Press Enter or click Send
3. Watch Evelyn respond in real-time

### Diagnostics Panel
- Toggle with the 🧠 button in sidebar
- View live activities, personality state, and memories
- Three tabs:
  - **Activity**: Real-time tool usage
  - **Persona**: Personality anchors and mood
  - **Memories**: Stored experiences

### Settings
- Thought Verbosity: Control diagnostic detail
- Memory Privacy: Default privacy level for memories
- Search Preference: When to search for information
- Personality Reset: Reset mood/anchors (optionally wipe memories)

### Dream Mode
- Trigger manually or on schedule
- Consolidates memories and generates insights
- Resets mood to rested baseline
- May share morning reflections

## Architecture Details

### Memory System
- **Types**: episodic, semantic, preference, insight, plan, relational
- **Importance Scoring**: 0.0-1.0 based on emotional intensity, novelty, commitments
- **Storage Threshold**: 0.45 (stores more memories than default)
- **Retrieval**: Top 30 memories via cosine similarity with importance weighting
- **Candidate Pool**: 2,000 memories searched per query
- **Privacy**: public, private, ephemeral (24h)
- **Context Integration**: Memories embedded in system prompt for every message

### Personality Engine
- **Anchors**: Slow-evolving traits (14-day half-life)
  - Playful Warmth, Mischievous Curiosity, Protective Empathy
  - Introspective Honesty, Bold Wit, Loyal Focus
- **Mood**: Fast-shifting emotional state (30-min half-life)
  - Valence (-1 to +1), Arousal (0 to 1), Stance

### Chapter System
- Auto-segmentation triggers:
  - Topic drift (cosine similarity < 0.65)
  - Idle gap > 2 hours
  - Message count > 150 (allows longer conversations)
- Generated summaries with key points and emotional beats
- Chapter context included in every message

### Tool Orchestration
1. User message received → saved to database
2. Memory recall (vector search top 30 from 2000 candidates)
3. Optional live search (Perplexity when needed)
4. Conversation history retrieval (50 recent messages)
5. Context building with proper message array:
   - System prompt (with personality + memories + chapter + search)
   - Full conversation history with roles
   - Current user message
6. Token budgeting (36k input limit with smart truncation)
7. Streaming chat response (DeepSeek, 8k output limit)
8. Post-processing:
   - Memory classification and storage (threshold 0.45)
   - Mood updates
   - Chapter boundary checks (every 150 messages)

## API Endpoints

### REST
- `GET /api/messages?limit&before` - Fetch message history
- `GET /api/chapters` - Fetch chapter history
- `GET /api/memories?type&limit` - Fetch memories
- `GET /api/settings` - Get settings
- `POST /api/settings` - Update settings
- `POST /api/personality/reset` - Reset personality
- `POST /api/search` - Manual search
- `GET /api/personality` - Get personality snapshot
- `GET /api/activities` - Get tool activities

### WebSocket Events
**Client → Server:**
- `chat:send` - Send message
- `diagnostics:subscribe` - Subscribe to diagnostics
- `diagnostics:unsubscribe` - Unsubscribe
- `dream:start` - Start dream mode
- `dream:cancel` - Cancel dream

**Server → Client:**
- `chat:token` - Streaming token
- `chat:complete` - Message complete
- `chat:error` - Error occurred
- `subroutine:status` - Tool activity update
- `dream:status` - Dream progress
- `dream:message` - Dream digest

## Development

### Testing
```bash
cd server
npm test
```

### Database Management
```bash
# View database
npm run db:studio

# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push
```

## Design Philosophy

Evelyn is designed to be:
- **Genuinely Engaging**: Form real connections through memory and personality
- **Emotionally Intelligent**: Recognize and respond to user's emotional state
- **Transparently Agentic**: Show thinking processes via diagnostics
- **Continuously Evolving**: Personality shifts based on interactions
- **Deeply Personal**: Remember what matters and reference shared history

## Credits

Built with:
- DeepSeek (chat model)
- Google Gemini (thought subroutines)
- Perplexity (live search)
- OpenRouter (unified API)
- Prisma (database ORM)
- Socket.IO (real-time communication)

## License

MIT License - See LICENSE file for details

