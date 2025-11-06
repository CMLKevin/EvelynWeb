import { openRouterClient } from './openrouter.js';

// LRU cache for embeddings
class EmbeddingCache {
  private cache: Map<string, { embedding: number[]; timestamp: number }>;
  private maxSize: number;

  constructor(maxSize = 500) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(text: string): number[] | undefined {
    const entry = this.cache.get(text);
    if (entry) {
      // Move to end (most recent)
      this.cache.delete(text);
      this.cache.set(text, entry);
      return entry.embedding;
    }
    return undefined;
  }

  set(text: string, embedding: number[]): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(text, { embedding, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const embeddingCache = new EmbeddingCache();

export async function embed(text: string): Promise<number[]> {
  const cached = embeddingCache.get(text);
  if (cached) {
    console.log('[Embeddings] Cache hit');
    return cached;
  }

  console.log(`[Embeddings] Generating embedding for text (${text.length} chars)...`);
  try {
    const embedding = await openRouterClient.embed(text);
    console.log(`[Embeddings] Embedding generated, dimension: ${embedding.length}`);
    embeddingCache.set(text, embedding);
    return embedding;
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error);
    throw error;
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const toEmbed: string[] = [];
  const indices: number[] = [];

  texts.forEach((text, idx) => {
    const cached = embeddingCache.get(text);
    if (cached) {
      results[idx] = cached;
    } else {
      toEmbed.push(text);
      indices.push(idx);
    }
  });

  if (toEmbed.length > 0) {
    const embeddings = await openRouterClient.embedBatch(toEmbed);
    embeddings.forEach((emb, i) => {
      const idx = indices[i];
      results[idx] = emb;
      embeddingCache.set(toEmbed[i], emb);
    });
  }

  return results;
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

