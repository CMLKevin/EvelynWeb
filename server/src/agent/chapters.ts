import { db } from '../db/client.js';
import { embed } from '../providers/embeddings.js';
import { openRouterClient } from '../providers/openrouter.js';
import { cosineSimilarity } from '../utils/similarity.js';

const CHAPTER_SUMMARY_PROMPT = `You are summarizing a conversation chapter between a user and Evelyn (an AI companion).

Task: Generate a concise title and summary for this chapter.

The summary should include:
- 5-8 key points or topics discussed
- Any decisions, commitments, or plans made
- Emotional beats or relationship moments
- References to any memory IDs mentioned

Format your response as JSON:
{
  "title": "Brief descriptive title (4-8 words)",
  "summary": "Comprehensive summary in 150-300 words",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Messages:
{{MESSAGES}}`;

interface Chapter {
  id: number;
  title: string;
  summary: string;
  startMessageId: number | null;
  endMessageId: number | null;
  createdAt: Date;
  features: any;
}

class ChapterEngine {
  private currentChapterCache: Chapter | null = null;
  private lastChapterCheck: number = 0;

  async getCurrentChapter(): Promise<Chapter | null> {
    // Cache for 30 seconds
    if (this.currentChapterCache && Date.now() - this.lastChapterCheck < 30000) {
      return this.currentChapterCache;
    }

    const chapter = await db.chapter.findFirst({
      where: { endMessageId: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!chapter) {
      // Create first chapter
      const newChapter = await db.chapter.create({
        data: {
          title: 'Getting to Know Each Other',
          summary: 'The beginning of our conversation.',
          startMessageId: null,
          features: JSON.stringify({ keywords: ['introduction', 'first meeting'] })
        }
      });
      this.currentChapterCache = newChapter;
      this.lastChapterCheck = Date.now();
      return newChapter;
    }

    this.currentChapterCache = chapter;
    this.lastChapterCheck = Date.now();
    return chapter;
  }

  async checkChapterBoundary(latestMessageId: number): Promise<void> {
    const currentChapter = await this.getCurrentChapter();
    if (!currentChapter) return;

    // Get messages in current chapter
    const messages = await db.message.findMany({
      where: { 
        chapterId: currentChapter.id,
        role: { in: ['user', 'assistant'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (messages.length === 0) return;

    // Trigger conditions - increased from 80 to 150 for longer conversations
    const messageCount = messages.length;
    const shouldSplit = await this.shouldSplitChapter(messages, currentChapter);

    if (shouldSplit || messageCount >= 150) {
      console.log(`📖 Starting new chapter (${messageCount} messages, drift detected)`);
      await this.closeAndStartNewChapter(currentChapter, latestMessageId, messages);
    }
  }

  private async shouldSplitChapter(messages: any[], currentChapter: Chapter): Promise<boolean> {
    // Check idle gap (> 2 hours)
    if (messages.length < 2) return false;

    const latestMessage = messages[messages.length - 1];
    const previousMessage = messages[messages.length - 2];
    const gapMs = new Date(latestMessage.createdAt).getTime() - new Date(previousMessage.createdAt).getTime();
    const gapHours = gapMs / (1000 * 60 * 60);

    if (gapHours > 2) {
      return true;
    }

    // Check topic drift (compare recent message embedding to chapter centroid)
    if (messages.length < 10) return false;

    try {
      // Get chapter centroid from features
      const features = currentChapter.features ? JSON.parse(currentChapter.features as string) : null;
      
      if (!features || !features.topicVector) {
        // Compute and store centroid
        const recentTexts = messages.slice(-10).map(m => m.content);
        const embeddings = await Promise.all(recentTexts.map(t => embed(t)));
        const centroid = this.computeCentroid(embeddings);
        
        await db.chapter.update({
          where: { id: currentChapter.id },
          data: {
            features: JSON.stringify({ ...features, topicVector: centroid })
          }
        });

        return false; // Don't split yet, just initialized
      }

      // Compare latest message to centroid
      const latestEmbedding = await embed(latestMessage.content);
      const similarity = cosineSimilarity(latestEmbedding, features.topicVector);

      return similarity < 0.65;

    } catch (error) {
      console.error('Topic drift check error:', error);
      return false;
    }
  }

  private async closeAndStartNewChapter(
    currentChapter: Chapter,
    latestMessageId: number,
    messages: any[]
  ): Promise<void> {
    // Generate summary for current chapter
    const summary = await this.generateSummary(messages);

    // Close current chapter
    await db.chapter.update({
      where: { id: currentChapter.id },
      data: {
        title: summary.title,
        summary: summary.summary,
        endMessageId: latestMessageId,
        features: JSON.stringify({
          keywords: summary.keywords,
          topicVector: currentChapter.features ? JSON.parse(currentChapter.features as string).topicVector : null
        })
      }
    });

    // Start new chapter
    const newChapter = await db.chapter.create({
      data: {
        title: 'New Conversation',
        summary: 'Just started...',
        startMessageId: latestMessageId + 1
      }
    });

    // Update cache
    this.currentChapterCache = newChapter;
    this.lastChapterCheck = Date.now();

    console.log(`✨ New chapter started: "${summary.title}" → "${newChapter.title}"`);
  }

  private async generateSummary(messages: any[]): Promise<{ title: string; summary: string; keywords: string[] }> {
    // Take representative messages
    const sampleSize = Math.min(20, messages.length);
    const step = Math.floor(messages.length / sampleSize);
    const sample = messages.filter((_, i) => i % step === 0).slice(0, sampleSize);

    const messagesText = sample
      .map(m => `${m.role}: ${m.content.slice(0, 300)}`)
      .join('\n\n');

    const prompt = CHAPTER_SUMMARY_PROMPT.replace('{{MESSAGES}}', messagesText);

    try {
      const response = await openRouterClient.simpleThought(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          title: 'Conversation',
          summary: 'A meaningful exchange.',
          keywords: []
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || 'Conversation',
        summary: parsed.summary || 'A meaningful exchange.',
        keywords: parsed.keywords || []
      };

    } catch (error) {
      console.error('Chapter summary generation error:', error);
      return {
        title: 'Conversation',
        summary: 'A meaningful exchange.',
        keywords: []
      };
    }
  }

  private computeCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    
    const dim = embeddings[0].length;
    const centroid = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += emb[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      centroid[i] /= embeddings.length;
    }

    return centroid;
  }

  async getChapterHistory(limit: number = 10): Promise<Chapter[]> {
    return db.chapter.findMany({
      where: { endMessageId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

export const chapterEngine = new ChapterEngine();

