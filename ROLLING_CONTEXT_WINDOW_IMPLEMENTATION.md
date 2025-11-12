# Rolling Context Window Implementation

## Summary
Successfully implemented a rolling context window of 150 messages for Evelyn's conversation history with visual indicators showing which messages are in the active context. This ensures consistent context size and prevents token overflow while maintaining optimal response quality.

## Update (Nov 12, 2025)
- **Removed smart truncation logic** - No longer needed with fixed 150-message window
- **Added message ID tracking** - Backend sends list of message IDs in the context window
- **Visual context indicators** - Messages in the rolling window have cyan border and "IN CONTEXT" badge
- **Repurposed UX** - Context usage indicator now shows rolling window status (X/150) instead of truncation warnings

## Changes Made

### 1. Database Query Modification (`orchestrator.ts` lines 639-647)
**Before:** Fetched ALL messages from database without limit
```typescript
const recentMessages = await db.message.findMany({
  where: { 
    role: { in: ['user', 'assistant'] }
  },
  orderBy: { createdAt: 'desc' }
  // No take limit - Evelyn gets full conversation context until token limit
});
```

**After:** Fetches only the most recent 150 messages
```typescript
const ROLLING_WINDOW_SIZE = 150;
const recentMessages = await db.message.findMany({
  where: { 
    role: { in: ['user', 'assistant'] }
  },
  orderBy: { createdAt: 'desc' },
  take: ROLLING_WINDOW_SIZE
});
```

### 2. System Prompt Enhancement (`orchestrator.ts` lines 636-637)
Added explicit notification to the AI model about the context window:
```typescript
systemPrompt += `\n\n---\n\nIMPORTANT CONTEXT WINDOW: You are receiving the most recent ${ROLLING_WINDOW_SIZE} messages from the conversation history (user + assistant messages combined). Older messages beyond this window are not included in this context, but important information from them has been preserved in your memories above. This rolling window ensures optimal response quality and prevents token overflow.`;
```

### 3. Enhanced Logging (`orchestrator.ts` lines 670-675)
**Before:** Generic context logging
```typescript
console.log(
  `[Pipeline] 📝 Context built | ` +
  `msgs: ${messages.length} | ` +
  `tokens: ${totalTokens}/${150000} (${((totalTokens/150000)*100).toFixed(1)}%)`
);
```

**After:** Clear rolling window status
```typescript
console.log(
  `[Pipeline] 📝 Rolling Context Window (${ROLLING_WINDOW_SIZE} msgs max) | ` +
  `current msgs: ${conversationMessageCount} | ` +
  `tokens: ${totalTokens}/${150000} (${((totalTokens/150000)*100).toFixed(1)}%) | ` +
  `window: ${conversationMessageCount >= ROLLING_WINDOW_SIZE ? 'FULL' : 'PARTIAL'}`
);
```

### 4. Socket Emission Updates (`orchestrator.ts` lines 678-686)
Enhanced context:usage emission with rolling window metadata:
```typescript
this.currentSocket?.emit('context:usage', {
  tokens: totalTokens,
  maxTokens: 150000,
  percentage: (totalTokens / 150000) * 100,
  messageCount: conversationMessageCount,
  rollingWindowSize: ROLLING_WINDOW_SIZE,  // NEW
  windowStatus: conversationMessageCount >= ROLLING_WINDOW_SIZE ? 'full' : 'partial',  // NEW
  truncated: false
});
```

### 5. Emergency Truncation Fallback (`orchestrator.ts` lines 688-709)
Kept safety mechanism in case 150 messages still exceed token limit (unlikely):
- Logs warning with "⚠️ Token overflow despite rolling window"
- Applies emergency truncation using existing smartTruncateMessages
- Updates socket emission with `windowStatus: 'emergency_truncated'`

## Key Benefits

1. **Predictable Context Size**: Always uses exactly 150 most recent messages (or fewer if conversation is shorter)
2. **Prevents Token Overflow**: 150 messages is well within the 150K token budget for most conversations
3. **Clear Communication**: The AI model is explicitly informed about the context window limitation
4. **Memory Preservation**: Older conversations are preserved through the memory system
5. **Frontend Visibility**: The rolling window status is communicated to the frontend via socket emissions
6. **Safety Fallback**: Emergency truncation still available if needed

## Testing Recommendations

1. **Short Conversations**: Test with < 150 messages to verify `windowStatus: 'partial'` works
2. **Full Window**: Test with exactly 150 messages to verify `windowStatus: 'full'` works
3. **Long Conversations**: Test with > 150 messages to verify only most recent 150 are used
4. **Log Verification**: Check console logs show "Rolling Context Window" messages
5. **Frontend Display**: Verify the frontend receives and displays rolling window information

## Technical Notes

- `ROLLING_WINDOW_SIZE = 150` constant is defined once at the start of `buildMessages()` method
- The count of 150 includes BOTH user and assistant messages combined
- The system message is NOT counted in the rolling window (it's always included)
- Database query uses `orderBy: { createdAt: 'desc' }` then reverses for chronological order
- Emergency truncation fallback retained but should rarely trigger with 150 message limit

---

## UX Enhancement Update (Nov 12, 2025)

### Backend Changes

#### 1. Removed Smart Truncation (`orchestrator.ts`)
**Deleted:**
- `smartTruncationEngine` import
- `smartTruncateMessages()` method (lines 696-716)
- Emergency truncation fallback logic

**Rationale:** With a fixed 150-message window, smart truncation is no longer needed. The rolling window provides consistent, predictable behavior.

#### 2. Message ID Tracking (`orchestrator.ts` lines 669-690)
**Added:**
```typescript
// Extract message IDs that are in the context window
const messageIdsInContext = recentMessages.map(msg => msg.id);

this.currentSocket?.emit('context:usage', {
  tokens: totalTokens,
  maxTokens: 150000,
  percentage: (totalTokens / 150000) * 100,
  messageCount: conversationMessageCount,
  rollingWindowSize: ROLLING_WINDOW_SIZE,
  windowStatus: conversationMessageCount >= ROLLING_WINDOW_SIZE ? 'full' : 'partial',
  messageIdsInContext: messageIdsInContext,  // NEW - Array of message IDs
  truncated: false
});
```

### Frontend Changes

#### 1. Store Interface Update (`store.ts`)
**Updated `ContextUsage` interface:**
```typescript
interface ContextUsage {
  tokens: number;
  maxTokens: number;
  percentage: number;
  messageCount: number;
  truncated: boolean;
  removedMessages?: number;
  rollingWindowSize?: number;        // NEW
  windowStatus?: 'full' | 'partial'; // NEW
  messageIdsInContext?: number[];    // NEW - Array of message IDs in context
  timestamp: string;
}
```

#### 2. Context Usage Indicator (`ContextUsageIndicator.tsx`)
**Removed:**
- Truncation alert popup
- "CONTEXT OPTIMIZED" warnings
- `AlertTriangle` icon for truncation

**Added:**
- Rolling window status badge: `X/150` messages
- Color-coded window status (cyan for partial, yellow for full)
- Tooltip showing:
  - Token usage
  - Messages in context (X / 150)
  - Window status (FULL/PARTIAL)
  - Rolling window explanation when full

**Visual Example:**
```
[████████░░] 45.2K / 150K  [75/150]
              ^tokens      ^messages in context
```

#### 3. Message List Visual Indicators (`MessageList.tsx`)
**Removed:**
- `TruncationIndicator` component and usage

**Added:**
- Visual indicators on each message:
  - **In Context:** Cyan left border (2px) + "IN CONTEXT" badge with Layers icon
  - **Not In Context:** Gray left border + 50% opacity (dimmed)

**Example Message Appearance:**
```
In Context:
┃  $ user  12:34:56  [IN CONTEXT 🗂️]
┃  Hello, how are you?
└─ cyan border, full opacity

Not In Context:
┃  $ user  10:15:30
┃  Earlier message...
└─ gray border, dimmed (50% opacity)
```

#### 4. Code Changes in MessageList
```typescript
// Get message IDs in context from store
const contextUsage = useStore(state => state.contextUsage);
const messageIdsInContext = contextUsage?.messageIdsInContext ?? [];

// Apply visual styling based on context status
<div className={`terminal-prompt ... ${
  messageIdsInContext.includes(msg.id) 
    ? 'border-l-2 border-l-cyan-500/50 pl-2'           // In context
    : 'opacity-50 border-l-2 border-l-gray-700/30 pl-2' // Not in context
}`}>

// Show "IN CONTEXT" badge
{messageIdsInContext.includes(msg.id) && (
  <span className="flex items-center gap-1 text-[9px] text-cyan-400">
    <Layers className="w-2.5 h-2.5" />
    <span>IN CONTEXT</span>
  </span>
)}
```

### User Experience Flow

1. **Visual Hierarchy:**
   - Messages in the rolling window are **bright and prominent** (100% opacity, cyan border)
   - Older messages outside the window are **dimmed** (50% opacity, gray border)
   - Clear visual separation helps users understand what Evelyn can "see"

2. **Context Awareness:**
   - Hovering over context indicator shows detailed window status
   - "IN CONTEXT" badges on recent messages provide at-a-glance confirmation
   - Window status (FULL/PARTIAL) indicates if the 150-message limit is reached

3. **No Disruptive Alerts:**
   - Removed popup warnings about truncation
   - Information is always available but non-intrusive
   - Focus stays on the conversation, not system mechanics

### Benefits of New UX

1. **Clarity:** Users can instantly see which messages Evelyn has in her active context
2. **Non-Intrusive:** No popup alerts or warnings interrupting the conversation flow
3. **Educational:** Visual indicators teach users about the rolling window naturally
4. **Predictable:** Consistent visual language (cyan = active, gray = archived)
5. **Performance:** No unnecessary component (TruncationIndicator) rendering

### Design Decisions

- **Why dim old messages?** Makes the active context window visually obvious without hiding historical messages
- **Why left border?** Provides clear visual boundary without being too prominent
- **Why "IN CONTEXT" badge?** Explicit confirmation for users learning the system
- **Why no truncation warnings?** With fixed 150-message window, truncation is expected behavior, not an exception

### Bug Fix: Greyed Out Messages (Nov 12, 2025)

**Issue:** All messages appeared greyed out on page load because the context indicator logic was applied before context data was received from the server.

**Root Cause:** 
```typescript
// Before fix - this always evaluated to false when array is empty
messageIdsInContext.includes(msg.id) // [] includes anything = false
// Result: ALL messages got the "not in context" styling (opacity-50)
```

**Solution:**
Added a guard to only apply context styling when we have valid context data:

```typescript
// Check if we have context data
const hasContextData = messageIdsInContext.length > 0;

// Apply styling conditionally
className={`... ${
  hasContextData
    ? messageIdsInContext.includes(msg.id)
      ? 'border-l-2 border-l-cyan-500/50 pl-2' // In context
      : 'opacity-50 border-l-2 border-l-gray-700/30 pl-2' // Not in context
    : '' // No styling - show normally until context data arrives
}`}
```

**Behavior:**
- **Before context loads:** All messages display normally (no dimming)
- **After context loads:** Messages are styled based on whether they're in the rolling window
- **Result:** Messages start bright and remain bright until the backend sends context data
