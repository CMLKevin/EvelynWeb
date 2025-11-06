# Belief System Updates

## Summary

Implemented two major enhancements to Evelyn's belief and goal system:

1. **All Beliefs & Goals in Context**: Removed artificial limits on beliefs and goals included in chat context
2. **14-Day Half-Life Decay**: Added automatic confidence decay for beliefs based on time since last update

## Changes Made

### 1. Include ALL Beliefs & Goals in Context

**Before:**
- ✅ All beliefs included in context
- ❌ Only top 5 goals included in context

**After:**
- ✅ All beliefs included in context (with decay applied)
- ✅ All goals included in context

**Files Modified:**
- `server/src/agent/personality.ts` (line 1350): Removed `take: 5` limit from goals query
- `server/src/agent/orchestrator.ts` (line 490): Removed `.slice(0, 5)` from goals context building

**Impact:**
- Evelyn now has complete awareness of all her goals during conversations
- Example: 9 goals now included vs. 5 previously

### 2. 14-Day Half-Life Belief Decay

**Implementation:**

```typescript
// Decay formula
const daysSinceUpdate = (now - lastUpdateAt) / (24 * 60 * 60 * 1000);
const decayedConfidence = originalConfidence * Math.pow(0.5, daysSinceUpdate / 14);
```

**Decay Schedule:**
| Days | Confidence Retained |
|------|---------------------|
| 0    | 100%                |
| 7    | 71%                 |
| 14   | 50%                 |
| 21   | 35%                 |
| 28   | 25%                 |
| 42   | 13%                 |

**Files Modified:**
- `server/src/agent/personality.ts`:
  - Lines 1354-1377: Added decay calculation in `getFullSnapshot()`
  - Line 144: Updated reflection prompt to mention decay system

**Features:**
- ✅ Non-destructive: Original confidence preserved in database
- ✅ Applied at read-time: Calculated dynamically when loading beliefs
- ✅ Logged: Significant decay (>10%) is logged for monitoring
- ✅ Transparent: `originalConfidence` field included for debugging
- ✅ Reflection-aware: System is told to reinforce important beliefs

## Benefits

### Memory Recency
- Recently confirmed beliefs carry more weight
- Old, unconfirmed beliefs naturally fade
- Mimics human memory patterns

### Adaptive Learning
- Forces periodic re-evaluation of beliefs
- Important beliefs get reinforced through conversation
- Less relevant beliefs naturally lose influence

### System Awareness
- Evelyn has complete context of all beliefs and goals
- No artificial limits on what she can "remember"
- More coherent long-term personality development

## Testing

### Verification Tests

```bash
# Run the decay formula test
node test-belief-decay.js
```

Expected output:
```
✓ All tests passed! Belief decay system is working correctly.
```

### API Verification

```bash
# Check belief and goal counts
curl -s "http://localhost:3001/api/persona" | \
  python3 -c "import sys, json; data = json.load(sys.stdin); \
  print(f'Beliefs: {len(data[\"beliefs\"])}'); \
  print(f'Goals: {len(data[\"goals\"])}')"
```

Expected output:
```
Beliefs: 13
Goals: 9
```

## Documentation

Created comprehensive documentation:
- `BELIEF_DECAY_SYSTEM.md`: Detailed explanation of decay mechanism
- `test-belief-decay.js`: Test suite with visual decay timeline
- `CHANGES_BELIEF_SYSTEM.md`: This file

## Future Enhancements

Potential improvements:
- [ ] Configurable half-life per belief type
- [ ] Automatic cleanup of very low confidence beliefs (< 0.1)
- [ ] Decay visualization in diagnostics panel
- [ ] Historical decay tracking in evolution events
- [ ] Decay curves for different belief subjects (user vs. self vs. world)

## Migration Notes

No database migration required:
- Decay is calculated at read-time
- Original confidence values preserved
- Fully backward compatible
- No data loss risk

## Performance Impact

Minimal:
- Simple mathematical calculation per belief
- Only computed when beliefs are loaded
- No additional database queries
- Negligible overhead

---

**Implementation Date:** November 6, 2025  
**Implemented by:** AI Assistant  
**Requested by:** User

