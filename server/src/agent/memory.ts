import { db } from '../db/client.js';
import { embed } from '../providers/embeddings.js';
import { openRouterClient } from '../providers/openrouter.js';
import { cosineSimilarity } from '../utils/similarity.js';

interface Memory {
  id: number;
  type: string;
  text: string;
  importance: number;
  embedding: number[];
  privacy: string;
  lastAccessedAt: Date;
  sourceMessageId: number | null;
  createdAt: Date;
}

interface MemoryClassification {
  importance: number;
  type: 'episodic' | 'semantic' | 'preference' | 'insight' | 'plan' | 'relational';
  rationale: string;
  privacy: 'public' | 'private' | 'ephemeral';
}

const MEMORY_CLASSIFICATION_PROMPT = `You are analyzing a conversation between a user and Evelyn (an AI) to decide if anything should be remembered long-term.

Task: Determine if a memory should be stored from this exchange.

Guidelines for importance scoring (0.0 to 1.0):
- **High importance (0.7-1.0):** Deeply personal revelations, major life events, explicit commitments, core beliefs/values, significant relationship moments
- **Medium importance (0.4-0.7):** Personal facts, preferences, meaningful stories, plans, emotional expressions, insights about the user
- **Low importance (0.0-0.4):** Casual chat, simple acknowledgments, generic opinions, everyday small talk

Specific criteria:
- Vulnerability or deep emotional sharing: +0.3 to +0.5
- Novel facts about user's life, identity, background: +0.3
- Explicit "remember this" or future reference: +0.4
- Commitments, promises, or plans: +0.3 to +0.4
- Strong preferences or values: +0.2 to +0.3
- Relationship-defining moments: +0.3 to +0.5
- Rare facts, milestones, achievements: +0.3
- Insight or realization about the user: +0.2 to +0.4

Memory types:
- **episodic**: Specific events, stories, experiences the user shared
- **semantic**: Facts, knowledge, information about the user or their world
- **preference**: Likes, dislikes, opinions, tastes
- **insight**: Deeper understanding about who the user is, their patterns, motivations
- **plan**: Future intentions, commitments, goals
- **relational**: Relationship dynamics, boundaries, connection moments

Privacy levels:
- **public**: General, non-sensitive information
- **private**: Personal, sensitive information
- **ephemeral**: Very temporary, not worth long-term storage (casual banter, simple acknowledgments)

IMPORTANT: Be selective. Casual greetings, simple reactions ("lol", "ok", "thanks"), and surface-level chat should be marked ephemeral or have importance < 0.4.

Respond ONLY with JSON:
{
  "importance": 0.75,
  "type": "relational",
  "rationale": "User shared vulnerable moment about family - meaningful relationship depth",
  "privacy": "private"
}

User message: """
{{USER}}
"""

Evelyn's response: """
{{ASSISTANT}}
"""`;

class MemoryEngine {
  async retrieve(query: string, topK: number = 30): Promise<Memory[]> {
    try {
      console.log(`[Memory] Retrieving memories for query: "${query.slice(0, 50)}..."`);
      
      // Embed query
      console.log('[Memory] Generating embedding...');
      const queryEmbedding = await embed(query);
      console.log('[Memory] Embedding generated, dimension:', queryEmbedding.length);

    // Get candidate memories (top by importance first)
    // Increased from 800 to 2000 for better coverage
    const candidates = await db.memory.findMany({
      where: {
        privacy: { not: 'ephemeral' }
      },
      orderBy: [
        { importance: 'desc' }
      ],
      take: 2000
    });

      console.log(`[Memory] Found ${candidates.length} candidate memories`);

      if (candidates.length === 0) {
        console.log('[Memory] No memories found, returning empty array');
        return [];
      }

      // Score by cosine similarity * blended importance
      const scored = candidates.map((m: any) => {
        try {
          const embedding = JSON.parse(m.embedding) as number[];
          const similarity = cosineSimilarity(queryEmbedding, embedding);
          
          // Recency boost (decay over 30 days)
          const ageMs = Date.now() - new Date(m.lastAccessedAt).getTime();
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          const recencyBoost = Math.exp(-ageDays / 30) * 0.2;

          const score = similarity * (0.6 + 0.4 * m.importance) + recencyBoost;

          return { m, score, embedding };
        } catch (parseError) {
          console.error(`[Memory] Error parsing embedding for memory ${m.id}:`, parseError);
          return null;
        }
      }).filter((item: any) => item !== null);

      // Sort and take top K
      scored.sort((a: any, b: any) => b.score - a.score);
      const topMemories = scored.slice(0, topK).map((x: any) => ({
        ...x.m,
        embedding: x.embedding
      }));

      // Update last accessed time
      const ids = topMemories.map((m: Memory) => m.id);
      if (ids.length > 0) {
        await db.memory.updateMany({
          where: { id: { in: ids } },
          data: { lastAccessedAt: new Date() }
        });
      }

      console.log(`[Memory] Returning ${topMemories.length} memories`);
      return topMemories;
    } catch (error) {
      console.error('[Memory] Error in retrieve:', error);
      return [];
    }
  }

  async classifyAndStore(
    userMessage: string,
    assistantMessage: string,
    sourceMessageId: number,
    privacyOverride?: string,
    thoughtGuidance?: {
      shouldStore: boolean;
      importanceModifier: number;
      additionalContext: string;
    }
  ): Promise<Memory | null> {
    // Classify with Gemini Flash
    const prompt = MEMORY_CLASSIFICATION_PROMPT
      .replace('{{USER}}', userMessage)
      .replace('{{ASSISTANT}}', assistantMessage);

    try {
      const response = await openRouterClient.simpleThought(prompt);
      
      // Parse JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON in classification response');
        return null;
      }

      const classification: MemoryClassification = JSON.parse(jsonMatch[0]);

      // Apply heuristic adjustments
      let importance = classification.importance;

      // Strong boost for explicit memory requests
      if (userMessage.toLowerCase().includes('remember this') || userMessage.toLowerCase().includes('don\'t forget')) {
        importance = Math.min(1.0, importance + 0.25);
      } else if (userMessage.toLowerCase().includes('remember')) {
        importance = Math.min(1.0, importance + 0.15);
      }

      // Boost for strong commitments
      if (userMessage.toLowerCase().includes('promise') || userMessage.toLowerCase().includes('i will')) {
        importance = Math.min(1.0, importance + 0.2);
      }

      // Penalty for very short exchanges (likely casual)
      if (userMessage.length < 30 && assistantMessage.length < 50) {
        importance *= 0.7;
      }

      // Apply inner thought guidance if provided
      if (thoughtGuidance) {
        console.log(`[Memory] Applying thought guidance: shouldStore=${thoughtGuidance.shouldStore}, modifier=${thoughtGuidance.importanceModifier}`);
        
        // If thought says not to store and importance is below high threshold, skip
        if (!thoughtGuidance.shouldStore && importance < 0.65) {
          console.log(`[Memory] Inner thought suggests not storing (importance: ${importance.toFixed(2)})`);
          return null;
        }
        
        // Apply importance modifier from inner thought
        importance += thoughtGuidance.importanceModifier;
        importance = Math.max(0, Math.min(1, importance));
        
        console.log(`[Memory] Importance adjusted to ${importance.toFixed(2)} based on inner thought`);
      }

      if (importance < 0.30) {
        console.log(`[Memory] Importance ${importance.toFixed(2)} below threshold (0.40), skipping storage`);
        return null;
      }

      // Skip ephemeral privacy unless importance is very high
      if (classification.privacy === 'ephemeral' && importance < 0.6) {
        console.log(`[Memory] Marked ephemeral with low importance (${importance.toFixed(2)}), skipping`);
        return null;
      }

      // Create memory text with optional thought context
      let memoryText = `User: ${userMessage}\nEvelyn: ${assistantMessage}`;
      
      // Enhance memory text with thought context if provided
      if (thoughtGuidance && thoughtGuidance.additionalContext) {
        memoryText += `\n[Context: ${thoughtGuidance.additionalContext}]`;
      }

      // Embed
      const embedding = await embed(memoryText);

      // Store
      const memory = await db.memory.create({
        data: {
          type: classification.type,
          text: memoryText,
          importance,
          embedding: JSON.stringify(embedding),
          privacy: privacyOverride || classification.privacy,
          sourceMessageId,
          lastAccessedAt: new Date()
        }
      });

      console.log(`💾 Stored ${memory.type} memory #${memory.id} (importance: ${importance.toFixed(2)})`);

      return { ...memory, embedding };

    } catch (error) {
      console.error('Memory classification error:', error);
      return null;
    }
  }

  async getMemoryById(id: number): Promise<Memory | null> {
    try {
      const memory = await db.memory.findUnique({ where: { id } });
      if (!memory) return null;
      
      const embedding = JSON.parse(memory.embedding);
      return {
        ...memory,
        embedding
      };
    } catch (error) {
      console.error(`[Memory] Error getting memory ${id}:`, error);
      return null;
    }
  }

  async linkMemories(fromId: number, toId: number, relation: string, weight: number = 1.0): Promise<void> {
    await db.memoryLink.upsert({
      where: {
        fromId_toId_relation: { fromId, toId, relation }
      },
      create: { fromId, toId, relation, weight },
      update: { weight }
    });
  }

  async getLinkedMemories(memoryId: number): Promise<Memory[]> {
    try {
      const links = await db.memoryLink.findMany({
        where: { fromId: memoryId },
        include: { to: true },
        orderBy: { weight: 'desc' }
      });

      return links.map((link: any) => {
        try {
          return {
            ...link.to,
            embedding: JSON.parse(link.to.embedding)
          };
        } catch (parseError) {
          console.error(`[Memory] Error parsing embedding for memory ${link.to.id}:`, parseError);
          return null;
        }
      }).filter((m: Memory | null) => m !== null) as Memory[];
    } catch (error) {
      console.error('[Memory] Error getting linked memories:', error);
      return [];
    }
  }

  async pruneEphemeralMemories(): Promise<number> {
    // Delete ephemeral memories older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db.memory.deleteMany({
      where: {
        privacy: 'ephemeral',
        createdAt: { lt: cutoff }
      }
    });
    return result.count;
  }

  async pruneLowImportanceMemories(threshold: number = 0.4, maxAge: number = 90): Promise<number> {
    // Delete low-importance memories older than maxAge days
    const cutoff = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    const result = await db.memory.deleteMany({
      where: {
        importance: { lt: threshold },
        createdAt: { lt: cutoff }
      }
    });
    return result.count;
  }
}

export const memoryEngine = new MemoryEngine();

