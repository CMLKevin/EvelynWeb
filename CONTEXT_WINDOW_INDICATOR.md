# Context Window Usage Indicator - Documentation

## Overview

A beautiful, minimalistic UI component that shows Evelyn's context window usage in real-time and clearly alerts users when conversation history is truncated.

## Features

### 1. **Minimalistic Token Usage Display**

**Location:** Top-right of chat window header (next to Evelyn's name and status)

**Design:**
- Compact horizontal bar showing token usage
- Color-coded by usage level:
  - 🟢 Green (0-50%): Plenty of room
  - 🟡 Yellow (50-75%): Moderate usage
  - 🟠 Amber (75-90%): Getting full
  - 🔴 Red (90-100%): Near limit
- Displays tokens in thousands (e.g., "45.2K / 128K")
- Smooth transitions and gradients

**Visual Design:**
```
[████████░░░░░░░░] 45.2K / 128K
```

### 2. **Hover Tooltip**

**Appears on hover** - Shows detailed information:
- Context Window percentage
- Exact token count
- Number of messages in context
- Truncation status if applicable

**Example:**
```
┌─────────────────────────┐
│ Context Window    45.3% │
│ Tokens Used      58,012 │
│ Messages              47 │
│                          │
│ ⚠️ Optimized             │
│ 23 messages saved        │
│ to memory                │
└─────────────────────────┘
```

### 3. **Truncation Alert**

**Appears when truncation occurs** - Beautiful notification that:
- Slides in from top center
- Stays for 8 seconds
- Explains what happened
- Shows number of messages saved
- Can be dismissed early

**Alert Design:**
```
╔══════════════════════════════════════════╗
║ ⚠️  Context Window Optimized             ║
║                                          ║
║ Evelyn condensed the conversation to    ║
║ fit her memory. 23 older messages were  ║
║ saved to long-term memory and removed   ║
║ from active context.                    ║
║                                      [×] ║
╚══════════════════════════════════════════╝
```

## How It Works

### Backend Integration

**File:** `server/src/agent/orchestrator.ts`

**Token calculation:**
1. Builds full message array with personality, memories, search, thoughts
2. Estimates total tokens using Budgeter
3. If > 128,000 tokens → triggers smart truncation
4. Emits `context:usage` event via WebSocket

**Data emitted:**
```typescript
{
  tokens: 58012,           // Total tokens in context
  maxTokens: 128000,       // Maximum allowed
  percentage: 45.3,        // Usage percentage
  messageCount: 47,        // Number of messages
  truncated: false,        // Whether truncation occurred
  removedMessages?: 23     // How many messages removed (if truncated)
}
```

### Frontend Integration

**Files Modified:**
1. `web/src/lib/ws.ts` - Receives `context:usage` events
2. `web/src/state/store.ts` - Stores context usage state
3. `web/src/components/common/ContextUsageIndicator.tsx` - NEW component
4. `web/src/components/chat/ChatWindow.tsx` - Added to header

**Real-time updates:**
- Every message triggers context calculation
- WebSocket pushes usage to frontend
- Component updates immediately
- Smooth animations on all changes

## Visual States

### State 1: Low Usage (0-50%)
```
[████░░░░░░░░░░░░] 25.4K / 128K  🟢
```
- Green gradient bar
- No warnings
- Plenty of context available

### State 2: Moderate Usage (50-75%)
```
[█████████░░░░░░░] 72.1K / 128K  🟡
```
- Yellow gradient bar
- Still safe
- Shows healthy conversation length

### State 3: High Usage (75-90%)
```
[████████████░░░░] 98.5K / 128K  🟠
```
- Amber gradient bar
- Approaching limit
- Truncation may occur soon

### State 4: Critical Usage (90-100%)
```
[███████████████░] 115K / 128K   🔴
```
- Red gradient bar
- Near limit
- Truncation imminent or occurring

### State 5: After Truncation
```
[█████████░░░░░░░] 68.2K / 128K  🟠 ⚠️
```
- Amber gradient bar
- Warning icon showing truncation occurred
- Hover to see details
- Alert notification appeared

## User Experience

### Normal Conversation Flow

1. **Start chatting** - Bar is green, low percentage
2. **Conversation grows** - Bar fills gradually, turns yellow
3. **Long conversation** - Bar turns amber as approaching limit
4. **Context optimizes** - Alert appears explaining truncation
5. **Continue chatting** - Bar resets to moderate level

### What Users Learn

- **Context window concept** - See how much "memory" Evelyn has active
- **Token economics** - Understand the technical constraints
- **Truncation benefits** - Smart system saves important messages
- **No data loss** - Reassurance that nothing is forgotten

## Technical Details

### Token Estimation

Uses the `Budgeter` class which:
- Estimates ~1.3 tokens per word
- Accounts for message overhead
- Includes system prompt, memories, search, thoughts
- Real-time calculation on every message

### Truncation Strategy

When limit exceeded:
1. **Score all messages** for importance (AI-powered)
2. **Keep 60%** most recent messages
3. **Keep 40%** highest-scored earlier messages
4. **Save high-value messages** as memories before removing
5. **Emit alert** with removed count
6. **Maintain context continuity**

### Performance Impact

**Minimal:**
- Single WebSocket event per message (~100 bytes)
- Local state update (instant)
- CSS transitions (GPU-accelerated)
- Hover tooltip (conditional render)

## Styling

### Colors

**Usage levels:**
- 0-50%: Green (#10b981 → #059669)
- 50-75%: Yellow (#eab308 → #f59e0b)
- 75-90%: Amber (#f59e0b → #ea580c)
- 90-100%: Red (#ef4444 → #ec4899)

**Design elements:**
- Glassmorphic container
- Smooth gradients
- Fade-in animations
- Hover effects

### Responsive Design

- Desktop: Full bar + text
- Tablet: Compact bar
- Mobile: Icon only (future enhancement)

## Integration with Diagnostics

The context usage is also visible in:
- **Activities tab** - Shows when truncation occurs as a system event
- **Thoughts tab** - Inner thoughts affected by available context
- **Console logs** - Detailed truncation statistics

## Testing

### Test Scenarios

**Test 1: Normal Usage**
1. Start fresh conversation
2. Send 5-10 messages
3. Check indicator shows green, low percentage

**Test 2: Growing Context**
1. Continue conversation
2. Send 30-50 messages
3. Watch bar fill and change colors

**Test 3: Truncation**
1. Have very long conversation (100+ messages)
2. Wait for truncation to trigger
3. Verify alert appears
4. Check indicator shows warning icon
5. Hover to see removed message count

**Test 4: Hover Tooltip**
1. Hover over indicator
2. Verify tooltip shows:
   - Percentage
   - Token count
   - Message count
   - Truncation status

## User Benefits

1. **Transparency** - See exactly what's happening
2. **Understanding** - Learn about context windows
3. **Confidence** - Know truncation is smart, not random
4. **No surprises** - Clear alerts when optimization occurs
5. **Educational** - Gentle introduction to AI concepts

## Future Enhancements

Potential additions:
- Click to see truncation details
- History graph of context usage
- Predicted truncation warning
- Manual truncation trigger
- Context composition breakdown (memories, history, search, etc.)

## Summary

The context window indicator provides:
- ✅ Real-time token usage display
- ✅ Color-coded visual feedback
- ✅ Clear truncation alerts
- ✅ Detailed hover tooltips
- ✅ Minimalistic, unobtrusive design
- ✅ Educational for users
- ✅ Smooth animations and transitions

Users now have full visibility into Evelyn's context management with a beautiful, minimalistic interface that doesn't clutter the main chat experience.

