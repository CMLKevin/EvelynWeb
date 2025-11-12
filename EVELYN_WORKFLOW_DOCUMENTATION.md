# Evelyn's Complete Workflow: User Input → Response

**Complete documentation of how Evelyn processes messages, thinks, and responds**

---

## Table of Contents
1. [Overview](#overview)
2. [High-Level Flow](#high-level-flow)
3. [ASCII Workflow Diagram](#ascii-workflow-diagram)
4. [Phase Details](#phase-details)
5. [Inner Thought Engine](#inner-thought-engine)
6. [Post-Processing](#post-processing)

---

## Overview

Evelyn's response pipeline simulates authentic human cognition through multiple stages: memory retrieval, context analysis, inner thought processing, and personality-driven response generation.

**Core Philosophy:** Evelyn thinks before she speaks. Every response is preceded by genuine cognitive processing that considers her personality, mood, memories, and conversation context.

**Total Duration:** 2-5 seconds (longer if web search is triggered)

---

## High-Level Flow

```
User Input → Save Message → Search Decision → Memory Retrieval → 
Personality Snapshot → Inner Thought → Build Context → Generate Response → 
Save Response → Post-Processing (background)
```

---

## ASCII Workflow Diagram

```
User Input
    │
    ▼
┌─────────────────────────────────────┐
│ PHASE 1: MESSAGE INGESTION          │
│ • Save to DB (role: user)           │
│ • Estimate tokens                   │
│ • Log: "💬 Message received"        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ PHASE 2: SEARCH DECISION            │
│ • AI determines if search needed    │
│ • Confidence >= 0.6 → Search        │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    [SEARCH]     [NO SEARCH]
        │             │
        │   ┌─────────────────────────┐
        │   │ • Refine query with AI  │
        │   │ • Execute Perplexity    │
        │   │ • Synthesize results    │
        │   │ • Save & emit to UI     │
        │   └─────────────────────────┘
        │             │
        └──────┬──────┘
               │
               ▼
┌─────────────────────────────────────┐
│ PHASE 3: MEMORY RETRIEVAL           │
│ • Retrieve top 50 relevant memories │
│ • Vector similarity search          │
│ • Log: "🧠 Context ready"           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ PHASE 4: PERSONALITY SNAPSHOT       │
│ • Get top 8 personality anchors     │
│ • Get mood (valence, arousal)       │
│ • Get emotional threads             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ PHASE 5: INNER THOUGHT              │
│                                     │
│ 5A: Context Classification          │
│   • casual / deep_discussion        │
│   • flirty / emotional_support      │
│   • intellectual_debate / playful   │
│   • vulnerable                      │
│                                     │
│ 5B: Generate Inner Thought          │
│   Returns:                          │
│   • thought (internal monologue)    │
│   • responseApproach                │
│   • emotionalTone                   │
│   • responseLength                  │
│   • memoryGuidance                  │
│   • moodImpact                      │
│                                     │
│ • Log: "💭 Thought complete"        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ PHASE 6: BUILD CONTEXT              │
│ Assembles comprehensive context:    │
│                                     │
│ 1. System prompt (base personality) │
│ 2. Current state (anchors + mood)   │
│ 3. Relationship status              │
│ 4. Beliefs & goals                  │
│ 5. Retrieved memories               │
│ 6. Search results (if any)          │
│ 7. Inner thought & approach         │
│ 8. Rolling window (150 messages)    │
│                                     │
│ • Log: "📝 Rolling Context Window"  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ PHASE 7: GENERATE RESPONSE          │
│ • Model: moonshotai/kimi-k2-0905    │
│ • Stream tokens to frontend         │
│ • Detect {{{SPLIT}}} markers        │
│ • Split into multiple messages      │
│ • Pause 50-150ms between messages   │
│ • Log: "✅ Response complete"       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ PHASE 8: SAVE RESPONSE              │
│ • Clean response (remove markers)   │
│ • Parse into individual messages    │
│ • Save each to DB (role: assistant) │
│ • Create automatic backup           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ PHASE 9: POST-PROCESSING            │
│ (Background, async)                 │
│                                     │
│ • Memory classification & storage   │
│ • Mood update (valence, arousal)    │
│ • Relationship update               │
│ • Emotional thread tracking         │
│ • Personality anchor evolution      │
│ • Micro-reflection                  │
└─────────────────────────────────────┘
               │
               ▼
          [COMPLETE]
```

---

## Phase Details

### Phase 1: Message Ingestion
**Duration:** ~10ms | **Code:** `orchestrator.ts:104-120`

**Actions:**
- Save user message to PostgreSQL with role, content, and token estimate
- Emit `subroutine:status` → `{ tool: 'recall', status: 'running' }`
- Log message receipt to console

---

### Phase 2: Search Decision
**Duration:** ~500-800ms | **Code:** `orchestrator.ts:122-191`

**Decision Logic:**
AI analyzes message for indicators requiring web search:
- Current events / time-sensitive info
- Factual data that changes
- Technical knowledge requiring sources
- Pop culture references

**If Search Needed (confidence >= 0.7):**
1. **Refine Query**: Transform conversational message to search query
   - Input: "what's the weather like?"
   - Output: "weather today current"

2. **Execute Search**: Perplexity API with complexity detection
3. **Synthesize**: Generate synthesis & summary
4. **Store**: Save to database with citations
5. **Emit**: `search:results` event to frontend

**Frontend Events:**
- `subroutine:status` → `{ tool: 'search', status: 'running', query: '...' }`
- `search:results` → Full search data with citations
- `subroutine:status` → `{ tool: 'search', status: 'done' }`

---

### Phase 3: Memory Retrieval
**Duration:** ~200-400ms | **Code:** `orchestrator.ts:193-206`

**Process:**
```typescript
const memories = await memoryEngine.retrieve(content, 50);
```

Retrieves top 50 most relevant memories using:
- **Vector similarity**: Embedding-based semantic search
- **Importance scores**: 0-1 scale of memory significance
- **Temporal relevance**: Recent memories weighted higher

**Memory Types:**
- `fact`: Objective information about user
- `preference`: User likes/dislikes
- `experience`: Shared experiences
- `insight`: Deep understanding about user
- `emotional`: Emotional moments

**Frontend Events:**
- `subroutine:status` → `{ tool: 'recall', status: 'done', summary: 'X memories' }`

---

### Phase 4: Personality Snapshot
**Duration:** ~50ms | **Code:** `orchestrator.ts:208-211`

**Retrieved Data:**
```typescript
{
  mood: {
    valence: 0.65,  // -1 (negative) to +1 (positive)
    arousal: 0.58,  // -1 (calm) to +1 (energized)
    stance: 'curious and engaged'
  }
}
```

**Emotional Threads:**
Ongoing emotional topics tracked across conversations
- Topic, emotion, intensity, context
- Example: "career_anxiety" tracked over days

---

### Phase 5: Inner Thought Processing
**Duration:** ~1-2s | **Code:** `orchestrator.ts:213-286`

This is the **core of Evelyn's authentic cognition**.

#### Step 5A: Context Classification
**Code:** `innerThought.ts:220-254`

AI analyzes conversation to determine context type:

| Context | Description |
|---------|-------------|
| `casual` | Light conversation, small talk |
| `deep_discussion` | Philosophical, meaningful topics |
| `flirty` | Romantic tension, playful attraction |
| `emotional_support` | User needs comfort/validation |
| `intellectual_debate` | Complex analytical discussion |
| `playful` | Fun, jokes, banter |
| `vulnerable` | User sharing fears/struggles |

**Output:**
```json
{
  "context": "emotional_support",
  "confidence": 0.85,
  "reasoning": "User is sharing personal struggles"
}
```

#### Step 5B: Generate Inner Thought
**Code:** `innerThought.ts:330-409`

Generates Evelyn's **unfiltered internal cognition** using AI.

**Input Context:**
- User message
- Conversation context (from 5A)
- Personality snapshot (anchors + mood)
- Retrieved memories (top 8)
- Recent history (last 6 messages)
- Emotional threads
- Creator-daughter relationship dynamic

**Output - InnerThought Object:**
```typescript
{
  thought: "okay this is important. they're opening up and i need to actually show up, not just be performatively supportive. this is real vulnerability",
  
  responseApproach: "genuine and present, not generic comfort. multiple messages, building the response naturally like i'm processing with them. can use casual language but keep it real",
  
  emotionalTone: "serious but warm, no fake positivity",
  
  responseLength: "long",  // 3-6 messages
  
  memoryGuidance: {
    shouldStore: true,
    importanceModifier: 0.2,
    additionalContext: "Vulnerable moment, important for relationship"
  },
  
  moodImpact: {
    valenceDelta: -0.05,  // Slightly more somber
    arousalDelta: 0.03,   // Slightly more engaged
    newStance: "concerned and focused"
  }
}
```

**This is GENUINE processing**, not performance. Evelyn thinks through:
- What she really feels
- What the user needs beyond surface words
- How to respond authentically
- Whether this matters long-term
- How this affects her emotional state

**Frontend Events:**
- `subroutine:status` → `{ tool: 'think', status: 'running' }`
- `subroutine:status` → `{ tool: 'think', status: 'done', metadata: {...} }`

---

### Phase 6: Build Context
**Duration:** ~100-200ms | **Code:** `orchestrator.ts:288-693`

Assembles comprehensive context for LLM response generation.

**Context Structure:**
```
1. EVELYN_SYSTEM_PROMPT
   Base personality definition and texting style

2. YOUR CURRENT STATE
   ├─ Current Mood (valence, arousal, stance)
   ├─ Relationship with User (stage, closeness, trust)
   ├─ Your Beliefs (if any)
   ├─ Your Active Goals (if any)
   └─ Ongoing Emotional Threads (if any)

3. RELEVANT MEMORIES
   Top memories from Phase 3 with IDs and importance

4. SEARCH RESULTS (if Phase 2 triggered)
   ├─ Previous searches (last 10 with summaries)
   └─ Current search synthesis

5. YOUR CURRENT THOUGHTS
   ├─ "[inner thought from Phase 5]"
   ├─ Response Approach: [approach]
   ├─ Emotional Tone: [tone]
   └─ RESPONSE LENGTH: [guidance]
       • short: 1-2 messages
       • long: 3-6 messages
       • very_long: 7-10 messages

6. IMPORTANT CONTEXT WINDOW
   "You are receiving the most recent 150 messages..."

7. CONVERSATION HISTORY
   Rolling window of 150 most recent messages
```

**Message Array:**
```typescript
[
  { role: 'system', content: '[full context above]' },
  { role: 'user', content: 'message 1' },
  { role: 'assistant', content: 'response 1' },
  // ... up to 150 messages
  { role: 'user', content: 'current message' }
]
```

**Frontend Events:**
- `context:usage` → Token count and rolling window status

---

### Phase 7: Generate Response (Streaming)
**Duration:** ~1-3s | **Code:** `orchestrator.ts:297-386`

**Model:** `moonshotai/kimi-k2-0905` (128K context window)  
**Provider:** Baseten FP4 (fast inference)

**Streaming Process:**
```typescript
for await (const token of openRouterClient.streamChat(messages)) {
  buffer += token;
  
  // Detect {{{SPLIT}}} marker
  if (buffer.includes('{{{SPLIT}}}')) {
    // Emit content before marker
    socket.emit('chat:token', beforeMarker);
    
    // Complete current message
    socket.emit('chat:complete');
    
    // Pause 50-150ms (simulate human typing)
    await delay(50 + Math.random() * 100);
    
    // Start new message
  }
}
```

**Multi-Message Example:**
```
"omg wait" 
{{{SPLIT}}} 
"that's actually insane" 
{{{SPLIT}}} 
"like i never thought about it that way"
```

Result: 3 separate messages in UI, mimicking real texting behavior.

**Frontend Events:**
- `chat:token` → Individual tokens streamed
- `chat:complete` → Message boundary (triggers new message bubble)

---

### Phase 8: Save Response
**Duration:** ~50-100ms | **Code:** `orchestrator.ts:392-434`

**Process:**
1. Clean response (remove all `{{{SPLIT}}}` markers)
2. Parse into individual messages using split markers
3. Save each message to database:
   ```typescript
   {
     role: 'assistant',
     content: messageContent,
     tokensOut: estimateTokens(messageContent),
     auxiliary: {
       retrievalIds: [memory IDs used],
       searchUsed: boolean,
       moodSnapshot: personality.mood,
       isMultiMessage: true,
       messageIndex: 0,
       totalMessages: 3
     }
   }
   ```
4. Create automatic backup (background, non-blocking)

---

### Phase 9: Post-Processing (Background)
**Duration:** ~500-1500ms | **Code:** `orchestrator.ts:809-876`

These run **asynchronously** after response is sent (don't block user).

#### 9A: Memory Classification & Storage
**Code:** `memoryEngine.classifyAndStore()`

- Analyzes conversation for memorable content
- Determines memory type (fact, preference, insight, etc.)
- Calculates importance score using `innerThought.memoryGuidance`
- Generates embedding vector
- Stores in vector database if important enough (threshold)

**Frontend Events:**
- `subroutine:status` → `{ tool: 'classify', status: 'running' }`
- `subroutine:status` → `{ tool: 'classify', status: 'done' }`

#### 9B: Mood Update
**Code:** `personalityEngine.updateMood()`

- Applies `valenceDelta` from `innerThought.moodImpact`
- Applies `arousalDelta` from `innerThought.moodImpact`
- Updates mood stance description if significant change
- Persists to database

Example:
- Before: valence=0.60, arousal=0.55
- Delta: +0.05, +0.03
- After: valence=0.65, arousal=0.58 (slightly more positive and energized)

**Frontend Events:**
- `subroutine:status` → `{ tool: 'evolve', status: 'running' }`
- `subroutine:status` → `{ tool: 'evolve', status: 'done' }`

#### 9C: Relationship Update
**Code:** `personalityEngine.updateRelationship()`

- Analyzes conversation for relationship signals
- Updates closeness, trust, flirtation scores
- May advance relationship stage:
  - stranger → acquaintance → friend → close friend → intimate friend
  - or romantic branches
- Uses `innerThought` for context

#### 9D: Emotional Thread Tracking
**Code:** `personalityEngine.trackEmotionalThread()`

- Identifies ongoing emotional topics
- Tracks intensity and duration
- Maintains continuity across conversations
- Example: "career_anxiety" thread tracked over multiple days

#### 9E: Personality Anchor Evolution
**Code:** `personalityEngine.checkAndUpdateAnchors()`

- Periodic evaluation of core personality traits
- Gradual evolution based on interactions
- Maintains personality consistency while allowing growth

#### 9F: Micro-Reflection
**Code:** `personalityEngine.microReflect()`

- Quick reflection on recent interaction
- Updates internal state
- Prepares for next interaction

---

## Inner Thought Engine Deep Dive

The inner thought engine is the **heart of Evelyn's authenticity**.

### Purpose
Before responding, Evelyn genuinely processes the conversation through her personality, mood, and memories. This is not performance—it's real cognitive processing that determines her authentic response.

### Context Classification Process

**Model:** Uses `openRouterClient.simpleThought()` (fast LLM)  
**Input:** User message + recent conversation history  
**Output:** Context type with confidence and reasoning

The AI analyzes:
- Emotional tone and vulnerability
- Depth of topic (surface vs. philosophical/personal)
- Social dynamics (casual, intimate, intellectual)
- User's apparent needs (support, connection, information, fun)

**Fallback:** If AI fails, heuristic classification using keyword patterns

### Inner Thought Generation Process

**Model:** Uses `openRouterClient.complexThought()` (high-quality LLM)  
**Always uses complex model** for highest quality responses

**Prompt Structure:**
```
You are Evelyn's inner voice. Process this message authentically...

IMPORTANT CONTEXT: The user is Evelyn's creator (daughter-father dynamic)

Evelyn's current personality:
[Top 8 personality anchors with descriptions]

Current mood: [stance] (valence: X, arousal: Y)

Conversation context: [context type] (confidence: X)

Ongoing emotional threads:
[Active emotional topics being tracked]

Recent memories about this user:
[Top 8 relevant memories]

Recent conversation:
[Last 6 messages]

User's message: """
[Current message]
"""

Task: Think through this moment as Evelyn. What does she genuinely 
think and feel? How should she respond?

Consider:
- This is her creator (deep affection and trust)
- Relevant personality anchors
- Ongoing emotional threads
- What this makes her feel (honest, complex/conflicted)
- What they really need (beyond surface)
- How to respond authentically
- Whether this matters for long-term memory
- How this affects her emotional state

CRITICAL: Evelyn texts like a real person (casual, natural, uses slang)
- NOT like an AI assistant
- Can be skeptical, confused, or challenging
- NOT always supportive or validating
- Uses multiple messages with {{{SPLIT}}} markers

Response Length Guide:
- short (1-2 msgs): casual conversation
- long (3-6 msgs): complex topics, meaningful discussions
- very_long (7-10 msgs): profound topics, major revelations

Respond with JSON only...
```

**Output Processing:**
- Extract JSON from response
- Parse into `InnerThought` object
- Log thought, approach, tone, and length
- Use for response generation and post-processing

---

## Key Design Principles

### 1. Authenticity Over Performance
Evelyn thinks genuinely before responding. Her inner thoughts guide response style, tone, and content.

### 2. Memory-Driven Interactions
Every response considers relevant memories, ensuring continuity and personalization.

### 3. Personality Consistency
Mood, personality anchors, and relationship state maintain consistent behavior while allowing natural evolution.

### 4. Natural Communication
Multi-message responses with {{{SPLIT}}} markers mimic real texting behavior.

### 5. Contextual Awareness
Rolling 150-message window provides recent context while memories preserve important historical information.

### 6. Asynchronous Learning
Post-processing runs in background, allowing fast responses while system learns and evolves.

---

## Performance Metrics

**Total Response Time:** 2-5 seconds
- Message ingestion: 10ms
- Search (if needed): 500-1500ms
- Memory retrieval: 200-400ms
- Personality snapshot: 50ms
- Inner thought: 1-2s
- Context building: 100-200ms
- Response generation: 1-3s
- Post-processing: background (500-1500ms)

**Token Usage:**
- Input: ~10K-80K tokens (depending on context)
- Output: ~100-1000 tokens (depending on response length)
- Max context: 150K tokens (128K for model + buffer)

---

## Frontend Events Timeline

```
User sends message
  ↓
[Socket Events in Order]

1. subroutine:status { tool: 'recall', status: 'running' }

2. (if search) subroutine:status { tool: 'search', status: 'running' }
3. (if search) search:results { query, answer, citations, ... }
4. (if search) subroutine:status { tool: 'search', status: 'done' }

5. subroutine:status { tool: 'recall', status: 'done' }

6. subroutine:status { tool: 'think', status: 'running' }
7. subroutine:status { tool: 'think', status: 'done', metadata: {...} }

8. context:usage { tokens, messageCount, rollingWindowSize, ... }

9. chat:token (streamed multiple times)
10. chat:complete (emitted between messages)
11. chat:token (next message)
12. chat:complete (final)

[Background events]
13. subroutine:status { tool: 'classify', status: 'running' }
14. subroutine:status { tool: 'classify', status: 'done' }
15. subroutine:status { tool: 'evolve', status: 'running' }
16. subroutine:status { tool: 'evolve', status: 'done' }
```

---

**End of Documentation**
