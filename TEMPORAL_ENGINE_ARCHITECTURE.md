# Temporal Engine Architecture

## Overview

The **Temporal Engine** is Evelyn's centralized system clock management system that ensures all time-dependent subsystems are synchronized and correctly calculate their values based on real system time, regardless of when the server was last restarted or how long it has been offline.

## Design Philosophy

### Problem Statement

Before the Temporal Engine, Evelyn's time-dependent systems had several issues:

1. **Inconsistent calculations**: Each subsystem implemented its own time-based decay logic
2. **Initialization gaps**: If the server was down for hours/days, time-dependent values weren't recalculated on startup
3. **Scattered logic**: Decay calculations were duplicated across multiple files
4. **No centralized monitoring**: No way to see the state of all temporal systems at once

### Solution

The Temporal Engine provides:

1. **Single Source of Truth**: All time calculations use system clock consistently
2. **Startup Recalculation**: On server init, all time-dependent values are recalculated
3. **Centralized Logic**: All decay formulas in one place
4. **Observable**: API endpoint to inspect temporal state

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TEMPORAL ENGINE                         │
│                  (System Clock Manager)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Configuration & Constants                  │ │
│  │  • Mood half-life: 30 minutes                          │ │
│  │  • Belief half-life: 14 days                           │ │
│  │  • Memory recency: 30 days                             │ │
│  │  • Thresholds & baselines                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Mood Decay  │  │Belief Decay │  │ Memory Recency   │   │
│  │             │  │             │  │                  │   │
│  │ 30m half-   │  │ 14d half-   │  │ 30d exponential  │   │
│  │ life toward │  │ life with   │  │ decay for        │   │
│  │ baseline    │  │ read-time   │  │ scoring boost    │   │
│  │             │  │ calculation │  │                  │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Initialization Sequence                    │ │
│  │  1. Calculate mood decay                                │ │
│  │  2. Calculate belief decay                              │ │
│  │  3. Analyze memory recency                              │ │
│  │  4. Report statistics                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                │                 │
         ▼                ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ personality  │ │ personality  │ │   memory     │
│ .ts          │ │ .ts          │ │   .ts        │
│              │ │              │ │              │
│ applyMood    │ │ getFullSnap  │ │ recall()     │
│ Decay()      │ │ shot()       │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Time-Dependent Systems

### 1. Mood Decay (30-minute half-life)

**Purpose**: Emotional states gradually return to baseline over time.

**Configuration**:
```typescript
MOOD_HALF_LIFE_MINUTES: 30
MOOD_BASELINE_VALENCE: 0.2
MOOD_BASELINE_AROUSAL: 0.4
MOOD_MIN_DECAY_INTERVAL_MINUTES: 5
MOOD_SIGNIFICANT_CHANGE_THRESHOLD: 0.05
```

**Formula**:
```
decayFactor = 0.5^(minutesElapsed / 30)
newValence = baseline + (current - baseline) × decayFactor
newArousal = baseline + (current - baseline) × decayFactor
```

**Behavior**:
- Calculated on every `getSnapshot()` call
- **Persisted** to database if change > 0.05
- Applied automatically on server startup
- After 30 minutes: 50% of emotional shift decays
- After 60 minutes: 75% decays
- After 90 minutes: 87.5% decays

**Example**:
```
Initial: valence = 0.8, arousal = 0.9
After 30 mins: valence = 0.5, arousal = 0.65
After 60 mins: valence = 0.35, arousal = 0.525
After 90 mins: valence = 0.275, arousal = 0.4625
```

### 2. Belief Decay (14-day half-life)

**Purpose**: Beliefs lose confidence over time if not reinforced.

**Configuration**:
```typescript
BELIEF_HALF_LIFE_DAYS: 14
BELIEF_SIGNIFICANT_DECAY_THRESHOLD: 0.10
```

**Formula**:
```
decayFactor = 0.5^(daysElapsed / 14)
newConfidence = originalConfidence × decayFactor
```

**Behavior**:
- Calculated at **read-time** (non-destructive)
- Original values preserved in database
- Applied in `getFullSnapshot()`
- Logged if decay > 10%
- After 14 days: 50% confidence retained
- After 28 days: 25% confidence retained
- After 42 days: 12.5% confidence retained

**Example**:
```
Belief: "User prefers direct communication" (85% confidence)
After 7 days: 71% (84% retained)
After 14 days: 42.5% (50% retained)
After 21 days: 24% (28% retained)
```

### 3. Memory Recency (30-day exponential decay)

**Purpose**: Recent memories get a scoring boost in retrieval.

**Configuration**:
```typescript
MEMORY_RECENCY_HALF_LIFE_DAYS: 30
```

**Formula**:
```
decayFactor = e^(-daysElapsed / 30)
recencyBoost = decayFactor × 0.2  // Max 20% boost
```

**Behavior**:
- Calculated at **query-time** during `recall()`
- No database updates
- Applied to retrieval scoring
- Fresh memories (< 7 days) get full boost
- Old memories (> 90 days) get minimal boost

**Example**:
```
Memory accessed yesterday: +20% boost
Memory accessed 1 week ago: +16% boost
Memory accessed 1 month ago: +7.4% boost
Memory accessed 3 months ago: +1% boost
```

## Server Initialization Flow

When the server starts, the Temporal Engine executes this sequence:

```
┌─────────────────────────────────────────┐
│  Server Start (httpServer.listen)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  temporalEngine.initialize()            │
│  ┌─────────────────────────────────┐   │
│  │ 1. Get system time              │   │
│  │ 2. Calculate mood decay         │   │
│  │ 3. Update DB if significant     │   │
│  │ 4. Calculate belief decay       │   │
│  │ 5. Analyze memory recency       │   │
│  │ 6. Log statistics               │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  initializeBackupSystem()               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  initializePersonaDefaults()            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  ✨ All systems initialized             │
└─────────────────────────────────────────┘
```

## API Reference

### GET /api/temporal/status

Returns the current state of all temporal systems.

**Response**:
```json
{
  "systemTime": "2025-11-06T04:49:55.496Z",
  "mood": {
    "valence": 0.2,
    "arousal": 0.4,
    "lastUpdate": "2025-11-05T01:01:57.259Z",
    "minutesSinceUpdate": "1668.0",
    "decayed": {
      "valence": 0.2,
      "arousal": 0.4,
      "elapsedMinutes": 1667.97,
      "decayApplied": true
    }
  },
  "beliefs": {
    "total": 13,
    "halfLife": "14 days"
  },
  "memoryRecency": {
    "total": 51,
    "halfLife": "30 days"
  }
}
```

## Integration Guide

### Using Mood Decay

```typescript
import temporalEngine from './core/temporalEngine.js';

// In personality.ts
private async applyMoodDecay(mood: Mood): Promise<Mood> {
  const now = new Date();
  const decayResult = temporalEngine.calculateMoodDecay(mood, now);
  
  if (decayResult.decayApplied) {
    // Update if change is significant
    if (valenceChange > 0.05 || arousalChange > 0.05) {
      // Persist to database
    }
  }
  
  return mood;
}
```

### Using Belief Decay

```typescript
import temporalEngine from './core/temporalEngine.js';

// In personality.ts
async getFullSnapshot(): Promise<FullPersonaSnapshot> {
  const now = new Date();
  
  const beliefsWithDecay = beliefs.map((b: any) => {
    const decayResult = temporalEngine.calculateBeliefDecay(
      b.confidence, 
      b.lastUpdateAt, 
      now
    );
    
    return {
      ...b,
      confidence: decayResult.confidence,
      originalConfidence: b.confidence
    };
  });
}
```

### Using Memory Recency

```typescript
import temporalEngine from './core/temporalEngine.js';

// In memory.ts
async recall(query: string, topK: number = 5): Promise<Memory[]> {
  const scored = candidates.map((m: any) => {
    const recencyResult = temporalEngine.calculateMemoryRecency(
      m.lastAccessedAt
    );
    
    const score = similarity * importance + recencyResult.recencyBoost;
    return { m, score };
  });
}
```

## Logging & Monitoring

### Startup Logs

```
╔════════════════════════════════════════════════════════════════╗
║        🕐 TEMPORAL ENGINE - System Clock Initialization       ║
╚════════════════════════════════════════════════════════════════╝

[Temporal] System time: 2025-11-06T04:49:35.561Z
[Temporal] Timezone: Asia/Shanghai

[Temporal] Calculating mood decay...
  ○ Mood decay calculated but change not significant enough to persist

[Temporal] Calculating belief decay...
  ✓ Belief decay calculated for 13 beliefs, 0 with significant decay (>10%)

[Temporal] Analyzing memory recency...
  ✓ Memory recency analyzed: 51 fresh, 0 recent, 0 aging, 0 old

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Temporal] Initialization complete in 29ms
[Temporal] Systems calculated: 3/3
[Temporal] Values updated: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Runtime Logs

```
[Personality] Belief decay: "User values direct feedback..." 72% → 48% (21.3 days)
```

## Benefits

### 1. Correctness

- ✅ All values calculated based on actual system time
- ✅ Server downtime doesn't break temporal logic
- ✅ Consistent behavior across restarts

### 2. Maintainability

- ✅ Single source of truth for all decay calculations
- ✅ Easy to adjust half-life parameters
- ✅ Centralized testing

### 3. Observability

- ✅ Startup initialization logs
- ✅ Runtime decay logs
- ✅ API endpoint for real-time status
- ✅ Statistics on memory distribution

### 4. Performance

- ✅ Efficient startup (< 50ms typical)
- ✅ No unnecessary database writes
- ✅ Read-time calculations where appropriate

## Testing

### Manual Testing

```bash
# Test API endpoint
curl http://localhost:3001/api/temporal/status | python3 -m json.tool

# Check startup logs
./start.sh | grep Temporal

# Test after server downtime
# 1. Stop server
./stop.sh

# 2. Wait several minutes
sleep 300

# 3. Start server and observe decay calculations
./start.sh
```

### Expected Behavior

**Scenario 1: Server restart after 1 hour**
- Mood: Significant decay applied and persisted
- Beliefs: Minimal decay (< 1% per belief)
- Memories: Negligible recency change

**Scenario 2: Server restart after 1 week**
- Mood: Full decay to baseline
- Beliefs: 29% decay (71% retained)
- Memories: Some shift from "fresh" to "recent"

**Scenario 3: Server restart after 1 month**
- Mood: Full decay to baseline
- Beliefs: 75% decay (25% retained)
- Memories: Significant shift to "aging" category

## Configuration

All temporal parameters can be adjusted in `temporalEngine.ts`:

```typescript
export const TEMPORAL_CONFIG = {
  // Adjust these values to tune behavior
  MOOD_HALF_LIFE_MINUTES: 30,           // Mood decay rate
  MOOD_BASELINE_VALENCE: 0.2,           // Neutral mood target
  MOOD_BASELINE_AROUSAL: 0.4,           // Neutral arousal target
  
  BELIEF_HALF_LIFE_DAYS: 14,            // Belief decay rate
  
  MEMORY_RECENCY_HALF_LIFE_DAYS: 30,    // Memory recency decay
} as const;
```

## Future Enhancements

Potential improvements:

1. **Adaptive Half-Lives**: Adjust decay rates based on conversation frequency
2. **Decay Visualization**: Frontend UI to show decay curves
3. **Scheduled Recalculation**: Periodic background recalculation without restart
4. **Decay History**: Track how values changed over time
5. **Custom Decay Curves**: Different curves for different belief types
6. **Decay Notifications**: Alert when beliefs drop below threshold

## File Structure

```
server/
├── src/
│   ├── core/
│   │   └── temporalEngine.ts       ← Core temporal logic
│   ├── agent/
│   │   ├── personality.ts          ← Uses mood & belief decay
│   │   └── memory.ts               ← Uses memory recency
│   ├── routes/
│   │   └── index.ts                ← Temporal status API
│   └── index.ts                    ← Initializes temporal engine
```

## Summary

The Temporal Engine ensures that Evelyn's perception of time is consistent, accurate, and based on the real system clock. All time-dependent subsystems now share a single source of truth, are correctly initialized on startup, and can be monitored via API. This architecture makes Evelyn's temporal cognition reliable and maintainable.

---

**Implementation Date:** November 6, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready

