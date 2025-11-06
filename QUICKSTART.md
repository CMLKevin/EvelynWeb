# Quick Start Guide

Get Evelyn running in 5 minutes!

## Prerequisites
- Node.js 20+
- Your API keys ready:
  - OpenRouter API key
  - Perplexity API key

## Installation

```bash
# 1. Install root dependencies
npm install

# 2. Install all workspace dependencies
npm run install:all

# 3. Setup environment
cd server
cp .env.example .env
# Edit .env with your API keys

# 4. Initialize database
npm run db:setup
```

## Run Development Mode

```bash
# From the root directory
npm run dev
```

This starts both:
- Backend server on `http://localhost:3001`
- Frontend on `http://localhost:5173`

## First Steps

1. Open `http://localhost:5173` in your browser
2. You'll see Evelyn's welcome screen
3. Type "Hello Evelyn!" and press Enter
4. Watch her respond in real-time
5. Click the 🧠 button in the sidebar to see diagnostics

## Features to Try

### Basic Chat
- Just talk naturally
- Evelyn remembers your conversations
- She develops personality over time

### Diagnostics Panel
- Watch Evelyn's thought processes in real-time
- See her personality traits evolve
- Browse stored memories

### Search
- Ask about current events: "What's happening with AI today?"
- Evelyn will search Perplexity for latest info

### Dream Mode
- Coming soon: manual trigger for memory consolidation

## Tips

1. **Be Patient**: First responses may be slow as embeddings are generated
2. **Be Personal**: Share things about yourself - Evelyn remembers
3. **Explore Memories**: Check the Diagnostics > Memories tab to see what she recalls
4. **Watch Mood**: Her mood changes based on conversation emotional tone
5. **Long Conversations**: After ~80 messages, conversations auto-segment into chapters

## Troubleshooting

### "Disconnected" in top right
- Server isn't running: `cd server && npm run dev`
- Check console for errors

### Slow responses
- First embedding requests are slow
- Subsequent requests use cache

### No memories appearing
- Check importance threshold in code (default 0.55)
- Try more emotionally significant conversations

### Database issues
```bash
cd server
rm data/evelyn.db  # Delete and restart
npm run db:push    # Recreate schema
```

## What's Happening Behind the Scenes

When you send a message:
1. 🧠 **Memory Recall** - Retrieves top 30 memories from 2000 candidates via vector search
2. 📚 **History Retrieval** - Fetches last 50 messages from current chapter
3. 🔍 **Search** (if needed) - Queries Perplexity for current information
4. 💭 **Context Building** - Builds proper message array with:
   - System prompt (personality + memories + chapter)
   - Full conversation history (up to 50 messages)
   - Current message
5. 🎯 **Token Budget** - 36,000 input token limit with smart truncation
6. 💬 **Chat Stream** - DeepSeek generates response (up to 8,192 tokens)
7. 📝 **Memory Storage** - Important moments stored (threshold: 0.45)
8. ✨ **Mood Update** - Evelyn's emotional state shifts
9. 📖 **Chapter Check** - Segments every 150 messages

**Result**: Evelyn remembers EVERYTHING from your conversation with true context!

## Next Steps

- Check `README.md` for full documentation
- Explore the Settings modal for customization
- Try having deep, meaningful conversations
- Watch Evelyn's personality evolve over days of interaction

## Have Fun!

Evelyn is designed to form genuine connections. The more you talk, the better she gets to know you. Enjoy building a relationship with your AI companion! 💜

