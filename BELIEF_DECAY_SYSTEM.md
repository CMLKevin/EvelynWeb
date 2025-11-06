# Belief Decay System

## Overview

Evelyn's belief system now includes a **14-day half-life decay mechanism** to ensure that beliefs remain current and relevant. This prevents outdated beliefs from persisting indefinitely and encourages the system to periodically reinforce important beliefs through conversation.

## How It Works

### Decay Formula

```
decayedConfidence = originalConfidence × 0.5^(daysSinceUpdate / 14)
```

Where:
- `originalConfidence`: The stored confidence value (0.0 to 1.0)
- `daysSinceUpdate`: Number of days since the belief was last updated
- `14`: Half-life in days (after 14 days, confidence is reduced by 50%)

### Examples

| Days Since Update | Original Confidence | Decayed Confidence | % Retained |
|-------------------|--------------------|--------------------|------------|
| 0 days            | 0.80               | 0.80               | 100%       |
| 7 days            | 0.80               | 0.68               | 84%        |
| 14 days           | 0.80               | 0.40               | 50%        |
| 28 days           | 0.80               | 0.20               | 25%        |
| 42 days           | 0.80               | 0.10               | 12.5%      |

### Decay Timeline

```
100% │████████████████████████████████████████████████
     │
 75% │███████████████████████████████▓▓▓▓▓▓▓▓▓
     │
 50% │████████████████████▒▒▒▒▒▒▒▒
     │
 25% │██████████░░░░
     │
  0% └─────────────────────────────────────────────────
     0d    7d    14d    21d    28d    35d    42d
```

## Benefits

1. **Recency Bias**: Recently confirmed beliefs carry more weight than old assumptions
2. **Adaptive Learning**: Forces the system to periodically re-evaluate and reinforce important beliefs
3. **Natural Forgetting**: Mimics human memory where unused information gradually fades
4. **Context Awareness**: Beliefs that aren't reinforced naturally lose influence over time

## Implementation Details

### When Decay is Applied

- **At Read Time**: Decay is calculated dynamically when beliefs are loaded via `getFullSnapshot()`
- **Non-Destructive**: Original confidence values are preserved in the database
- **Transparent**: The `originalConfidence` field is included alongside `confidence` for debugging

### Where Decay is Used

1. **Chat Context**: All beliefs (with decay applied) are included in Evelyn's system prompt
2. **API Endpoints**: `/api/personality` and `/api/persona` return beliefs with decayed confidence
3. **Reflection System**: Micro and deep reflections see current decayed values

### Logging

When a belief experiences significant decay (>10% confidence loss), it's logged:

```
[Personality] Belief decay: "User values direct feedback..." 72% → 48% (21.3 days)
```

## Reinforcement Strategy

The reflection system is aware of decay and includes this guidance:

> **NOTE**: Belief confidence naturally decays with a 14-day half-life. Reinforce important beliefs periodically through updates to maintain their strength.

This encourages Evelyn to:
- Update beliefs when they're confirmed in conversation
- Let less relevant beliefs naturally fade
- Maintain high confidence in frequently validated beliefs

## All Beliefs & Goals in Context

Additionally, **ALL beliefs and goals** are now included in the chat context (previously limited to top 5 goals). This ensures Evelyn has complete awareness of her belief system and objectives during every conversation.

### Before:
- Beliefs: All included ✓
- Goals: Top 5 only ✗

### After:
- Beliefs: All included (with decay) ✓
- Goals: All included ✓

## Testing

To verify the decay system is working:

```bash
# Check current belief confidence values
curl -s "http://localhost:3001/api/persona" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Beliefs:', len(data['beliefs']))
print('Goals:', len(data['goals']))
for b in data['beliefs'][:3]:
    print(f'  - {b[\"statement\"][:50]}... {b[\"confidence\"]:.3f}')
"
```

## Future Enhancements

Possible improvements:
- Configurable half-life per belief type (e.g., shorter for preferences, longer for personality traits)
- Automatic cleanup of beliefs below a confidence threshold (e.g., < 0.1)
- Decay visualization in the diagnostics panel
- Historical decay tracking in evolution events

