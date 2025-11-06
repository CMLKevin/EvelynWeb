import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE = process.env.OPENROUTER_BASE || 'https://openrouter.ai/api/v1';
const MODEL_CHAT = process.env.MODEL_CHAT || 'deepseek/deepseek-chat-v3.1';
const MODEL_THINK_SIMPLE = process.env.MODEL_THINK_SIMPLE || 'x-ai/grok-4-fast';
const MODEL_THINK_COMPLEX = process.env.MODEL_THINK_COMPLEX || 'minimax/minimax-m2';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-large';

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

interface CompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class OpenRouterClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = OPENROUTER_BASE;
    this.apiKey = OPENROUTER_API_KEY;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://evelyn-chat.local',
      'X-Title': 'Evelyn Agentic AI'
    };
  }

  async *streamChat(messages: Message[], model: string = MODEL_CHAT): AsyncGenerator<string> {
    console.log(`[OpenRouter] Starting stream chat with model: ${model}`);
    console.log(`[OpenRouter] Messages: ${messages.length}, total tokens ~${messages.reduce((sum, m) => sum + m.content.length / 4, 0)}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.75,
          max_tokens: 8192  // Doubled from 4096 for longer responses
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[OpenRouter] Stream error ${response.status}:`, error);
        throw new Error(`OpenRouter error: ${response.status} ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log(`[OpenRouter] Stream complete, generated ${tokenCount} tokens`);
              return;
            }
            
            try {
              const parsed: StreamChunk = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                tokenCount++;
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('[OpenRouter] Stream chat error:', error);
      throw error;
    }
  }

  async complete(messages: Message[], model: string = MODEL_CHAT): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 8192  // Doubled from 4096 for longer responses
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${response.status} ${error}`);
    }

    const data = await response.json() as CompletionResponse;
    return data.choices[0].message.content;
  }

  async simpleThought(prompt: string): Promise<string> {
    return this.complete([{ role: 'user', content: prompt }], MODEL_THINK_SIMPLE);
  }

  async complexThought(prompt: string): Promise<string> {
    return this.complete([{ role: 'user', content: prompt }], MODEL_THINK_COMPLEX);
  }

  async embed(text: string): Promise<number[]> {
    console.log(`[OpenRouter] Embedding request for model: ${EMBEDDING_MODEL}`);
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[OpenRouter] Embedding error ${response.status}:`, error);
        throw new Error(`OpenRouter embedding error: ${response.status} ${error}`);
      }

      const data = await response.json() as EmbeddingResponse;
      console.log(`[OpenRouter] Embedding received, dimension: ${data.data[0].embedding.length}`);
      return data.data[0].embedding;
    } catch (error) {
      console.error('[OpenRouter] Embedding request failed:', error);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter embedding error: ${response.status} ${error}`);
    }

    const data = await response.json() as EmbeddingResponse;
    return data.data.map((d) => d.embedding);
  }
}

export const openRouterClient = new OpenRouterClient();

