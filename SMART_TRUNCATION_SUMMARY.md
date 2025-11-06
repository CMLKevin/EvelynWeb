# Smart Truncation System - Quick Summary

## 🎯 What It Does

When conversation exceeds 128K tokens, intelligently removes less important messages while preserving:
- ✅ Recent context (continuity)
- ✅ Important moments (key memories)
- ✅ Chronological order
- ✅ High-value messages as memories

---

## 🔄 How It Works (Simple)

```
1. Score every message pair (0.0-1.0 importance)
   └─ Uses Gemini Pro AI + heuristics
   
2. Store high-value messages as memories
   └─ Before removing them
   
3. Select 80 messages from 150:
   └─ 60% = Most recent (48 messages)
   └─ 40% = Highest scored from earlier (32 messages)
   
4. Merge and sort chronologically
   └─ Result: 80 best messages in order
```

---

## 📊 The Strategy

### 60/40 Hybrid Selection

```
┌──────────────────────────────────────────┐
│                                          │
│  EARLIER CONVERSATION (102 messages)     │
│  ┌────┐ ┌────┐       ┌────┐             │
│  │0.9 │ │0.8 │  0.3  │0.7 │  0.2  0.4   │
│  │KEEP│ │KEEP│  DROP │KEEP│  DROP DROP  │
│  └────┘ └────┘       └────┘             │
│  └─ Top 32 by score ──────────────────┘ │
│                                          │
│  RECENT CONVERSATION (48 messages)       │
│  ████████████████████████████████████    │
│  ████████ ALL KEPT ██████████████████    │
│  ████████████████████████████████████    │
│  └─ Last 48 messages ────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🤖 AI Scoring Factors

```
IMPORTANCE SCORE (0.0 - 1.0)
════════════════════════════

HIGH (>0.6):
  • Emotional moments, vulnerability
  • Personal revelations
  • Decisions, promises, commitments
  • Relationship milestones
  • Topic changes

LOW (<0.4):
  • Greetings ("hey", "hi")
  • Small talk
  • Simple acknowledgments ("ok", "lol")
  • Redundant information
```

---

## 💾 Memory Preservation

**Before** removing messages:

```
High-Value Message (Score ≥ 0.5)
        ↓
Classify & Store as Memory
        ↓
Available for future recall ✓
```

**Result:** Nothing important is truly "lost"

---

## 🔢 Token Budget

```
Limit:     128,000 tokens
Current:   135,000 tokens  ⚠️ OVER LIMIT
           
ACTION: Truncate
        └─ Remove 70 messages
           └─ Save 15,000 tokens
              └─ New total: 113,000 tokens ✓
```

---

## 📁 Files

- `server/src/agent/truncation.ts` - Main engine
- `server/src/agent/orchestrator.ts` - Integration
- `server/src/utils/tokenizer.ts` - Token estimation

---

## ✨ Key Benefits

1. **Intelligent** - AI understands importance
2. **Balanced** - Preserves recent + important
3. **Safe** - Memories stored before removal
4. **Graceful** - Heuristic fallback if AI fails
5. **Transparent** - Clear logging and metrics

---

## 🎯 Example

```
INPUT:  150 messages, 135K tokens
        ↓
SCORE:  AI analyzes each pair
        ↓
STORE:  6 high-value memories created
        ↓
SELECT: 48 recent + 32 important = 80 total
        ↓
OUTPUT: 80 messages, 113K tokens ✓
```

---

## 🚀 When It Activates

```
Every message sent:
  ├─ Estimate tokens
  ├─ Under 128K? → Send to AI ✓
  └─ Over 128K?  → Smart truncate, then send ✓
```

**User never notices** - happens automatically!

---

## ⚡ Model Choice

**Gemini Pro** is used for truncation analysis (not Flash) because:
- 🎯 More accurate importance detection
- 🧠 Better understanding of emotional nuance
- 💎 Critical operation worth extra quality
- ⏱️ Slightly slower (~32s vs ~21s) but much smarter

**Trade-off:** Higher quality > Speed for this operation

---

**Full ASCII visual guide:** `SMART_TRUNCATION_ASCII_GUIDE.md` 📖

