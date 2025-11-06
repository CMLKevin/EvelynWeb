import dotenv from 'dotenv';
import { openRouterClient } from './openrouter.js';

dotenv.config();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_BASE = process.env.PERPLEXITY_BASE || 'https://api.perplexity.ai';
const MODEL_SEARCH_SIMPLE = process.env.MODEL_SEARCH_SIMPLE || 'sonar-pro';
const MODEL_SEARCH_COMPLEX = process.env.MODEL_SEARCH_COMPLEX || 'sonar-reasoning';

if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY environment variable is required');
}

interface SearchResult {
  query: string;
  model: string;
  answer: string;
  citations: string[];
  relatedQuestions?: string[];
  rawResponse: any;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

class PerplexityClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = PERPLEXITY_BASE;
    this.apiKey = PERPLEXITY_API_KEY;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async search(query: string, complexity: 'simple' | 'complex' = 'simple'): Promise<SearchResult> {
    const model = complexity === 'simple' ? MODEL_SEARCH_SIMPLE : MODEL_SEARCH_COMPLEX;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful search assistant. Provide comprehensive, accurate information with multiple citations. Include specific facts, figures, and details from credible sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        return_citations: true,
        return_related_questions: true,
        search_recency_filter: 'month'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity error: ${response.status} ${error}`);
    }

    const data = await response.json() as PerplexityResponse;
    const answer = data.choices[0].message.content;
    const citations = data.citations || [];
    const relatedQuestions = (data as any).related_questions || [];

    console.log(`[Perplexity] Search completed - ${citations.length} citations, ${relatedQuestions.length} related questions`);

    return {
      query,
      model,
      answer,
      citations,
      relatedQuestions,
      rawResponse: data
    };
  }

  async synthesize(searchResult: SearchResult): Promise<string> {
    // Extract key points and format for Evelyn
    const bullets: string[] = [];
    
    // Parse the answer for key facts
    const sentences = searchResult.answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const topSentences = sentences.slice(0, 5);
    
    topSentences.forEach((sentence, idx) => {
      const citation = searchResult.citations[idx] || searchResult.citations[0] || '';
      if (sentence.trim()) {
        bullets.push(`• ${sentence.trim()}${citation ? ` [${citation}]` : ''}`);
      }
    });

    const synthesis = `Based on current information:\n\n${bullets.join('\n')}\n\nIn summary: ${sentences[0]?.trim() || searchResult.answer.slice(0, 200)}`;
    
    return synthesis;
  }

  async generateSummary(searchResult: SearchResult): Promise<string> {
    // Use MODEL_THINK_SIMPLE to generate a ~500 word summary for context inclusion
    const prompt = `You are summarizing web search results for an AI assistant's context memory. Your goal is to create a concise, information-dense summary of approximately 500 words that captures the key facts, insights, and details from the search results.

Search Query: "${searchResult.query}"

Search Results:
${searchResult.answer}

Citations: ${searchResult.citations.join(', ')}

Create a comprehensive summary that:
1. Captures the most important facts and information
2. Includes specific details, numbers, dates, names when relevant
3. Organizes information logically by topic or theme
4. Is approximately 500 words (can be slightly shorter or longer if needed)
5. Uses clear, concise language suitable for context inclusion
6. Maintains objectivity and accuracy

Write the summary now:`;

    try {
      const summary = await openRouterClient.simpleThought(prompt);
      console.log(`[Perplexity] Generated summary: ${summary.length} characters (~${Math.round(summary.split(/\s+/).length)} words)`);
      return summary;
    } catch (error) {
      console.error('[Perplexity] Summary generation failed:', error);
      // Fallback to truncated answer if summary generation fails
      return searchResult.answer.slice(0, 2000) + (searchResult.answer.length > 2000 ? '...' : '');
    }
  }
}

export const perplexityClient = new PerplexityClient();

