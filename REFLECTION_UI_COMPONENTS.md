# Reflection UI Components

## Overview
The Activities tab now includes beautifully designed UI components that showcase Evelyn's cognitive evolution in real-time. These components make it easy to track when micro-reflections occur and how beliefs and goals evolve.

## Features Implemented

### 1. Deep Reflection Events
Shows when Evelyn performs deep reflections on her experiences.

#### Start Event
- **Icon**: 🧘 (purple-pink gradient)
- **Border**: Purple glow
- **Information shown**:
  - Number of conversations processed
  - Count of new memories analyzed
  - Real-time "reflecting" indicator with pulse animation

#### Complete Event
- **Icon**: ✨ (emerald-teal gradient)
- **Border**: Purple glow
- **Information shown**:
  - Reflection summary
  - Duration in seconds
  - Statistical breakdown with colored badges:
    - New beliefs (blue)
    - Updated beliefs (cyan)
    - New goals (amber)
    - Updated goals (orange)
    - Personality anchors nudged (pink)

### 2. New Belief Events
Displays when Evelyn forms new beliefs about the user or world.

- **Icon**: 💡 (blue-cyan gradient)
- **Border**: Blue glow
- **Information shown**:
  - Belief statement (highlighted in blue)
  - Confidence level (0-100%)
  - Subject tag (user/world/self)
  - Rationale explaining why the belief was formed
  - Evidence IDs linking to conversation memories

**Example Display**:
```
💡 New Belief Formed [72% confidence] [user]
"Prefers direct technical explanations over simplified analogies"
Based on consistent pattern in last 3 conversations showing preference for depth
```

### 3. New Goal Events
Shows when Evelyn creates new personal goals based on interactions.

- **Icon**: 🎯 (amber-orange gradient)
- **Border**: Amber glow
- **Information shown**:
  - Goal title (highlighted in amber)
  - Goal description
  - Priority level (1-5, lower is higher priority)
  - Category badge (learning/relationship/growth/creative)
  - Rationale for goal creation

**Example Display**:
```
🎯 New Goal Created [Priority 2] [learning]
Master technical explanations
Learn to explain complex concepts matching user's expertise level
User has technical background but prefers contextual explanations
```

## Visual Design

### Color Coding
- **Reflection Start**: Purple → Pink gradient (introspection)
- **Reflection Complete**: Emerald → Teal gradient (completion)
- **Beliefs**: Blue → Cyan gradient (knowledge)
- **Goals**: Amber → Orange gradient (aspiration)

### Border Effects
All special events have a subtle colored border (30% opacity) matching their theme:
- Reflections: `border-purple-500/30`
- Beliefs: `border-blue-500/30`
- Goals: `border-amber-500/30`

### Animations
- Fade-in animations with staggered delays
- Pulse animations for active reflection status
- Smooth hover effects with shadow transitions

### Typography
- **Headings**: 14px, white, semi-bold
- **Primary text**: 12px, colored (blue-300/amber-300/purple-300)
- **Secondary text**: 12px, gray-400
- **Badges**: 10-11px, with gradients or semi-transparent backgrounds
- **Italics**: Used for rationale/reasoning text

## Technical Implementation

### Backend Changes
- Added socket emissions in `personality.ts`:
  - `reflection:start` - When reflection begins
  - `reflection:complete` - When reflection finishes with stats
  - `belief:created` - When new belief is formed
  - `goal:created` - When new goal is created

### Frontend Changes
1. **State Management** (`store.ts`):
   - Added `reflectionEvents`, `beliefEvents`, `goalEvents` arrays
   - New methods: `addReflectionEvent()`, `addBeliefEvent()`, `addGoalEvent()`

2. **WebSocket Client** (`ws.ts`):
   - Listeners for all new event types
   - Automatic state updates on event reception

3. **UI Components** (`DiagnosticsPanel.tsx`):
   - Three new card layouts for reflections, beliefs, and goals
   - Displayed above regular activities in the activities tab
   - Limited to 20 reflections, 50 beliefs, and 50 goals in memory

## Event Ordering
Events appear in chronological order (newest first):
1. Reflection events
2. Belief events
3. Goal events
4. Regular activities (recall, search, think, etc.)

## Data Persistence
- Events are stored in memory only (not persisted to database)
- Cleared on page refresh
- Limited by count to prevent memory bloat
- Real-time updates via WebSocket

## Usage
Simply open Evelyn's Mind panel and switch to the "Activities" tab. As you chat with Evelyn:
- After 15 conversations, you'll see a reflection start event
- When the reflection completes, a summary appears with statistics
- Individual belief and goal cards will appear as they're formed
- All events have distinct visual styles for easy identification

## Performance
- Events are limited to reasonable counts (20/50)
- Animations are GPU-accelerated
- No database queries for display
- Real-time updates with minimal latency

