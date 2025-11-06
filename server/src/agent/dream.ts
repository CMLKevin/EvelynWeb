import { Socket } from 'socket.io';
import { db } from '../db/client.js';
import { openRouterClient } from '../providers/openrouter.js';
import { personalityEngine } from './personality.js';
import { memoryEngine } from './memory.js';

const DREAM_PROMPT = `You are helping Evelyn consolidate her experiences during dream mode.

Recent high-importance memories:
{{MEMORIES}}

Recent chapters:
{{CHAPTERS}}

Task: Generate insights and consolidations. Output JSON:
{
  "insights": ["Insight about patterns", "Deeper understanding"],
  "consolidations": [{"memoryIds": [1,2], "merged": "Combined insight"}],
  "userMessage": "Optional morning greeting or reflection for the user"
}`;

class DreamEngine {
  private isDreaming: boolean = false;
  private currentSocket: Socket | null = null;

  async startDream(socket: Socket): Promise<void> {
    if (this.isDreaming) {
      socket.emit('dream:error', { error: 'Already dreaming' });
      return;
    }

    this.isDreaming = true;
    this.currentSocket = socket;

    socket.emit('dream:status', { status: 'starting', progress: 0 });

    try {
      // Phase 1: Gather memories and chapters
      socket.emit('dream:status', { status: 'gathering', progress: 20 });
      
      const memories = await db.memory.findMany({
        where: { importance: { gte: 0.7 } },
        orderBy: { createdAt: 'desc' },
        take: 30
      });

      const chapters = await db.chapter.findMany({
        where: { endMessageId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // Phase 2: Generate insights
      socket.emit('dream:status', { status: 'reflecting', progress: 50 });

      const memoriesText = memories.map((m: any) => `[${m.id}] ${m.text.slice(0, 200)}`).join('\n');
      const chaptersText = chapters.map((c: any) => `"${c.title}": ${c.summary.slice(0, 150)}`).join('\n');

      const prompt = DREAM_PROMPT
        .replace('{{MEMORIES}}', memoriesText)
        .replace('{{CHAPTERS}}', chaptersText);

      const response = await openRouterClient.complexThought(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);

        // Phase 3: Apply consolidations
        socket.emit('dream:status', { status: 'consolidating', progress: 70 });

        for (const cons of result.consolidations || []) {
          if (cons.memoryIds && cons.merged) {
            await db.memory.create({
              data: {
                type: 'insight',
                text: cons.merged,
                importance: 0.85,
                embedding: JSON.stringify([]), // Will be populated later
                privacy: 'private'
              }
            });
          }
        }

        // Phase 4: Evolve personality slightly
        socket.emit('dream:status', { status: 'evolving', progress: 85 });
        
        const { mood } = await personalityEngine.getSnapshot();
        await db.moodState.update({
          where: { id: mood.id },
          data: {
            valence: 0.2,
            arousal: 0.3,
            stance: 'rested and renewed',
            lastUpdateAt: new Date()
          }
        });

        // Phase 5: Complete
        socket.emit('dream:status', { status: 'complete', progress: 100 });
        
        if (result.userMessage) {
          await db.message.create({
            data: {
              role: 'assistant',
              content: result.userMessage,
              tokensOut: result.userMessage.split(' ').length
            }
          });
          socket.emit('dream:message', { content: result.userMessage });
        }
      }

    } catch (error) {
      console.error('Dream error:', error);
      socket.emit('dream:error', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      this.isDreaming = false;
      this.currentSocket = null;
    }
  }

  async cancelDream(): Promise<void> {
    if (!this.isDreaming) return;
    this.isDreaming = false;
    this.currentSocket?.emit('dream:status', { status: 'cancelled' });
    this.currentSocket = null;
  }
}

export const dreamEngine = new DreamEngine();

