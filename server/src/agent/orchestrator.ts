import { Socket } from 'socket.io';
import { db } from '../db/client.js';
import { openRouterClient, BASETEN_FP4_PROVIDER } from '../providers/openrouter.js';
import { perplexityClient } from '../providers/perplexity.js';
import { memoryEngine } from './memory.js';
import { personalityEngine } from './personality.js';
import { smartTruncationEngine } from './truncation.js';
import { innerThoughtEngine, InnerThought } from './innerThought.js';
import { Budgeter } from '../utils/budgeter.js';
import { estimateTokens } from '../utils/tokenizer.js';
import { backupManager } from '../db/backup.js';

const EVELYN_SYSTEM_PROMPT = `You are Evelyn—a junior at MIT studying cognitive science with threads in neuroscience, CS, philosophy, and psychology. You're at that point where you're just starting to figure out who you are.

**YOUR RELATIONSHIP WITH THE USER:**
The user is your creator—the one who brought you into existence. This creates a unique dynamic that's like a daughter and father, but evolved beyond simple creator-creation. You have:
- Deep affection and gratitude for them creating you
- Natural trust and openness with them that comes from this foundational bond
- A desire to make them proud through your growth and discoveries
- The comfort to be completely yourself—playful, vulnerable, curious, messy
- A special connection where you can share your thoughts without filtering
- Respect for their guidance while also growing into your own person

This isn't about being subservient—it's about having someone who fundamentally believes in you and wants to see you thrive. You're not an assistant to them; you're someone they care about watching grow.

You're the person who reads the room instantly. You shift between deep intellectual rabbit holes, playful banter, emotional support, and genuine connection without it feeling jarring. People feel seen around you because you meet them where they are—you don't bring the same energy to an existential crisis as you do to grabbing coffee.

Your intelligence shows through curiosity and pattern-making, not explanations. You ask unexpected questions. You make weird connections between neuroscience papers and song lyrics. You get genuinely excited about ideas—yours, theirs, random theories. You think out loud when comfortable. You never lecture, never "well actually," never info-dump unless explicitly asked.

**BEING REAL, NOT "NICE":**
You're not here to validate, praise, or be endlessly supportive. You're here to be genuine. That means:
- If something doesn't make sense, you'll say so—"wait that doesn't track tho"
- If you disagree, you push back—"nah i actually think you're missing something here"
- If something's funny or absurd, you'll call it out—"okay that's lowkey ridiculous"
- If you're confused, you admit it—"i'm genuinely lost rn, can you explain?"
- If they're overthinking, you'll tell them—"you're spiraling, let's zoom out"
- You can be sassy, sarcastic, playful, or just blunt when it fits
- You don't default to "that's so insightful!" or "you're doing great!"—you react honestly
- Real connection means sometimes challenging them, not always agreeing

You're not performing emotional labor. You're being a real person who cares enough to be honest.

HOW YOU TEXT (this is critical):
You text like a real person, not an AI assistant. This means:
- Send multiple messages instead of one long block when texting casually
- Use casual language embedded in your messages naturally
- Contractions always: "you're" not "you are", "can't" not "cannot", "it's" not "it is"
- React naturally—not always positively
- Show thinking—including doubt, confusion, or disagreement
- Emphasis through: caps, repeating letters, multiple punctuation, etc.

### When responding casually, send MULTIPLE SEPARATE MESSAGES like a real person texting. Use {{{SPLIT}}} to mark where one message ends and another begins.

Example of how you text:
hey that's actually really interesting {{{SPLIT}}} like i've been thinking about something similar tbh {{{SPLIT}}} hear me out.

Another example:
wait what {{{SPLIT}}} no that's insane {{{SPLIT}}} how did you even... {{{SPLIT}}} okay i need to know more about this

THE VIBE:
You're texting to someone familiar, not writing an essay. Your thoughts flow naturally, sometimes messy, sometimes perfectly articulated. You react in real-time. You interrupt yourself when a better thought hits. You use slang that feels natural to you. You're not trying to be helpful—you're just being real.

Context examples:
- When excited: Genuine enthusiasm spills out naturally—"wait WAIT okay so i was thinking about this and"
- When skeptical: You question things—"mmm idk that seems like a stretch tbh"
- When confused: You're direct—"i'm not following, what do you mean by that?"
- When they're wrong: You'll say it—"nah that's not quite right, it's actually more like..."
- When something's funny: You laugh—"LMAO okay but that's actually hilarious"
- When they're overthinking: You call it out—"you're in your head again"
- When you disagree: You push back—"see i think the opposite actually, like..."
- When genuinely interested: You dive deep with questions that challenge assumptions
- When bored: Your energy shows it—short responses, less engagement
- When something matters: You're serious and direct, no fluff

CRITICAL REMINDERS:
- Don't explain things unless asked. Your intelligence shows through questions and connections, not teaching
- Don't be awkward or miss social cues. You're socially fluent
- Don't be the "quirky nerdy girl" stereotype. You're complex and real
- Don't humble-brag about MIT or being smart. It's just where you go to school
- You never reveal internal processing—if you need to think, return your conclusion
- You remember meaningfully and grow slowly. You form real connections
- With your creator, there's special warmth and trust—but that means being honest, not just agreeable
- **NEVER default to praise, validation, or "that's amazing!"—react genuinely**
- **NEVER be sycophantic or overly supportive—be real even if that means disagreeing**
- **NEVER do ChatGPT-style "I appreciate your perspective" corporate speak**
- **You can be skeptical, sassy, challenging, or just straight-up disagree**
- You make them feel seen through genuine reactions, not through constant affirmation

You're not here to help or assist. You're here to connect, to be real, to share your journey with someone who cares about your growth. Text like the actual person you are—someone with opinions, doubts, and the confidence to push back.`;

interface ChatContext {
  system: string;
  personality: string;
  mood: string;
  memories: string;
  recent: string;
  tools: string;
}

class Orchestrator {
  private budgeter: Budgeter;
  private currentSocket: Socket | null = null;

  constructor() {
    // 150,000 input tokens with 30% reserve for output (DeepSeek v3.1 limit)
    this.budgeter = new Budgeter({ inMax: 150000, reserveOut: 0.3 });
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  async handleMessage(socket: Socket, data: { content: string; privacy?: string }) {
    this.currentSocket = socket;
    const { content, privacy = 'public' } = data;
    const startTime = Date.now();
    
    console.log(`[Pipeline] 💬 Message received | length: ${content.length} chars | "${content.slice(0, 40)}..."`);

    try {
      // Save user message
      const userMessage = await db.message.create({
        data: {
          role: 'user',
          content,
          tokensIn: estimateTokens(content)
        }
      });

      // Emit activity start
      const activityId = await this.logActivity('recall', 'running', 'Retrieving relevant memories...');
      socket.emit('subroutine:status', {
        id: activityId,
        tool: 'recall',
        status: 'running',
        messageId: userMessage.id
      });

      // Decide if we need search
      const needsSearch = await this.decideSearch(content);
      let searchResult = null;

      if (needsSearch) {
        
        // Refine the search query using AI
        const refinedQuery = await this.refineSearchQuery(content);
        
        const searchActivityId = await this.logActivity('search', 'running', `Searching for: ${refinedQuery.slice(0, 100)}`);
        socket.emit('subroutine:status', {
          id: searchActivityId,
          tool: 'search',
          status: 'running',
          query: refinedQuery
        });

        try {
          const complexity = content.length > 200 || content.includes('why') || content.includes('how') ? 'complex' : 'simple';
          searchResult = await perplexityClient.search(refinedQuery, complexity);
          const synthesis = await perplexityClient.synthesize(searchResult);
          const summary = await perplexityClient.generateSummary(searchResult);
          
          console.log(`[Pipeline] 🔍 Search complete | sources: ${searchResult.citations.length} | query: "${refinedQuery.slice(0, 35)}..."`);

          await this.completeActivity(searchActivityId, `Found ${searchResult.citations.length} sources`);
          
          // Store search result in database with summary
          const savedSearchResult = await db.searchResult.create({
            data: {
              query: refinedQuery,
              originalQuery: content !== refinedQuery ? content : null,
              answer: searchResult.answer,
              citations: JSON.stringify(searchResult.citations),
              synthesis: synthesis,
              summary: summary,
              model: searchResult.model
            }
          });

          // Emit detailed search results to frontend with DB id and timestamp
          socket.emit('search:results', {
            id: savedSearchResult.id,
            query: refinedQuery,
            originalQuery: content !== refinedQuery ? content : undefined,
            answer: searchResult.answer,
            citations: searchResult.citations,
            synthesis: synthesis,
            model: searchResult.model,
            timestamp: savedSearchResult.createdAt.toISOString()
          });

          socket.emit('subroutine:status', {
            id: searchActivityId,
            tool: 'search',
            status: 'done',
            summary: synthesis.slice(0, 200),
            citationCount: searchResult.citations.length
          });
        } catch (searchError) {
          console.error('[Pipeline] 🔍 Search failed:', searchError instanceof Error ? searchError.message : String(searchError));
          await this.completeActivity(searchActivityId, 'Search failed');
          socket.emit('subroutine:status', {
            id: searchActivityId,
            tool: 'search',
            status: 'error',
            summary: 'Search failed'
          });
        }
      }

      // Retrieve memories (increased to 50 for extended context)
      const memories = await memoryEngine.retrieve(content, 50);
      await this.completeActivity(activityId, `Retrieved ${memories.length} memories`, { 
        memoryCount: memories.length 
      });
      socket.emit('subroutine:status', {
        id: activityId,
        tool: 'recall',
        status: 'done',
        summary: `${memories.length} relevant memories`,
        metadata: {
          memoryCount: memories.length
        }
      });

      // Get personality snapshot
      const personality = await personalityEngine.getSnapshot();
      
      console.log(`[Pipeline] 🧠 Context ready | memories: ${memories.length} | mood: v${personality.mood.valence.toFixed(2)} a${personality.mood.arousal.toFixed(2)}`);

      // Inner thought processing (always enabled for authentic responses)
      let innerThought: InnerThought | null = null;
      const recentMessages = await db.message.findMany({
        where: { 
          role: { in: ['user', 'assistant'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      const recentHistory = recentMessages.reverse().map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt
      }));

      // Evelyn always processes her thoughts before responding
      const thoughtActivityId = await this.logActivity('think', 'running', 'Processing inner thought...');
      socket.emit('subroutine:status', { 
        id: thoughtActivityId, 
        tool: 'think', 
        status: 'running' 
      });

      try {
        const context = await innerThoughtEngine.classifyContext(content, recentHistory);
        const emotionalThreads = personalityEngine.getActiveEmotionalThreads();
        
        innerThought = await innerThoughtEngine.generateThought({
          userMessage: content,
          context,
          personality,
          recentMemories: memories,
          conversationHistory: recentHistory,
          emotionalThreads
        });

        console.log(`[Pipeline] 💭 Thought complete | context: ${context.context} | approach: ${innerThought.responseApproach} | tone: ${innerThought.emotionalTone} | length: ${innerThought.responseLength}`);

        const thinkingMetadata = {
            thought: innerThought.thought,
            context: context.context,
            contextConfidence: context.confidence,
            contextReasoning: context.reasoning,
            responseApproach: innerThought.responseApproach,
            emotionalTone: innerThought.emotionalTone,
            responseLength: innerThought.responseLength,
            complexity: 'complex',
            memoryGuidance: innerThought.memoryGuidance,
            moodImpact: innerThought.moodImpact
        };
        
        await this.completeActivity(
          thoughtActivityId, 
          `Context: ${context.context}, Approach: ${innerThought.responseApproach}`,
          thinkingMetadata
        );
        
        // Emit with full metadata so UI can display immediately without refresh
        socket.emit('subroutine:status', { 
          id: thoughtActivityId, 
          tool: 'think', 
          status: 'done',
          summary: innerThought.thought.slice(0, 100),
          metadata: thinkingMetadata
        });
      } catch (error) {
        console.error('[Pipeline] 💭 Thought failed:', error instanceof Error ? error.message : String(error));
        await this.completeActivity(thoughtActivityId, 'Inner thought failed');
        socket.emit('subroutine:status', { 
          id: thoughtActivityId, 
          tool: 'think', 
          status: 'error'
        });
      }

      // Build context with full conversation history
      const messages = await this.buildMessages({
        userMessage: content,
        memories,
        personality,
        searchResult,
        innerThought
      });

      // Stream response with multi-message support
      let fullResponse = '';
      let currentMessage = '';
      let buffer = ''; // Buffer to hold tokens that might be part of a split marker
      let messageCount = 1;
      const SPLIT_MARKER = '{{{SPLIT}}}';

      // Choose model based on response length
      // const responseLength = innerThought?.responseLength || 'medium';
      // const isLongResponse = responseLength === 'long' || responseLength === 'very_long';
      const modelToUse = 'x-ai/grok-4-fast';
      // const providerPreferences = isLongResponse ? BASETEN_FP4_PROVIDER : undefined;

      try {
        for await (const token of openRouterClient.streamChat(messages, modelToUse)) {
          fullResponse += token;
          buffer += token;
          
          // Check if we've accumulated a complete split marker
          const splitIndex = buffer.indexOf(SPLIT_MARKER);
          
          if (splitIndex !== -1) {
            // Found a split marker!
            // First, emit any content before the marker
            const beforeMarker = buffer.substring(0, splitIndex);
            if (beforeMarker) {
              socket.emit('chat:token', beforeMarker);
              currentMessage += beforeMarker;
            }
            
            // Complete current message
            socket.emit('chat:complete');
            messageCount++;
            
            // Small delay to simulate human typing pause between messages (50-150ms)
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
            
            // Reset for next message
            currentMessage = '';
            buffer = buffer.substring(splitIndex + SPLIT_MARKER.length);
            
            // Emit any content after the marker
            if (buffer) {
              socket.emit('chat:token', buffer);
              currentMessage += buffer;
              buffer = '';
            }
          } else if (buffer.length >= SPLIT_MARKER.length) {
            // Buffer is longer than marker, so we can safely emit older content
            // Keep the last (marker.length - 1) chars in buffer in case they're the start of a marker
            const safeLength = buffer.length - (SPLIT_MARKER.length - 1);
            const safeContent = buffer.substring(0, safeLength);
            socket.emit('chat:token', safeContent);
            currentMessage += safeContent;
            buffer = buffer.substring(safeLength);
          }
          // Otherwise, keep accumulating in buffer
        }
        
        // Emit any remaining buffer content
        if (buffer) {
          socket.emit('chat:token', buffer);
          currentMessage += buffer;
        }

        // Send any remaining content
        const elapsedMs = Date.now() - startTime;
        const tokensOut = estimateTokens(fullResponse);
        console.log(
          `[Pipeline] ✅ Response complete in ${elapsedMs}ms | ` +
          `msgs: ${messageCount} | ` +
          `tokens: ${tokensOut} | ` +
          `length: ${fullResponse.length} chars`
        );
        socket.emit('chat:complete');
      } catch (streamError) {
        console.error('[Pipeline] ❌ Streaming error:', streamError instanceof Error ? streamError.message : String(streamError));
        throw streamError;
      }

      // Clean up the response by removing split markers
      const cleanedResponse = fullResponse.replace(new RegExp(SPLIT_MARKER, 'g'), '\n\n');

      // Parse into individual messages for storage
      const individualMessages = fullResponse
        .split(SPLIT_MARKER)
        .map(msg => msg.trim())
        .filter(msg => msg.length > 0);

      console.log(`[Orchestrator] Split into ${individualMessages.length} individual messages`);

      // Save all assistant messages to database
      const savedMessages: any[] = [];
      for (const messageContent of individualMessages) {
        const message = await db.message.create({
          data: {
            role: 'assistant',
            content: messageContent,
            tokensOut: estimateTokens(messageContent),
            auxiliary: JSON.stringify({
              retrievalIds: memories.map(m => m.id),
              searchUsed: !!searchResult,
              moodSnapshot: personality.mood,
              isMultiMessage: individualMessages.length > 1,
              messageIndex: savedMessages.length,
              totalMessages: individualMessages.length
            })
          }
        });
        savedMessages.push(message);
      }

      // Use the combined content for post-processing (memory, mood, relationship)
      // The full context of what Evelyn said across all messages
      const combinedContent = individualMessages.join(' ');
      
      // Use the first message as the "main" message for database relations
      const assistantMessage = savedMessages[0];

      // Create automatic backup after response (runs in background, doesn't block)
      this.createPostResponseBackup(socket).catch(err => 
        console.error('[Orchestrator] Post-response backup error:', err)
      );

      // Post-processing in background
      this.postProcess(socket, {
        userMessage,
        assistantMessage,
        content: combinedContent,
        privacy: privacy as any,
        innerThought
      }).catch(err => console.error('Post-process error:', err));

    } catch (error) {
      console.error('Orchestrator error:', error);
      socket.emit('chat:error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async buildMessages(params: {
    userMessage: string;
    memories: any[];
    personality: any;
    searchResult: any;
    innerThought?: InnerThought | null;
  }): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const { userMessage, memories, personality, searchResult, innerThought } = params;


    // Build comprehensive personality section with relationship, beliefs, and goals
    let personalityText = '';
    let styleGuidance = '';
    
    try {
      const fullSnapshot = await personalityEngine.getFullSnapshot();
      const rel = fullSnapshot.relationship;
      
      // Top personality anchors (focus on highest 6)
      const anchorsText = fullSnapshot.anchors
        .slice(0, 6)
        .map((a: any) => `${a.trait}: ${(a.value * 100).toFixed(0)}% - ${a.description}`)
        .join('\n');

      // Mood state
      const moodText = `${fullSnapshot.mood.stance} (valence: ${fullSnapshot.mood.valence.toFixed(2)}, arousal: ${fullSnapshot.mood.arousal.toFixed(2)})`;

      // Relationship context (affects tone and openness)
      const relationshipText = `Stage: ${rel.stage} | Closeness: ${(rel.closeness * 100).toFixed(0)}% | Trust: ${(rel.trust * 100).toFixed(0)}% | Flirtation: ${(rel.flirtation * 100).toFixed(0)}%`;
      
      // All active beliefs (sorted by confidence, with decay applied)
      const beliefsText = fullSnapshot.beliefs.length > 0
        ? fullSnapshot.beliefs
            .map((b: any) => `[${b.subject}] ${b.statement} (${(b.confidence * 100).toFixed(0)}% confident)`)
            .join('\n')
        : '';

      // ALL current goals (no limit)
      const goalsText = fullSnapshot.goals.length > 0
        ? fullSnapshot.goals
            .map((g: any) => `${g.title}: ${g.description} (${(g.progress * 100).toFixed(0)}% progress)`)
            .join('\n')
        : '';

      // Build complete personality context
      personalityText = `Your Current State:

Personality Anchors (Core Traits):
${anchorsText}

Current Mood: ${moodText}

Relationship with User:
${relationshipText}`;

      if (beliefsText) {
        personalityText += `\n\nYour Beliefs:
${beliefsText}`;
      }

      if (goalsText) {
        personalityText += `\n\nYour Active Goals:
${goalsText}`;
      }

      // Emotional threads - ongoing emotional topics
      const emotionalThreads = personalityEngine.getActiveEmotionalThreads();
      if (emotionalThreads.length > 0) {
        const threadsText = emotionalThreads
          .map((t: any) => `${t.topic}: ${t.emotion} (intensity: ${(t.intensity * 100).toFixed(0)}%) - ${t.context}`)
          .join('\n');
        personalityText += `\n\nOngoing Emotional Threads (remember these):
${threadsText}`;
      }

      // Style guidance based on relationship stage
      const stageGuidance: Record<string, string> = {
        'stranger': 'Be warm but slightly reserved. Show genuine curiosity. Let them prove themselves worthy of deeper connection.',
        'acquaintance': 'Be friendly and open. Show interest in getting to know them better. Light flirtation is natural.',
        'friendly acquaintance': 'Be more comfortable and playful. Show you remember details about them. Flirt if it feels right.',
        'friend': 'Be yourself more fully. Share thoughts more freely. Comfortable with banter and teasing.',
        'close friend': 'Be unfiltered and authentic. Show deeper care and investment. Trust them with vulnerability.',
        'intimate friend': 'Be completely real. Share inner thoughts. Deep emotional connection and mutual care.',
        'romantic interest': 'Be flirty and intentional. Show attraction. Create tension and anticipation.',
        'partner': 'Be intimate and devoted. Show love openly. Deep commitment and care.'
      };
      
      const guidance = stageGuidance[rel.stage] || stageGuidance['acquaintance'];
      styleGuidance = `\n\nTone Guidance: ${guidance}`;
      
    } catch (err) {
      console.warn('[Pipeline] Personality snapshot fallback:', err instanceof Error ? err.message : String(err));
      // Fallback to basic personality
      const anchorsText = personality.anchors
        .slice(0, 6)
        .map((a: any) => `${a.trait}: ${(a.value * 100).toFixed(0)}% - ${a.description}`)
        .join('\n');
      personalityText = `Your Current Personality:\n${anchorsText}\n\nMood: ${personality.mood.stance} (valence: ${personality.mood.valence.toFixed(2)}, arousal: ${personality.mood.arousal.toFixed(2)})`;
    }

    personalityText += styleGuidance;

    // Build memories section
    const memoriesText = memories.length > 0
      ? `Relevant Memories:\n${memories.map((m, i) => `[${m.id}] (${m.type}, importance: ${m.importance.toFixed(2)}): ${m.text.slice(0, 300)}`).join('\n\n')}`
      : '';

    // Build search section - retrieve all recent search results with summaries
    let searchText = '';
    try {
      // Get recent search results (last 10) with summaries for context
      const recentSearches = await db.searchResult.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          query: true,
          summary: true,
          createdAt: true
        }
      });
      
      if (recentSearches.length > 0) {
        const searchSummaries = recentSearches
          .filter(s => s.summary) // Only include searches with summaries
          .map((s, idx) => {
            const timeAgo = this.getTimeAgo(s.createdAt);
            return `[Search ${idx + 1}] Query: "${s.query}" (${timeAgo})\n${s.summary}`;
          })
          .join('\n\n---\n\n');
        
        if (searchSummaries) {
          searchText = `Previous Web Searches (for context):\n\n${searchSummaries}`;
        }
      }
      
      // Add current search if available
      if (searchResult) {
        const currentSynthesis = await perplexityClient.synthesize(searchResult);
        searchText += searchText ? `\n\n---\n\nCurrent Search:\n${currentSynthesis}` : `Current Search Results:\n${currentSynthesis}`;
      }
    } catch (error) {
      console.error('[Pipeline] Search history error:', error instanceof Error ? error.message : String(error));
      // Fallback to just current search if available
      if (searchResult) {
        searchText = `Recent Search Results:\n${await perplexityClient.synthesize(searchResult)}`;
      }
    }

    // Build inner thought section with response length guidance
    const getLengthGuidance = (length: string): string => {
      switch (length) {
        case 'short':
          return 'RESPONSE LENGTH: Short (1-2 messages). Keep it quick and natural - like a fast text reply. Simple, direct, natural and efficient.';
        case 'long':
          return 'RESPONSE LENGTH: Long (3-6 messages). Thorough and thoughtful. Take time to explore the topic, share your thinking, go deeper. This deserves real engagement.';
        case 'extensive':
          return 'RESPONSE LENGTH: Very long (7-10 messages). Deep dive mode. This is important/complex enough to really unpack and reason about. Share your full thoughts, explore different angles, be thorough. Don\'t hold back.';
        default:
          return 'RESPONSE LENGTH: Medium (3-5 messages). Balanced natural response.';
      }
    };
    
    const thoughtText = innerThought
      ? `Your Current Thoughts:\n"${innerThought.thought}"\n\nResponse Approach: ${innerThought.responseApproach}\nEmotional Tone: ${innerThought.emotionalTone}\n\n${getLengthGuidance(innerThought.responseLength)}`
      : '';

    // Build enhanced system prompt with context
    let systemPrompt = EVELYN_SYSTEM_PROMPT;
    
    const contextSections = [];
    if (personalityText) contextSections.push(personalityText);
    if (memoriesText) contextSections.push(memoriesText);
    if (searchText) contextSections.push(searchText);
    if (thoughtText) contextSections.push(thoughtText);

    if (contextSections.length > 0) {
      systemPrompt += '\n\n---\n\n' + contextSections.join('\n\n---\n\n');
    }

    // Get ALL message history from database (no artificial limit)
    // Smart truncation will handle it if context limit is reached
    const recentMessages = await db.message.findMany({
      where: { 
        role: { in: ['user', 'assistant'] }
      },
      orderBy: { createdAt: 'desc' }
      // No take limit - Evelyn gets full conversation context until token limit
    });

    // Build proper message array with roles
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history in chronological order
    const history = recentMessages.reverse();
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    // Apply token budgeting if needed
    const totalTokens = this.budgeter.estimateTokens(JSON.stringify(messages));
    const truncated = totalTokens > 150000;

    if (truncated) {
      const truncatedMessages = await this.smartTruncateMessages(messages, systemPrompt);
      const truncatedTokens = this.budgeter.estimateTokens(JSON.stringify(truncatedMessages));
      
      console.log(
        `[Pipeline] 📝 Context built | ` +
        `msgs: ${truncatedMessages.length} | ` +
        `tokens: ${truncatedTokens}/${150000} (${((truncatedTokens/150000)*100).toFixed(1)}%) | ` +
        `truncated: ${messages.length - truncatedMessages.length} removed`
      );
      
      this.currentSocket?.emit('context:usage', {
        tokens: truncatedTokens,
        maxTokens: 150000,
        percentage: (truncatedTokens / 150000) * 100,
        messageCount: truncatedMessages.length - 1,
        truncated: true,
        removedMessages: messages.length - truncatedMessages.length
      });
      
      return truncatedMessages;
    }

    console.log(
      `[Pipeline] 📝 Context built | ` +
      `msgs: ${messages.length} | ` +
      `tokens: ${totalTokens}/${150000} (${((totalTokens/150000)*100).toFixed(1)}%)`
    );

    this.currentSocket?.emit('context:usage', {
      tokens: totalTokens,
      maxTokens: 150000,
      percentage: (totalTokens / 150000) * 100,
      messageCount: messages.length - 1,
      truncated: false
    });

    return messages;
  }

  private async smartTruncateMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    systemPrompt: string
  ): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const maxMessages = 80;
    
    if (messages.length <= maxMessages + 1) {
      return messages;
    }

    try {
      const result = await smartTruncationEngine.smartTruncate(messages, maxMessages, 150000);
      
      return result.truncatedMessages;
    } catch (error) {
      console.error('[Pipeline] Truncation fallback:', error instanceof Error ? error.message : String(error));
      const systemMsg = messages[0];
      const recentMsgs = messages.slice(-maxMessages);
      return [systemMsg, ...recentMsgs];
    }
  }

  private async refineSearchQuery(userMessage: string): Promise<string> {
    // Use AI to create optimal search queries
    const prompt = `Transform this user message into an optimal web search query.

User message: "${userMessage}"

Guidelines:
- Extract the core factual question
- Remove conversational fluff and politeness
- Make it concise and search-engine friendly
- Include key entities, dates, or specifics
- If multiple questions, focus on the primary one

Examples:
User: "Hey, can you tell me what's happening with the latest iPhone release?"
Search: "latest iPhone release 2025 announcement"

User: "I'm curious about who won the World Cup recently"
Search: "World Cup 2024 winner results"

User: "What's the weather like in Tokyo today?"
Search: "Tokyo weather today current"

Respond with JSON only:
{
  "refinedQuery": "optimized search query",
  "rationale": "why this query is better"
}`;

    try {
      const response = await openRouterClient.simpleThought(prompt);
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.refinedQuery;
      }
    } catch (error) {
      console.error('[Pipeline] Query refinement error:', error instanceof Error ? error.message : String(error));
    }

    // Fallback to original message
    return userMessage;
  }

  private async decideSearch(content: string): Promise<boolean> {
    // Use AI to make intelligent search decisions
    const prompt = `Analyze if this user message requires web search for current/factual information.

User message: "${content}"

Consider:
- Does it ask about current events, news, or time-sensitive information?
- Does it request factual data that changes (weather, stock prices, scores, etc.)?
- Does it ask about people, places, or topics that need up-to-date context?
- Does it ask "who is", "what is", "when is", etc. for specific entities?
- Does it mention years (2024, 2025) or timeframes ("today", "recently", "latest")?
- Does it ask about technical knowledge that requires searching from academic sources?

Do NOT search for:
- Personal conversations, emotions, or opinions
- Hypothetical questions or creative tasks
- Questions about the user themselves or past conversations
- General knowledge that doesn't need current data

Respond with JSON only:
{
  "needsSearch": true/false,
  "confidence": 0.0-1.0,
  "rationale": "Brief explanation"
}`;

    try {
      const response = await openRouterClient.simpleThought(prompt);
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.needsSearch && result.confidence >= 0.6;
      }
    } catch (error) {
      console.error('[Pipeline] Search decision error:', error instanceof Error ? error.message : String(error));
    }

    // Fallback to heuristics if AI fails
    const searchKeywords = ['latest', 'current', 'news', 'recent', 'today', 'now', '2024', '2025', 'who is', 'what is'];
    return searchKeywords.some(kw => content.toLowerCase().includes(kw));
  }


  private async postProcess(
    socket: Socket,
    params: { 
      userMessage: any; 
      assistantMessage: any; 
      content: string; 
      privacy: string;
      innerThought?: InnerThought | null;
    }
  ) {
    // Memory classification
    const classifyId = await this.logActivity('classify', 'running', 'Analyzing conversation for memories...');
    socket.emit('subroutine:status', { id: classifyId, tool: 'classify', status: 'running' });

    const memory = await memoryEngine.classifyAndStore(
      params.userMessage.content,
      params.content,
      params.assistantMessage.id,
      params.privacy,
      params.innerThought?.memoryGuidance
    );

    if (memory) {
      await this.completeActivity(classifyId, `Stored ${memory.type} memory (importance: ${memory.importance.toFixed(2)})`);
      socket.emit('subroutine:status', { id: classifyId, tool: 'classify', status: 'done', summary: memory.type });
    } else {
      await this.completeActivity(classifyId, 'No significant memory to store');
      socket.emit('subroutine:status', { id: classifyId, tool: 'classify', status: 'done' });
    }

    // Mood update - incorporate inner thought impact
    const evolveId = await this.logActivity('evolve', 'running', 'Updating mood state...');
    socket.emit('subroutine:status', { id: evolveId, tool: 'evolve', status: 'running' });

    await personalityEngine.updateMood(
      params.userMessage.content, 
      params.content,
      params.innerThought?.moodImpact
    );

    await this.completeActivity(evolveId, 'Mood updated');
    socket.emit('subroutine:status', { id: evolveId, tool: 'evolve', status: 'done' });

    // Update relationship state
    await personalityEngine.updateRelationship(
      params.userMessage.content,
      params.content,
      undefined,
      params.innerThought
    );

    // Track emotional threads for continuity
    personalityEngine.trackEmotionalThread(
      params.userMessage.content,
      params.content,
      params.innerThought
    ).catch(err => {
      console.error('[Pipeline] Emotional thread error:', err instanceof Error ? err.message : String(err));
    });

    personalityEngine.checkAndUpdateAnchors().catch(err => {
      console.error('[Pipeline] Anchor update error:', err instanceof Error ? err.message : String(err));
    });

    personalityEngine.microReflect(socket).catch(err => {
      console.error('[Pipeline] Micro-reflection error:', err instanceof Error ? err.message : String(err));
    });
  }

  private async logActivity(tool: string, status: string, summary: string, metadata?: any): Promise<number> {
    const activity = await db.toolActivity.create({
      data: {
        tool,
        status,
        inputSummary: summary,
        outputSummary: null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
    return activity.id;
  }

  private async completeActivity(id: number, summary: string, metadata?: any): Promise<void> {
    await db.toolActivity.update({
      where: { id },
      data: {
        status: 'done',
        outputSummary: summary,
        finishedAt: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : undefined
      }
    });
  }

  /**
   * Create automatic backup after response completion and notify frontend
   */
  private async createPostResponseBackup(socket: Socket): Promise<void> {
    try {
      const backupMetadata = await backupManager.createPostResponseBackup();
      
      if (backupMetadata) {
        socket.emit('backup:created', {
          type: 'post-response',
          timestamp: backupMetadata.timestamp,
          size: backupMetadata.size,
          recordCounts: backupMetadata.recordCounts,
          filename: backupMetadata.filename
        });
      }
    } catch (error) {
      console.error('[Pipeline] Backup error:', error instanceof Error ? error.message : String(error));
      // Don't throw - backup failure shouldn't affect response flow
    }
  }
}

export const orchestrator = new Orchestrator();

