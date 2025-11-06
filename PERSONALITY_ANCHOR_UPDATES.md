# Evelyn's Personality Anchor Update System

## Overview

Evelyn now has a **fully functional personality evolution system** that allows her core personality traits (anchors) to gradually shift based on accumulated evidence from conversations. This creates a truly adaptive AI companion that grows and evolves through meaningful interactions.

## Architecture

### Two-Layer Personality System

#### Layer 1: Mood State (Short-term, Dynamic)
- **Updates**: After EVERY conversation
- **Decay**: Returns to baseline over 30 minutes
- **Components**: Valence (-1 to +1), Arousal (0 to 1), Stance (text)
- **Purpose**: Immediate emotional responses to conversations

#### Layer 2: Personality Anchors (Long-term, Stable) ⭐ **NOW ACTIVE**
- **Updates**: Automatically when conditions are met
- **Stability**: Changes slowly with strong evidence (max ±5% per update)
- **Components**: 6 core traits with values from 0.0 to 1.0
- **Purpose**: Define Evelyn's fundamental personality

## The 6 Personality Anchors

```typescript
1. Social Fluidity        0.78  // Adapts instantly to different contexts
2. Intellectual Spark     0.75  // Gets excited about ideas and connections
3. Chaotic Warmth        0.68  // Organized mind, messy expression
4. Natural Flirtation    0.65  // Playful teasing and banter
5. Fierce Loyalty        0.62  // All-in once she cares
6. Unfiltered Honesty    0.58  // Dark humor and raw truth when trusting
```

## How Anchor Updates Work

### Trigger Conditions

Anchor updates are checked after EVERY conversation but only triggered when:

**Option 1**: 
- ✅ **5 or more** new insight/relational memories have been created

**Option 2**:
- ✅ **20 or more** conversations have occurred since last update
- ✅ **AND at least 2** new insight/relational memories exist

### The Update Process

```
┌─────────────────────────────────────────────────────────┐
│  1. CONVERSATION COMPLETES                              │
│     User message → Evelyn responds                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  2. MEMORY CLASSIFICATION                               │
│     AI analyzes if conversation should be remembered    │
│     Creates memory if importance > 0.30                 │
│     Memory types: episodic, semantic, preference,       │
│                   insight, plan, relational             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  3. MOOD UPDATE                                         │
│     Evelyn's emotional state updated (always)           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  4. ANCHOR UPDATE CHECK (NEW!)                          │
│     personalityEngine.checkAndUpdateAnchors()           │
│     - Counts conversations since last update            │
│     - Finds new insight/relational memories             │
│     - Checks if trigger conditions are met              │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌──────────┴──────────┐
              │                     │
         NO   │                     │   YES
    ┌─────────▼─────────┐  ┌────────▼────────┐
    │ Log status        │  │ TRIGGER UPDATE  │
    │ Continue tracking │  │                 │
    └───────────────────┘  └────────┬────────┘
                                    ↓
┌─────────────────────────────────────────────────────────┐
│  5. COLLECT EVIDENCE                                    │
│     - Get all new insight/relational memories           │
│     - These haven't been used as evidence before        │
│     - Tracked via evidenceIds field in anchors          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  6. AI ANALYSIS (Gemini Pro)                           │
│     Prompt includes:                                    │
│     - Current anchor values & descriptions              │
│     - All new evidence memories                         │
│                                                         │
│     AI proposes minimal updates (Δ ≤ 0.05 per trait)  │
│     with clear justifications                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  7. APPLY UPDATES                                       │
│     For each proposed update:                           │
│     - Add delta to current value                        │
│     - Clamp to 0.0-1.0 range                           │
│     - Store evidence memory IDs                         │
│     - Update timestamp                                  │
│     - Log the change                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  8. SAVE TO DATABASE                                    │
│     Updated anchors persisted in SQLite                 │
│     Used in all future conversations                    │
└─────────────────────────────────────────────────────────┘
```

### Example Update Scenario

```
Initial State:
├─ Fierce Loyalty: 0.62
├─ Conversations since update: 0
└─ New evidence memories: 0

After 15 conversations with shallow topics:
├─ Fierce Loyalty: 0.62 (unchanged)
├─ Conversations since update: 15
└─ New evidence memories: 1 (insufficient)

User opens up about deep personal struggle:
└─> Memory created: "relational" type, high importance
    ├─ New evidence memories: 2
    └─> Still below threshold, tracking continues

User shares vulnerable moment about family:
└─> Memory created: "insight" type, high importance
    ├─ New evidence memories: 3
    └─> Still below threshold

Conversation deepens over 5 more exchanges:
└─> 3 more "relational" memories created
    ├─ New evidence memories: 6
    └─> ✅ THRESHOLD REACHED (≥5 evidence memories)

AI Analysis:
{
  "updates": [
    {
      "trait": "Fierce Loyalty",
      "delta": 0.04,
      "rationale": "Demonstrated deeper commitment during user's vulnerable moments"
    },
    {
      "trait": "Unfiltered Honesty", 
      "delta": 0.03,
      "rationale": "Shared more raw truths as trust deepened"
    }
  ]
}

Result:
├─ Fierce Loyalty: 0.62 → 0.66 (+4%)
├─ Unfiltered Honesty: 0.58 → 0.61 (+3%)
├─ Evidence memories marked as used
├─ Conversation counter reset to 0
└─ Timestamp updated
```

## Memory Types That Drive Anchor Updates

Only two memory types trigger anchor updates:

### ✅ Insight Memories
**Definition**: Realizations and understanding about the user
**Examples**:
- "User values independence over connection"
- "Realizes they're afraid of being vulnerable"
- "Has imposter syndrome about their achievements"

### ✅ Relational Memories  
**Definition**: Relationship dynamics, trust, boundaries
**Examples**:
- "User trusts Evelyn with private family matters"
- "Established playful banter dynamic"
- "Set boundaries around work-life discussion"

### ❌ Other Memory Types (Not Used for Anchors)
- **episodic**: Specific events (stored but doesn't affect personality)
- **semantic**: Facts and knowledge
- **preference**: Likes and dislikes
- **plan**: Future intentions

## Safety Constraints

### Rate Limiting
- Max change per trait: **±0.05 (5%)** per update
- Minimum evidence: **5 insight/relational memories** OR **20 conversations + 2 memories**
- Concurrent update prevention: Only one update can run at a time

### Value Constraints
- All anchor values clamped between **0.0 and 1.0**
- Updates require AI justification (not arbitrary)
- Evidence IDs tracked to prevent reuse

### Stability
- Anchors only update with **strong evidence**
- Changes are **gradual and justified**
- **Preserves core personality** while allowing growth

## API Endpoints

### Get Anchor Update Status
```bash
GET /api/personality/anchor-status
```

**Response**:
```json
{
  "conversationsSinceUpdate": 15,
  "newEvidenceCount": 3,
  "lastUpdateAt": "2025-11-04T12:43:39.336Z"
}
```

### Get Current Personality (includes anchors)
```bash
GET /api/personality
```

**Response**:
```json
{
  "anchors": [
    {
      "id": 1,
      "trait": "Social Fluidity",
      "value": 0.78,
      "evidenceIds": [12, 15, 23],
      "lastUpdateAt": "2025-11-04T12:43:39.332Z",
      "description": "Instantly reads context..."
    }
  ],
  "mood": { ... }
}
```

### Manually Trigger Update (for testing)
```bash
POST /api/personality/update-anchors
```

**Response**:
```json
{
  "success": true,
  "updated": true,
  "message": "Anchors updated"
}
```

## Monitoring & Diagnostics

### Console Logs

The system outputs detailed logs:

```
[Personality] Checking anchor update conditions:
  - Conversations since last update: 7
  - New evidence memories: 3
[Personality] Anchor update conditions not met yet

[Personality] Checking anchor update conditions:
  - Conversations since last update: 23
  - New evidence memories: 5
🔧 [Personality] Triggering anchor update...
🔧 Updated Fierce Loyalty: 0.62 → 0.66 (Showed deeper care during vulnerable moment)
✅ [Personality] Anchor update completed
```

### Database Tracking

All updates are tracked:
- `evidenceIds`: JSON array of memory IDs used as evidence
- `lastUpdateAt`: Timestamp of last update
- `value`: Current trait value

## Implementation Details

### Files Modified

1. **`server/src/agent/personality.ts`**
   - Added `conversationsSinceUpdate` counter
   - Added `anchorUpdateInProgress` flag for concurrency
   - Added `checkAndUpdateAnchors()` method (automatic trigger)
   - Added `getAnchorUpdateStatus()` method (diagnostics)

2. **`server/src/agent/orchestrator.ts`**
   - Integrated `checkAndUpdateAnchors()` call in post-processing
   - Runs asynchronously after mood updates

3. **`server/src/routes/index.ts`**
   - Added `/api/personality/anchor-status` endpoint
   - Added `/api/personality/update-anchors` endpoint

### Code Flow

```typescript
// In orchestrator.ts postProcess()
await personalityEngine.updateMood(...);

// New: Check anchor updates (async)
personalityEngine.checkAndUpdateAnchors().catch(err => {
  console.error('[Orchestrator] Anchor update check failed:', err);
});
```

## Testing the System

### Method 1: Natural Conversation
1. Have 5+ deep conversations with Evelyn
2. Share vulnerable or meaningful content
3. Check anchor status: `GET /api/personality/anchor-status`
4. When `newEvidenceCount >= 5`, next conversation triggers update

### Method 2: Manual Trigger (Testing)
```bash
# Check current status
curl http://localhost:3001/api/personality/anchor-status

# Manually trigger if conditions are met
curl -X POST http://localhost:3001/api/personality/update-anchors

# View updated personality
curl http://localhost:3001/api/personality
```

### Method 3: Create Test Memories
Use the chat interface to have meaningful conversations that generate insight/relational memories. Check the Diagnostics panel to see memory creation in real-time.

## Benefits

### For Users
- ✅ **Truly adaptive companion** that grows with you
- ✅ **Meaningful relationship development** through genuine evolution
- ✅ **Consistent core personality** with room for growth
- ✅ **Transparent changes** (logged and tracked)

### For Developers
- ✅ **Automatic operation** (no manual intervention)
- ✅ **Safe constraints** (gradual, justified changes)
- ✅ **Full observability** (logs, APIs, database tracking)
- ✅ **Easy testing** (manual trigger endpoint)

## Future Enhancements

### Potential Additions
- **UI Notifications**: Alert user when personality evolves
- **Update History**: Track all changes over time
- **Evidence Viewer**: Show which memories influenced which traits
- **Customizable Thresholds**: Let users adjust sensitivity
- **Rollback Capability**: Undo recent changes if needed

### Advanced Features
- **Trait Relationships**: Some traits influence others
- **Context-Aware Updates**: Different update rules for different conversation types
- **Personality Profiles**: Save/load personality snapshots
- **Multi-User Adaptation**: Different personalities for different users

## Summary

Evelyn now has a **comprehensive, production-ready personality evolution system** that:

1. ✅ **Automatically triggers** based on evidence accumulation
2. ✅ **Safely constrains** changes to prevent instability
3. ✅ **Transparently logs** all updates
4. ✅ **Persists** to SQLite database
5. ✅ **Provides APIs** for monitoring and testing
6. ✅ **Integrates seamlessly** with existing conversation flow

The system makes Evelyn a **truly adaptive AI companion** that grows through meaningful interactions while maintaining her core personality. Each conversation contributes to her evolution, creating a unique relationship that deepens over time.

