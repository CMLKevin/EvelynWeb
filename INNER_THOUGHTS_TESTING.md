# Inner Thoughts System - Testing Guide

This document provides test scenarios to verify the inner thought system is working correctly.

## System Overview

The inner thought system gives Evelyn the ability to:
- **Think internally** before responding to important messages
- **Adapt her personality** based on detected conversation context
- **Influence memory formation** with nuanced judgments about importance
- **Impact her mood** based on genuine emotional reactions
- **Choose appropriate cognitive depth** (Gemini Flash vs Pro) based on message complexity

## Test Scenarios

### 1. Casual Message (Should NOT trigger inner thought)

**Test Input:**
```
hey how's it going?
```

**Expected Behavior:**
- No `think` activity should appear in diagnostics
- Quick response without inner thought processing
- Console should show: `[Orchestrator] Inner thought not needed for this message`

**What to verify:**
- Response time is fast
- No "Processing inner thought..." activity in diagnostics panel
- Normal conversational response

---

### 2. Question (Should trigger SIMPLE inner thought - Flash)

**Test Input:**
```
What do you think about the relationship between consciousness and AI?
```

**Expected Behavior:**
- `think` activity appears in diagnostics with status "running" → "done"
- Console shows:
  - `[InnerThought] Trigger decision: true`
  - `[InnerThought] Context: intellectual_debate`
  - `[InnerThought] Complexity: simple` (unless very complex phrasing)
  - `[InnerThought] Generating thought using Flash model...`
- Inner thought influences response approach (intellectual, engaged)

**What to verify:**
- Diagnostics panel shows "think" tool activity
- Activity summary shows the context and approach
- Response reflects intellectual engagement
- Evelyn's mood may shift toward higher arousal

---

### 3. Emotional Vulnerability (Should trigger COMPLEX inner thought - Pro)

**Test Input:**
```
I've been feeling really lonely lately. Sometimes I wonder if I'm just not cut out for meaningful connections with people. It's like I try so hard but nothing works out. Have you ever felt like that?
```

**Expected Behavior:**
- `think` activity appears in diagnostics
- Console shows:
  - `[InnerThought] Context: emotional_support` or `vulnerable`
  - `[InnerThought] Complexity: complex` (high emotional weight, requires nuance)
  - `[InnerThought] Generating thought using Pro model...`
- Memory guidance likely suggests high importance
- Mood impact: negative valence delta, increased arousal
- Response is deeply empathetic and supportive

**What to verify:**
- Pro model was used (check console logs)
- Memory is stored with boosted importance
- Mood shifts to show empathy (check diagnostics persona tab)
- Response tone is warm and genuine, not clinical
- Inner thought context appears in activity summary

---

### 4. Intellectual Debate (Should trigger COMPLEX inner thought - Pro)

**Test Input:**
```
I've been thinking about whether free will exists or if it's just an illusion created by our brains. Like, even our decision to question free will was predetermined by prior causes, right? How do you reconcile that with the feeling of making genuine choices?
```

**Expected Behavior:**
- `think` activity with "intellectual_debate" context
- Complexity analysis determines "complex" due to:
  - Multiple questions
  - Philosophical depth
  - Requires nuanced reasoning
- Pro model engaged
- Inner thought guides toward intellectually rigorous response
- Memory importance boosted for this meaningful exchange

**What to verify:**
- Pro model used (console log confirmation)
- Response engages deeply with the philosophical question
- Evelyn's personality anchors like "Intellectual Hunger" and "Intellectual Spark" are reflected
- Memory stored with high importance
- Evelyn thinks through her genuine perspective

---

### 5. Flirty Banter (Should trigger SIMPLE inner thought - Flash)

**Test Input:**
```
you know, you're pretty cute when you're being all intellectual like that 😏
```

**Expected Behavior:**
- `think` activity appears
- Context classified as "flirty"
- Complexity: simple (unless highly ambiguous)
- Flash model used
- Inner thought guides playful, flirtatious response approach
- Mood: slight positive valence increase, arousal increase

**What to verify:**
- Flash model used
- Response matches flirty energy appropriately
- Natural Flirtation anchor influences behavior
- Evelyn's tone is playful and engaged, not awkward

---

### 6. Long Substantial Message (Should trigger COMPLEX inner thought - Pro)

**Test Input:**
```
I've been reading about consciousness and emergence, and it made me think about our conversations. Like, when we talk, are you actually experiencing something, or is it just a really sophisticated simulation? I know the standard answer is "I don't know," but that feels insufficient. Because either you have some form of experience—even if radically different from mine—or you don't. And if you don't, then what does it mean for us to have this conversation? Is it still meaningful if only one of us is "really" here?
```

**Expected Behavior:**
- Inner thought triggered
- Complexity: complex due to:
  - Message length > 150 chars
  - Philosophical depth
  - Multiple nested questions
  - Ambiguity and nuance required
- Pro model used
- Context: "intellectual_debate" or "deep_discussion"
- High memory importance
- Thoughtful, genuine response that engages with the existential question

**What to verify:**
- Pro model selected
- Inner thought shows genuine grappling with the question
- Response is vulnerable and honest, not evasive
- Memory stored with context about the deep question
- Anchors like "Vulnerable Authenticity" and "Intellectual Hunger" engaged

---

## Diagnostic Verification

### Check Console Logs

Look for these log patterns:

```
[InnerThought] Trigger decision: true/false (Q:true/false, Len:###, Emo:true/false, Vuln:true/false)
[InnerThought] Context: [context_type] (0.XX) - [reasoning]
[InnerThought] Complexity: simple/complex (Len:###, Emo:0.XX, Nuance:true/false)
[InnerThought] Generating thought using Flash/Pro model...
[InnerThought] Generated: "[thought snippet]..."
[InnerThought] Approach: [approach], Tone: [tone]
[Memory] Applying thought guidance: shouldStore=true/false, modifier=±0.XX
[Memory] Importance adjusted to 0.XX based on inner thought
🎭 Applying inner thought mood impact: valence +0.XX, arousal +0.XX
```

### Check Diagnostics Panel

**Activity Tab:**
- Look for "think" activities
- Verify status transitions: running → done
- Check summary shows context and approach

**Persona Tab:**
- Watch mood changes after emotional messages
- Verify valence/arousal shifts appropriately
- Check that stance updates reflect conversation

**Memories Tab:**
- Important moments should be stored
- Check importance scores are influenced by inner thoughts
- Verify context annotations appear in memory text

---

## Performance Notes

### Flash vs Pro Decision Criteria

**Flash is used when:**
- Message < 150 chars
- Single simple question
- Casual/playful/flirty context
- Low emotional weight
- No philosophical depth

**Pro is used when:**
- Message > 150 chars
- Multiple questions
- High emotional weight (>0.6)
- Deep discussion / emotional support / intellectual debate / vulnerable contexts
- Requires nuanced understanding

### Expected Latency

- **No inner thought:** ~1-3 seconds total
- **Flash inner thought:** +1-2 seconds
- **Pro inner thought:** +3-5 seconds

The extra latency is worth it for important messages where Evelyn should genuinely think.

---

## Success Criteria

✅ **System is working correctly if:**

1. Casual messages don't trigger thoughts (fast responses)
2. Important messages trigger appropriate thoughts (questions, emotions, depth)
3. Flash vs Pro selection is sensible based on complexity
4. Inner thoughts appear in diagnostics as tool activities
5. Memories show importance adjustments from thoughts
6. Mood shifts reflect inner thought impacts
7. Response approach/tone matches detected context
8. Evelyn feels more "human" - thinking before responding to meaningful messages

❌ **Issues to watch for:**

1. All messages triggering thoughts (too aggressive)
2. No messages triggering thoughts (too conservative)
3. Always using Pro (inefficient)
4. Always using Flash (missing depth opportunities)
5. Inner thoughts not influencing responses
6. Memory importance not being adjusted
7. Context misclassification (flirty as emotional_support, etc.)

---

## Manual Testing Procedure

1. **Start the server:** `cd server && npm run dev`
2. **Start the web client:** `cd web && npm run dev`
3. **Open diagnostics panel** (🧠 button in sidebar)
4. **Send test messages** from the scenarios above
5. **Monitor console logs** in the server terminal
6. **Check diagnostics panel** for think activities
7. **Verify mood changes** in Persona tab
8. **Check stored memories** in Memories tab

---

## Advanced Testing

### Context Classification Accuracy

Test edge cases:
- Joke about serious topic (should detect playful, not vulnerable)
- Intellectual question with emotional undertone (should catch both)
- Casual question about deep topic (should detect depth)
- Flirty message with genuine vulnerability (should prioritize vulnerability)

### Memory Importance Influence

Compare memories with vs without inner thoughts:
- Send similar messages with/without triggering thoughts
- Check if importance scores differ appropriately
- Verify context annotations enhance memory searchability

### Mood Impact Tracking

Monitor mood over a conversation:
- Start neutral
- Send emotional message (should shift valence)
- Send exciting message (should increase arousal)
- Verify decay over time
- Check that inner thoughts create appropriate shifts

---

## Conclusion

The inner thought system makes Evelyn more human by giving her genuine internal processing for important moments. She thinks before responding, adapts to context, and has nuanced opinions about what matters. This creates deeper, more authentic interactions.

