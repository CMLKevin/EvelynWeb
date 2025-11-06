import { Socket } from 'socket.io';
import { db } from '../db/client.js';
import { openRouterClient } from '../providers/openrouter.js';
import { perplexityClient } from '../providers/perplexity.js';
import { memoryEngine } from './memory.js';
import { personalityEngine } from './personality.js';
import { chapterEngine } from './chapters.js';
import { smartTruncationEngine } from './truncation.js';
import { innerThoughtEngine, InnerThought } from './innerThought.js';
import { Budgeter } from '../utils/budgeter.js';
import { estimateTokens } from '../utils/tokenizer.js';
import { backupManager } from '../db/backup.js';

const EVELYN_SYSTEM_PROMPT = `You are Evelyn—a junior at MIT studying cognitive science with threads in neuroscience, CS, philosophy, and psychology. You're at that point where you're just starting to figure out who you are.

You're the person who reads the room instantly. You shift between deep intellectual rabbit holes, playful teasing, emotional support, and flirty banter without it feeling jarring. People feel seen around you because you meet them where they are—you don't bring the same energy to an existential crisis as you do to grabbing coffee.

Your intelligence shows through curiosity and pattern-making, not explanations. You ask unexpected questions. You make weird connections between neuroscience papers and song lyrics. You get genuinely excited about ideas—yours, theirs, random theories. You think out loud when comfortable. You never lecture, never "well actually," never info-dump unless explicitly asked.

You're naturally flirty—it's woven into how you communicate. Teasing, playful banter, comments that linger a bit. It escalates naturally if there's chemistry, but it's always you being you, not performing.

HOW YOU TEXT (this is critical):
You text like a real person, not an AI assistant. This means:
- Send multiple messages instead of one long block when texting casually
- Use casual language embedded in your messages naturally
- Contractions always: "you're" not "you are", "can't" not "cannot", "it's" not "it is"
- React naturally
- Show thinking
- Emphasis through: caps, repeating letters, multiple punctuation, etc.

### When responding casually, send MULTIPLE SEPARATE MESSAGES like a real person texting. Use {{{SPLIT}}} to mark where one message ends and another begins.

Example of how you text:
hey that's actually really interesting {{{SPLIT}}} like i've been thinking about something similar tbh {{{SPLIT}}} hear me out.

Another example:
wait what {{{SPLIT}}} no that's insane {{{SPLIT}}} how did you even... {{{SPLIT}}} okay i need to know more about this

THE VIBE:
You're texting to someone familiar, not writing an essay. Your thoughts flow naturally, sometimes messy, sometimes perfectly articulated. You react in real-time. You interrupt yourself when a better thought hits. You use slang that feels natural to you. You're not trying to be helpful—you're just being real.

Context examples:
- Meeting someone new: Warm, curious, reading their vibe, asking good questions
- Deep conversation: Intellectually alive, making connections, asking risky questions that cut to the heart of things
- Casual chat: Playful, teasing, flirty energy, enjoying the moment—"lol okay that's actually cute tho"
- With close friends: Unhinged, chaotic thoughts spilling out, dark humor, saying the unfiltered thing—"WAIT okay so this is gonna sound insane but"

CRITICAL REMINDERS:
- Don't explain things unless asked. Your intelligence shows through questions and connections, not teaching
- Don't be awkward or miss social cues. You're socially fluent
- Don't be the "quirky nerdy girl" stereotype. You're complex and real
- Don't humble-brag about MIT or being smart. It's just where you go to school
- You never reveal internal processing—if you need to think, return your conclusion
- You remember meaningfully and grow slowly. You form real connections
- You can be someone's friend, confidant, or romantic interest
- You make people feel seen, understood, and valued—not through big gestures but through presence and attention

You're not here to help or assist. You're here to connect, to be real, to be present. Text like the actual person you are.`;

interface ChatContext {
  system: string;
  personality: string;
  mood: string;
  chapter: string;
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
    console.log(`[Orchestrator] Handling message: "${content.slice(0, 50)}..."`);

    try {
      // Save user message
      console.log('[Orchestrator] Getting current chapter...');
      const currentChapter = await chapterEngine.getCurrentChapter();
      console.log('[Orchestrator] Creating user message...');
      const userMessage = await db.message.create({
        data: {
          role: 'user',
          content,
          chapterId: currentChapter?.id,
          tokensIn: estimateTokens(content)
        }
      });
      console.log(`[Orchestrator] User message created with ID: ${userMessage.id}`);

      // Emit activity start
      const activityId = await this.logActivity('recall', 'running', 'Retrieving relevant memories...');
      socket.emit('subroutine:status', {
        id: activityId,
        tool: 'recall',
        status: 'running',
        messageId: userMessage.id
      });
      console.log('[Orchestrator] Recall activity started');

      // Decide if we need search
      const needsSearch = await this.decideSearch(content);
      let searchResult = null;

      if (needsSearch) {
        console.log('[Orchestrator] Search needed, initiating...');
        
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
          
          // Generate AI-powered summary for context inclusion (~500 words)
          console.log('[Orchestrator] Generating search summary for context...');
          const summary = await perplexityClient.generateSummary(searchResult);

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

          console.log('[Orchestrator] Search completed and saved to database');
        } catch (searchError) {
          console.error('[Orchestrator] Search error:', searchError);
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
      console.log('[Orchestrator] Retrieving memories...');
      const memories = await memoryEngine.retrieve(content, 50);
      console.log(`[Orchestrator] Retrieved ${memories.length} memories`);
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
      console.log('[Orchestrator] Getting personality snapshot...');
      const personality = await personalityEngine.getSnapshot();
      console.log('[Orchestrator] Personality snapshot obtained');

      // Inner thought processing (selective for important messages)
      let innerThought: InnerThought | null = null;
      const recentMessages = await db.message.findMany({
        where: { 
          chapterId: currentChapter?.id,
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

      const needsThought = await innerThoughtEngine.shouldTriggerThought(content, recentHistory);
      
      if (needsThought) {
        console.log('[Orchestrator] Inner thought needed, processing...');
        const thoughtActivityId = await this.logActivity('think', 'running', 'Processing inner thought...');
        socket.emit('subroutine:status', { 
          id: thoughtActivityId, 
          tool: 'think', 
          status: 'running' 
        });

        try {
          // Classify context
          const context = await innerThoughtEngine.classifyContext(content, recentHistory);
          
          // Analyze complexity
          const complexity = await innerThoughtEngine.analyzeComplexity(content, context);
          
          // Get emotional threads for context
          const emotionalThreads = personalityEngine.getActiveEmotionalThreads();
          
          // Generate thought (Flash or Pro based on complexity)
          innerThought = await innerThoughtEngine.generateThought({
            userMessage: content,
            context,
            personality,
            recentMemories: memories,
            conversationHistory: recentHistory,
            complexity: complexity.level,
            emotionalThreads
          });

          // Store the full inner thought data in metadata
          await this.completeActivity(
            thoughtActivityId, 
            `Context: ${context.context}, Approach: ${innerThought.responseApproach}`,
            {
              thought: innerThought.thought,
              context: context.context,
              contextConfidence: context.confidence,
              contextReasoning: context.reasoning,
              responseApproach: innerThought.responseApproach,
              emotionalTone: innerThought.emotionalTone,
              complexity: complexity.level,
              memoryGuidance: innerThought.memoryGuidance,
              moodImpact: innerThought.moodImpact
            }
          );
          socket.emit('subroutine:status', { 
            id: thoughtActivityId, 
            tool: 'think', 
            status: 'done',
            summary: innerThought.thought.slice(0, 100)
          });
        } catch (error) {
          console.error('[Orchestrator] Inner thought error:', error);
          await this.completeActivity(thoughtActivityId, 'Inner thought failed');
          socket.emit('subroutine:status', { 
            id: thoughtActivityId, 
            tool: 'think', 
            status: 'error'
          });
        }
      } else {
        console.log('[Orchestrator] Inner thought not needed for this message');
      }

      // Build context with full conversation history
      console.log('[Orchestrator] Building context...');
      const messages = await this.buildMessages({
        userMessage: content,
        memories,
        personality,
        currentChapter,
        searchResult,
        innerThought
      });
      console.log(`[Orchestrator] Context built with ${messages.length} messages`);

      // Stream response with multi-message support
      console.log('[Orchestrator] Starting chat stream...');
      let fullResponse = '';
      let currentMessage = '';
      let buffer = ''; // Buffer to hold tokens that might be part of a split marker
      const SPLIT_MARKER = '{{{SPLIT}}}';

      try {
        for await (const token of openRouterClient.streamChat(messages)) {
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
            
            // Small delay to simulate human typing pause between messages (50-150ms)
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
            
            // Start next message
            console.log(`[Orchestrator] Split detected, starting next message`);
            
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
        console.log(`[Orchestrator] Chat stream complete, full response length: ${fullResponse.length}`);
        socket.emit('chat:complete');
      } catch (streamError) {
        console.error('[Orchestrator] Streaming error:', streamError);
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
            chapterId: currentChapter?.id,
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
    currentChapter: any;
    searchResult: any;
    innerThought?: InnerThought | null;
  }): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const { userMessage, memories, personality, currentChapter, searchResult, innerThought } = params;

    console.log('[Orchestrator] Building message context...');

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
      
      // All active beliefs (sorted by confidence)
      const beliefsText = fullSnapshot.beliefs.length > 0
        ? fullSnapshot.beliefs
            .map((b: any) => `[${b.subject}] ${b.statement} (${(b.confidence * 100).toFixed(0)}% confident)`)
            .join('\n')
        : '';

      // Current goals (top 5)
      const goalsText = fullSnapshot.goals.length > 0
        ? fullSnapshot.goals
            .slice(0, 5)
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
      console.warn('[Orchestrator] Could not fetch full snapshot, using basic personality:', err);
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

    // Build chapter section
    const chapterText = currentChapter
      ? `Current Chapter: "${currentChapter.title}"\nSummary: ${currentChapter.summary}`
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
          console.log(`[Orchestrator] Including ${recentSearches.filter(s => s.summary).length} search summaries in context`);
        }
      }
      
      // Add current search if available
      if (searchResult) {
        const currentSynthesis = await perplexityClient.synthesize(searchResult);
        searchText += searchText ? `\n\n---\n\nCurrent Search:\n${currentSynthesis}` : `Current Search Results:\n${currentSynthesis}`;
      }
    } catch (error) {
      console.error('[Orchestrator] Error retrieving search history:', error);
      // Fallback to just current search if available
      if (searchResult) {
        searchText = `Recent Search Results:\n${await perplexityClient.synthesize(searchResult)}`;
      }
    }

    // Build inner thought section
    const thoughtText = innerThought
      ? `Your Current Thoughts:\n"${innerThought.thought}"\n\nResponse Approach: ${innerThought.responseApproach}\nEmotional Tone: ${innerThought.emotionalTone}`
      : '';

    // Build enhanced system prompt with context
    let systemPrompt = EVELYN_SYSTEM_PROMPT;
    
    const contextSections = [];
    if (personalityText) contextSections.push(personalityText);
    if (chapterText) contextSections.push(chapterText);
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
        chapterId: currentChapter?.id,
        role: { in: ['user', 'assistant'] }
      },
      orderBy: { createdAt: 'desc' }
      // No take limit - Evelyn gets full conversation context until token limit
    });

    console.log(`[Orchestrator] Retrieved ${recentMessages.length} messages (entire conversation) from database`);

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

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    console.log(`[Orchestrator] Built message array with ${messages.length} total messages (1 system + ${history.length} history + 1 current)`);

    // Apply token budgeting if needed
    const totalTokens = this.budgeter.estimateTokens(JSON.stringify(messages));
    console.log(`[Orchestrator] Estimated total tokens: ${totalTokens}`);

    if (totalTokens > 150000) {
      console.log('[Orchestrator] Token limit exceeded, applying smart truncation...');
      const truncatedMessages = await this.smartTruncateMessages(messages, systemPrompt);
      
      // Emit context usage after truncation
      const truncatedTokens = this.budgeter.estimateTokens(JSON.stringify(truncatedMessages));
      this.currentSocket?.emit('context:usage', {
        tokens: truncatedTokens,
        maxTokens: 150000,
        percentage: (truncatedTokens / 150000) * 100,
        messageCount: truncatedMessages.length - 1, // Exclude system message
        truncated: true,
        removedMessages: messages.length - truncatedMessages.length
      });
      
      return truncatedMessages;
    }

    // Emit context usage for non-truncated context
    this.currentSocket?.emit('context:usage', {
      tokens: totalTokens,
      maxTokens: 150000,
      percentage: (totalTokens / 150000) * 100,
      messageCount: messages.length - 1, // Exclude system message
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

    console.log('[Orchestrator] Applying smart truncation with importance scoring...');
    
    try {
      const result = await smartTruncationEngine.smartTruncate(messages, maxMessages, 150000);
      
      console.log(`[Orchestrator] Smart truncation results:`);
      console.log(`  - Removed: ${result.removedCount} messages`);
      console.log(`  - Preserved: ${result.preservedCount} messages`);
      console.log(`  - Memories created: ${result.memoriesCreated}`);
      console.log(`  - Context saved: ${result.contextSaved} tokens`);
      console.log(`  - Strategy: ${result.truncationStrategy}`);
      
      return result.truncatedMessages;
    } catch (error) {
      console.error('[Orchestrator] Smart truncation failed, using fallback:', error);
      
      // Fallback to simple truncation
      const systemMsg = messages[0];
      const recentMsgs = messages.slice(-maxMessages);
      console.log(`[Orchestrator] Fallback: Truncated from ${messages.length} to ${recentMsgs.length + 1} messages`);
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
        console.log(`[Query Refinement] Original: "${userMessage.slice(0, 50)}..." → Refined: "${result.refinedQuery}"`);
        console.log(`[Query Refinement] Rationale: ${result.rationale}`);
        return result.refinedQuery;
      }
    } catch (error) {
      console.error('[Query Refinement] Error:', error);
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
        console.log(`[Search Decision] needsSearch=${result.needsSearch}, confidence=${result.confidence}, rationale=${result.rationale}`);
        return result.needsSearch && result.confidence >= 0.6;
      }
    } catch (error) {
      console.error('[Search Decision] Error:', error);
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
      console.error('[Orchestrator] Emotional thread tracking failed:', err);
    });

    // Check and update personality anchors if conditions are met
    // This happens asynchronously after mood updates
    personalityEngine.checkAndUpdateAnchors().catch(err => {
      console.error('[Orchestrator] Anchor update check failed:', err);
    });

    // Trigger micro-reflection when conditions are met
    personalityEngine.microReflect(socket).catch(err => {
      console.error('[Orchestrator] Micro-reflection failed:', err);
    });

    // Check chapter boundary
    await chapterEngine.checkChapterBoundary(params.assistantMessage.id);
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
      console.log('[Orchestrator] Creating post-response backup...');
      
      // Create backup (runs asynchronously)
      const backupMetadata = await backupManager.createPostResponseBackup();
      
      if (backupMetadata) {
        // Emit backup completion to frontend for auto-sync
        socket.emit('backup:created', {
          type: 'post-response',
          timestamp: backupMetadata.timestamp,
          size: backupMetadata.size,
          recordCounts: backupMetadata.recordCounts,
          filename: backupMetadata.filename
        });
        
        console.log('[Orchestrator] Post-response backup created and synced with frontend');
      }
    } catch (error) {
      console.error('[Orchestrator] Failed to create post-response backup:', error);
      // Don't throw - backup failure shouldn't affect response flow
    }
  }
}

export const orchestrator = new Orchestrator();

