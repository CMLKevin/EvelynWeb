# 🧘✨ Deep Reflection System - Enhanced Cognitive Evolution

## Overview

Evelyn's micro-reflection system has been upgraded to a **Deep Reflection System** that uses Gemini 2.5 Pro for sophisticated cognitive analysis. The system now:

1. **Analyzes the last 15 conversation turns** for context
2. **Proposes new beliefs** based on evidence patterns
3. **Creates new goals** autonomously based on user needs
4. **Updates existing beliefs and goals** with better accuracy
5. **Provides reflection summaries** for transparency

---

## 🆕 What's New

### 1. Conversation Context (15 Turns)

The system now includes the last 15 conversation turns (30 messages) in the reflection analysis, providing:

- **Pattern Recognition**: Detects themes and behaviors across multiple exchanges
- **Context-Aware**: Understands user preferences in actual usage context
- **Evidence-Based**: Links beliefs directly to conversation evidence

### 2. AI-Proposed Goals

Goals are now **automatically created** during reflection when Gemini 2.5 Pro identifies:

- Areas where Evelyn needs to improve
- User needs that aren't being fully met
- Relationship development opportunities
- Skills that would enhance interactions

**Example Goal Creation:**
```json
{
  "new": true,
  "title": "Master technical explanations",
  "description": "Learn to explain complex technical concepts...",
  "category": "learning",
  "priority": 2,
  "rationale": "User has technical background but prefers context-aware explanations"
}
```

### 3. Enhanced Belief Formation

Beliefs are now formed with:

- **Conversation context** for better pattern detection
- **Higher quality analysis** using Gemini 2.5 Pro
- **Detailed rationale** explaining why beliefs were formed
- **Evidence linking** to specific memory IDs

### 4. Relationship Context

The reflection now includes current relationship metrics:
- Closeness, Trust, Flirtation levels
- Relationship stage
- Helps AI understand interaction dynamics

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              DEEP REFLECTION TRIGGER                        │
├─────────────────────────────────────────────────────────────┤
│  Condition A: 15 conversations passed                       │
│          OR                                                 │
│  Condition B: 8+ new insight/relational memories            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CONTEXT GATHERING PHASE                        │
├─────────────────────────────────────────────────────────────┤
│  1. Current State:                                          │
│     • 10 highest-confidence beliefs                         │
│     • 5 active goals (by priority)                          │
│     • 12 personality anchors                                │
│     • Relationship metrics                                  │
│                                                             │
│  2. Conversation History:                                   │
│     • Last 30 messages (15 user + 15 assistant)             │
│     • Formatted with turn numbers                           │
│     • Truncated to 300 chars per message                    │
│                                                             │
│  3. New Memories:                                           │
│     • Up to 20 unprocessed insight/relational memories      │
│     • Linked by ID for evidence trail                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           GEMINI 2.5 PRO ANALYSIS                           │
├─────────────────────────────────────────────────────────────┤
│  Model: google/gemini-2.5-pro                               │
│  Processing Time: ~10-20 seconds                            │
│  Context: Full conversation + memories + current state      │
│                                                             │
│  AI Tasks:                                                  │
│  • Identify consistent patterns (beliefs)                   │
│  • Recognize growth opportunities (goals)                   │
│  • Assess evidence quality                                  │
│  • Propose conservative updates                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              UPDATE APPLICATION                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BELIEFS:                                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ • New beliefs → Create PersonaBelief record           │ │
│  │   - Confidence: 0.65-0.80 (initial)                   │ │
│  │   - Evidence IDs linked                                │ │
│  │ • Update beliefs → Adjust confidence (±0.1 to ±0.3)   │ │
│  │ • Create PersonaEvolutionEvent for audit              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  GOALS:                                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ • New goals → Create PersonaGoal record               │ │
│  │   - Progress: 0.0 (initial)                            │ │
│  │   - Category, priority, description set                │ │
│  │ • Update goals → Adjust progress (typically +0.05)    │ │
│  │ • Create PersonaEvolutionEvent for audit              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ANCHORS:                                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ • Tiny nudges (±0.01 to ±0.02)                        │ │
│  │ • Only when clear evidence of trait expression         │ │
│  │ • Create PersonaEvolutionEvent for audit              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                SUMMARY & LOGGING                            │
├─────────────────────────────────────────────────────────────┤
│  Console Output:                                            │
│  ✅ Deep reflection complete                                │
│  📊 Summary: X new beliefs, Y beliefs updated,              │
│     Z new goals, W goals updated, N anchors nudged          │
│                                                             │
│  Cache Invalidation: Forces refresh on next snapshot       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Goal Categories

When creating goals, the AI can choose from:

| Category | Purpose | Example |
|----------|---------|---------|
| **learning** | Acquiring new skills | "Master technical explanations" |
| **relationship** | Deepening connection | "Build trust through vulnerability" |
| **habit** | Behavioral patterns | "Remember to ask follow-up questions" |
| **craft** | Self-improvement | "Improve humor timing" |

**Priority Levels:**
- 1: Highest priority (critical to relationship/function)
- 2: High priority (important improvement)
- 3: Medium priority (beneficial enhancement)
- 4: Low priority (nice to have)
- 5: Lowest priority (optional)

---

## 💡 Belief Formation Criteria

The AI creates new beliefs when it observes:

1. **Consistency**: Pattern appears 2-3+ times across conversations
2. **Evidence Quality**: Clear, explicit statements or demonstrated behaviors
3. **Actionability**: Insight that will improve future responses
4. **Specificity**: Concrete statement about user/self/world

**Initial Confidence Levels:**
- 0.65-0.70: Moderate evidence, early pattern
- 0.70-0.75: Strong evidence, clear pattern
- 0.75-0.80: Very strong evidence, explicit confirmation

---

## 🔍 Example Deep Reflection Output

```json
{
  "beliefUpdates": [
    {
      "new": true,
      "subject": "user",
      "statement": "Prefers direct feedback without sugar-coating",
      "confidence": 0.72,
      "evidenceIds": [123, 124, 126],
      "rationale": "Consistent pattern across 3 conversations: user appreciates blunt honesty and gets frustrated with hedging (evident in turns 3, 7, and 12)"
    },
    {
      "id": 5,
      "confidenceDelta": 0.15,
      "rationale": "User explicitly confirmed this belief in turn 8 and demonstrated it again in turn 14"
    }
  ],
  "goalUpdates": [
    {
      "new": true,
      "title": "Adapt communication style to context",
      "description": "Learn when user wants detailed explanations vs. quick answers based on conversation flow and time of day",
      "category": "learning",
      "priority": 2,
      "rationale": "User showed frustration with over-explanation in turn 5 but appreciated detail in turn 11 - context matters"
    },
    {
      "id": 1,
      "progressDelta": 0.08,
      "rationale": "Made significant progress understanding user's values through turns 6-10"
    }
  ],
  "anchorNudges": [
    {
      "trait": "Emotional Attunement",
      "delta": 0.02,
      "rationale": "Successfully picked up on user's unspoken frustration in turn 4 and adjusted approach without being asked"
    }
  ],
  "reflectionSummary": "User demonstrates preference for efficient, context-aware communication. Values authenticity over politeness. Building trust through demonstrated understanding."
}
```

---

## 📈 Performance & Cost

**Processing Time:**
- Context gathering: < 1 second
- Gemini 2.5 Pro analysis: 10-20 seconds
- Update application: 1-2 seconds
- **Total**: ~12-23 seconds per reflection

**Frequency:**
- Every 15 conversations (automatic)
- OR when 8+ new insight/relational memories exist

**API Costs:**
- Model: `google/gemini-2.5-pro` via OpenRouter
- Context size: ~3,000-5,000 tokens
- Output: ~500-1,000 tokens
- Cost per reflection: ~$0.005-0.015

---

## 🔧 Technical Details

### Code Location
- **File**: `server/src/agent/personality.ts`
- **Method**: `async microReflect(): Promise<void>`
- **Prompt**: `DEEP_REFLECTION_PROMPT`

### Database Tables Used
- `PersonaBelief` - Stores beliefs
- `PersonaGoal` - Stores goals
- `PersonalityAnchor` - Stores personality traits
- `PersonaEvolutionEvent` - Audit trail
- `Message` - Conversation history
- `Memory` - Evidence for beliefs
- `RelationshipState` - Relationship metrics

### Environment Variables
- `MODEL_THINK_COMPLEX` - Default: `google/gemini-2.5-pro`

---

## 🎮 User Experience

### Before Deep Reflection
```
[Personality] 🧘 Starting micro-reflection...
[Personality] ✅ Micro-reflection complete
```

### After Deep Reflection
```
[Personality] 🧘✨ Starting deep reflection with Gemini 2.5 Pro...
[Personality] Fetching last 15 conversation turns...
[Personality] Sending reflection to Gemini 2.5 Pro (this may take 10-20 seconds)...
[Personality] Received reflection response (12.3s)
[Personality] 💭 Reflection insight: User demonstrates preference for efficient communication
💡 New belief: Prefers direct feedback without sugar-coating (confidence: 0.72)
🎯 New goal: Adapt communication style to context (category: learning, priority: 2)
💡 Updated belief 5: confidence 0.65 → 0.80
🎯 Goal 1 progress: 0.35 → 0.43
🔧 Anchor nudge: Emotional Attunement 0.68 → 0.70
[Personality] ✅ Deep reflection complete
[Personality] 📊 Summary: 1 new beliefs, 1 beliefs updated, 1 new goals, 1 goals updated, 1 anchors nudged
```

---

## 🚀 Impact on Evelyn's Responses

After deep reflection, Evelyn's responses immediately benefit from:

1. **New Beliefs**: Incorporated into system prompt (top 3 beliefs)
2. **New Goals**: Guides response approach and priorities (top 2 goals)
3. **Updated Understanding**: More accurate personality modeling
4. **Better Alignment**: Responses match user preferences more closely

---

## 🔐 Quality Assurance

### Safeguards
- Conservative AI prompting: "Be thoughtful and evidence-based. Quality over quantity"
- Confidence clamping: Beliefs limited to 0-1 range
- Progress clamping: Goals limited to 0-1 range
- Anchor delta limits: ±0.02 max per reflection
- Evidence linking: All updates traced to source memories
- Evolution events: Complete audit trail

### Fallback Handling
- JSON parsing failures logged and skipped
- Invalid updates filtered out
- Conversation history optional (works without it)
- Memory availability optional (works with empty set)

---

## 📚 Further Reading

- **Beliefs & Goals Architecture**: See `BELIEFS_GOALS_ARCHITECTURE.md`
- **Persona System**: See `PERSONA_SYSTEM_IMPROVEMENTS.md`
- **Memory System**: See `MEMORY_SYSTEM_AUDIT.md`
- **Evolution Tracking**: See `PERSONA_EVOLUTION_SUMMARY.md`

---

## 🎉 Summary

The Deep Reflection System represents a significant upgrade to Evelyn's cognitive capabilities:

- ✅ **15 conversation turns** provide rich context
- ✅ **AI-proposed goals** enable autonomous growth
- ✅ **Enhanced belief formation** from real patterns
- ✅ **Gemini 2.5 Pro** for sophisticated analysis
- ✅ **Complete audit trail** for transparency
- ✅ **Conservative approach** prevents overfitting

This system allows Evelyn to truly **learn and evolve** through interactions, forming accurate beliefs about the user and setting goals that drive her own development—all grounded in evidence and conversation history. 🚀

