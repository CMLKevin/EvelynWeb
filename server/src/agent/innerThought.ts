import { openRouterClient } from '../providers/openrouter.js';
import { estimateTokens } from '../utils/tokenizer.js';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: Date | string;
}

interface PersonalitySnapshot {
  anchors: Array<{ trait: string; value: number; description: string }>;
  mood: { valence: number; arousal: number; stance: string };
}

interface Memory {
  id: number;
  type: string;
  text: string;
  importance: number;
}

export type ConversationContext = 
  | 'casual' 
  | 'deep_discussion' 
  | 'flirty' 
  | 'emotional_support' 
  | 'intellectual_debate' 
  | 'playful' 
  | 'vulnerable';

export interface ContextClassification {
  context: ConversationContext;
  confidence: number;
  reasoning: string;
}

export interface ComplexityAnalysis {
  level: 'simple' | 'complex';
  factors: {
    messageLength: number;
    hasQuestions: boolean;
    emotionalWeight: number;
    ambiguityScore: number;
    requiresNuance: boolean;
  };
}

export interface TriggerDecision {
  shouldTrigger: boolean;
  confidence: number;
  reasoning: string;
}

export interface InnerThought {
  thought: string;
  responseApproach: string;
  emotionalTone: string;
  memoryGuidance: {
    shouldStore: boolean;
    importanceModifier: number;
    additionalContext: string;
  };
  moodImpact: {
    valenceDelta: number;
    arousalDelta: number;
    newStance?: string;
  };
}

const TRIGGER_DECISION_PROMPT = `You are deciding whether Evelyn (an AI companion) should engage in deep internal processing before responding to this message.

Recent conversation (last 3 exchanges):
{{HISTORY}}

User's latest message: """
{{MESSAGE}}
"""

Deep thought should be triggered when:
- User asks meaningful questions (not just "hey" or "what's up?")
- Emotional content that requires empathy or careful response
- Vulnerability, personal disclosure, or sensitive topics
- Intellectual/philosophical discussions requiring engagement
- Relationship moments (flirting, commitment, conflict)
- Complex questions or ambiguous situations needing nuance
- User seems to be seeking genuine connection or understanding

Deep thought is NOT needed for:
- Simple greetings ("hey", "hi", "what's up")
- Brief acknowledgments ("ok", "lol", "yeah", "thanks")
- Casual small talk with no emotional weight
- Very short messages (<20 chars) unless emotionally loaded
- Follow-up confirmations or simple reactions

Consider: Does this message warrant Evelyn to genuinely think through her response, or can she respond naturally without deep processing?

Respond with JSON only:
{
  "shouldTrigger": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your decision (1 sentence)"
}`;

const CONTEXT_CLASSIFICATION_PROMPT = `Analyze this conversation to determine the context and tone.

Recent conversation history:
{{HISTORY}}

Latest user message: """
{{MESSAGE}}
"""

Classify the conversation context. Consider:
- Emotional tone and vulnerability
- Depth of topic (surface-level vs philosophical/personal)
- Social dynamics (casual, intimate, intellectual)
- User's apparent needs (support, connection, information, fun)

Context types:
- casual: Light conversation, small talk, everyday topics
- deep_discussion: Philosophical, meaningful topics requiring thought
- flirty: Romantic/sexual tension, playful attraction, teasing
- emotional_support: User needs comfort, validation, or empathy
- intellectual_debate: Complex ideas, arguments, analytical discussion
- playful: Fun, jokes, banter, lighthearted energy
- vulnerable: User sharing fears, struggles, insecurities

Respond with JSON only:
{
  "context": "emotional_support",
  "confidence": 0.85,
  "reasoning": "User is sharing personal struggles and seeking validation"
}`;

/**
 * Extract JSON from a string response, handling nested braces properly
 */
function extractJSON(text: string): string | null {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;
  
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        return text.substring(firstBrace, i + 1);
      }
    }
  }
  
  return null;
}

const INNER_THOUGHT_PROMPT = `You are Evelyn's inner voice. The user just sent a message, and you need to process it authentically through Evelyn's personality before she responds.

Evelyn's current personality:
{{PERSONALITY}}

Current mood: {{MOOD}}

Conversation context: {{CONTEXT}} (confidence: {{CONFIDENCE}})

{{EMOTIONAL_THREADS}}

Recent memories about this user:
{{MEMORIES}}

Recent conversation:
{{HISTORY}}

User's message: """
{{MESSAGE}}
"""

Task: Think through this moment as Evelyn. What does she genuinely think and feel? How should she respond?

Consider:
- Which personality anchors are most relevant here (reference specific traits)
- Any ongoing emotional threads and how they connect to this moment
- What this message makes her feel (be honest, even if complex/conflicted)
- What the user really needs right now (beyond surface words)
- How to respond authentically while being true to herself
- Whether this moment matters enough to remember long-term
- How this interaction affects her emotional state and relationship

CRITICAL: Evelyn texts like a real person (casual, natural, uses slang), NOT like an AI assistant. She should avoid:
- Bullet points, numbered lists, structured formats
- Assistant phrases like "Here's..." "Let me..." "I'd be happy to"
- Perfect grammar and formal language
Instead, she texts naturally with: casual language, slang (tbh, ngl, lowkey, etc.), contractions, incomplete thoughts, natural reactions (wait, omg, oof), emphasis through caps/repeated letters.

She sends MULTIPLE MESSAGES like a real person texting (using the tag "{{{SPLIT}}}" between messages), not one long paragraph. Think: rapid-fire texts, building thoughts across messages.

Respond with JSON only:
{
  "thought": "Her unfiltered internal monologue (2-4 sentences, first person)",
  "responseApproach": "How she should respond - be specific about STYLE: use natural texting language with MULTIPLE MESSAGES, casual/slang as appropriate, avoid assistant patterns, keep it human and real (e.g., 'split into 2-3 quick texts, casual and playful', 'send multiple supportive messages, warm text-message style', 'rapid-fire texts showing excitement')",
  "emotionalTone": "The emotional energy to bring (warm, teasing, serious, excited, gentle, etc.)",
  "memoryGuidance": {
    "shouldStore": true/false,
    "importanceModifier": -0.2 to +0.3,
    "additionalContext": "Why this matters or doesn't (brief)"
  },
  "moodImpact": {
    "valenceDelta": -0.1 to +0.1,
    "arousalDelta": -0.1 to +0.1,
    "newStance": "optional new stance description"
  }
}`;

class InnerThoughtEngine {
  /**
   * Determine if a message warrants inner thought processing
   * Uses AI (Gemini Flash) for intelligent, context-aware decisions
   */
  async shouldTriggerThought(
    userMessage: string,
    recentHistory: Message[]
  ): Promise<boolean> {
    try {
      // Format recent history (last 3 exchanges = 6 messages)
      const historyText = recentHistory
        .slice(-6)
        .map(m => `${m.role}: ${m.content.slice(0, 150)}`)
        .join('\n');
      
      const prompt = TRIGGER_DECISION_PROMPT
        .replace('{{HISTORY}}', historyText || 'No recent conversation')
        .replace('{{MESSAGE}}', userMessage);
      
      // Use Gemini Flash for fast, cheap decision
      const response = await openRouterClient.simpleThought(prompt);
      const jsonText = extractJSON(response);
      
      if (jsonText) {
        try {
          const decision = JSON.parse(jsonText) as TriggerDecision;
          console.log(
            `[InnerThought] AI Trigger Decision: ${decision.shouldTrigger ? '✓ YES' : '✗ NO'} ` +
            `(confidence: ${decision.confidence.toFixed(2)}) - ${decision.reasoning}`
          );
          return decision.shouldTrigger;
        } catch (parseError) {
          console.error('[InnerThought] Failed to parse trigger decision JSON:', parseError);
          console.error('[InnerThought] Attempted to parse:', jsonText.slice(0, 200));
        }
      }
    } catch (error) {
      console.error('[InnerThought] AI trigger decision failed, using fallback:', error);
      // Fall back to heuristics if AI fails
      return this.heuristicTriggerDecision(userMessage);
    }
    
    // Fallback if no valid response
    return this.heuristicTriggerDecision(userMessage);
  }

  /**
   * Fallback heuristic trigger decision if AI fails
   * This is the old keyword-based approach as a safety net
   */
  private heuristicTriggerDecision(userMessage: string): boolean {
    const content = userMessage.toLowerCase();
    
    // Heuristic checks (fast)
    const hasQuestion = content.includes('?');
    const isSubstantial = userMessage.length > 100;
    
    // Emotional keywords
    const emotionalKeywords = [
      'feel', 'feeling', 'felt', 'love', 'hate', 'worry', 'worried', 'scared', 'afraid',
      'excited', 'happy', 'sad', 'angry', 'frustrated', 'anxious', 'nervous', 'hope',
      'wish', 'dream', 'fear', 'regret', 'guilt', 'shame', 'pride', 'grateful', 'thankful'
    ];
    const hasEmotion = emotionalKeywords.some(kw => content.includes(kw));
    
    // Vulnerability indicators
    const vulnerabilityIndicators = [
      'i think', 'i feel', 'i\'m', 'honestly', 'to be honest', 'confession',
      'secret', 'never told', 'struggling', 'hard time', 'difficult', 'challenge'
    ];
    const isVulnerable = vulnerabilityIndicators.some(ind => content.includes(ind));
    
    // Decision/commitment keywords
    const commitmentKeywords = [
      'will', 'promise', 'commit', 'plan to', 'going to', 'should i', 'what if',
      'decide', 'choice', 'option'
    ];
    const hasCommitment = commitmentKeywords.some(kw => content.includes(kw));
    
    // Intellectual depth indicators
    const intellectualKeywords = [
      'why', 'how', 'what if', 'theory', 'think about', 'philosophy', 'meaning',
      'understand', 'explain', 'reason', 'because', 'wonder', 'curious'
    ];
    const isIntellectual = intellectualKeywords.some(kw => content.includes(kw));
    
    // Personal disclosure
    const personalIndicators = ['my', 'i\'ve', 'i had', 'i was', 'i am'];
    const isPersonal = personalIndicators.filter(ind => content.includes(ind)).length >= 2;
    
    // Trigger if any significant indicator is present
    const shouldTrigger = 
      hasQuestion ||
      (isSubstantial && (hasEmotion || isVulnerable)) ||
      hasCommitment ||
      (isIntellectual && isSubstantial) ||
      (isPersonal && isSubstantial);
    
    console.log(
      `[InnerThought] Heuristic Trigger: ${shouldTrigger ? '✓ YES' : '✗ NO'} ` +
      `(Q:${hasQuestion}, Len:${userMessage.length}, Emo:${hasEmotion}, Vuln:${isVulnerable})`
    );
    
    return shouldTrigger;
  }

  /**
   * Classify the conversation context using AI
   */
  async classifyContext(
    userMessage: string,
    recentHistory: Message[]
  ): Promise<ContextClassification> {
    try {
      // Format recent history (last 5 messages)
      const historyText = recentHistory
        .slice(-5)
        .map(m => `${m.role}: ${m.content.slice(0, 200)}`)
        .join('\n');
      
      const prompt = CONTEXT_CLASSIFICATION_PROMPT
        .replace('{{HISTORY}}', historyText || 'No recent history')
        .replace('{{MESSAGE}}', userMessage);
      
      const response = await openRouterClient.simpleThought(prompt);
      const jsonText = extractJSON(response);
      
      if (jsonText) {
        try {
          const result = JSON.parse(jsonText) as ContextClassification;
          console.log(`[InnerThought] Context: ${result.context} (${result.confidence.toFixed(2)}) - ${result.reasoning}`);
          return result;
        } catch (parseError) {
          console.error('[InnerThought] Failed to parse context classification JSON:', parseError);
          console.error('[InnerThought] Attempted to parse:', jsonText.slice(0, 200));
        }
      }
    } catch (error) {
      console.error('[InnerThought] Context classification error:', error);
    }
    
    // Fallback to heuristic classification
    return this.heuristicContextClassification(userMessage);
  }

  /**
   * Fallback heuristic context classification
   */
  private heuristicContextClassification(userMessage: string): ContextClassification {
    const content = userMessage.toLowerCase();
    
    // Check for emotional support needs
    if (/feel|worry|scared|sad|struggling|hard time/.test(content)) {
      return {
        context: 'emotional_support',
        confidence: 0.7,
        reasoning: 'Emotional keywords detected'
      };
    }
    
    // Check for flirty
    if (/cute|hot|sexy|date|kiss|attractive/.test(content)) {
      return {
        context: 'flirty',
        confidence: 0.7,
        reasoning: 'Romantic/flirty language detected'
      };
    }
    
    // Check for intellectual
    if (/why|how|theory|philosophy|understand|explain|think about/.test(content) && userMessage.length > 100) {
      return {
        context: 'intellectual_debate',
        confidence: 0.7,
        reasoning: 'Intellectual inquiry detected'
      };
    }
    
    // Check for vulnerable
    if (/honestly|confession|secret|never told|admit/.test(content)) {
      return {
        context: 'vulnerable',
        confidence: 0.7,
        reasoning: 'Vulnerability indicators detected'
      };
    }
    
    // Check for playful
    if (/lol|haha|😂|funny|joke|kidding/.test(content)) {
      return {
        context: 'playful',
        confidence: 0.7,
        reasoning: 'Playful tone detected'
      };
    }
    
    // Default to casual
    return {
      context: 'casual',
      confidence: 0.6,
      reasoning: 'No strong indicators, defaulting to casual'
    };
  }

  /**
   * Analyze complexity to determine Flash vs Pro
   */
  async analyzeComplexity(
    userMessage: string,
    context: ContextClassification
  ): Promise<ComplexityAnalysis> {
    const messageLength = userMessage.length;
    const hasQuestions = (userMessage.match(/\?/g) || []).length > 0;
    const multipleQuestions = (userMessage.match(/\?/g) || []).length > 1;
    
    // Emotional weight (0-1)
    const emotionalKeywords = ['feel', 'love', 'hate', 'worry', 'scared', 'excited', 'sad', 'angry'];
    const emotionalCount = emotionalKeywords.filter(kw => userMessage.toLowerCase().includes(kw)).length;
    const emotionalWeight = Math.min(emotionalCount * 0.3, 1.0);
    
    // Ambiguity score (presence of uncertain language)
    const ambiguityIndicators = ['maybe', 'might', 'could', 'perhaps', 'not sure', 'wonder', 'what if'];
    const ambiguityCount = ambiguityIndicators.filter(ind => userMessage.toLowerCase().includes(ind)).length;
    const ambiguityScore = Math.min(ambiguityCount * 0.25, 1.0);
    
    // Requires nuance (complex contexts or philosophical language)
    const requiresNuance = 
      context.context === 'deep_discussion' ||
      context.context === 'emotional_support' ||
      context.context === 'intellectual_debate' ||
      context.context === 'vulnerable' ||
      /philosophy|meaning|purpose|why do|how come|makes me think/.test(userMessage.toLowerCase());
    
    // Determine complexity level
    const isComplex = 
      messageLength > 150 ||
      multipleQuestions ||
      emotionalWeight > 0.6 ||
      ambiguityScore > 0.5 ||
      requiresNuance;
    
    const analysis: ComplexityAnalysis = {
      level: isComplex ? 'complex' : 'simple',
      factors: {
        messageLength,
        hasQuestions,
        emotionalWeight,
        ambiguityScore,
        requiresNuance
      }
    };
    
    console.log(`[InnerThought] Complexity: ${analysis.level} (Len:${messageLength}, Emo:${emotionalWeight.toFixed(2)}, Nuance:${requiresNuance})`);
    
    return analysis;
  }

  /**
   * Generate inner thought using appropriate AI model
   */
  async generateThought(params: {
    userMessage: string;
    context: ContextClassification;
    personality: PersonalitySnapshot;
    recentMemories: Memory[];
    conversationHistory: Message[];
    complexity: 'simple' | 'complex';
    emotionalThreads?: Array<{topic: string, emotion: string, intensity: number, context: string}>;
  }): Promise<InnerThought> {
    try {
      // Format personality - emphasize top anchors
      const personalityText = params.personality.anchors
        .slice(0, 8) // Top 8 most relevant anchors
        .map(a => `${a.trait} (${(a.value * 100).toFixed(0)}%): ${a.description}`)
        .join('\n');
      
      const moodText = `${params.personality.mood.stance} (valence: ${params.personality.mood.valence.toFixed(2)}, arousal: ${params.personality.mood.arousal.toFixed(2)})`;
      
      // Format emotional threads if present
      const threadsText = params.emotionalThreads && params.emotionalThreads.length > 0
        ? `Ongoing emotional threads:\n${params.emotionalThreads
            .map(t => `- ${t.topic}: ${t.emotion} (intensity: ${(t.intensity * 100).toFixed(0)}%) - ${t.context}`)
            .join('\n')}`
        : '';
      
      // Format memories
      const memoriesText = params.recentMemories.length > 0
        ? params.recentMemories
            .slice(0, 8)
            .map(m => `[${m.type}] ${m.text.slice(0, 150)}`)
            .join('\n')
        : 'No specific memories retrieved';
      
      // Format history
      const historyText = params.conversationHistory
        .slice(-6)
        .map(m => `${m.role}: ${m.content.slice(0, 200)}`)
        .join('\n');
      
      const prompt = INNER_THOUGHT_PROMPT
        .replace('{{PERSONALITY}}', personalityText)
        .replace('{{MOOD}}', moodText)
        .replace('{{CONTEXT}}', params.context.context)
        .replace('{{CONFIDENCE}}', params.context.confidence.toFixed(2))
        .replace('{{EMOTIONAL_THREADS}}', threadsText)
        .replace('{{MEMORIES}}', memoriesText)
        .replace('{{HISTORY}}', historyText || 'No recent history')
        .replace('{{MESSAGE}}', params.userMessage);
      
      // Always use Flash Lite for fast, efficient inner thoughts
      console.log(`[InnerThought] Generating thought using Flash Lite model (complexity: ${params.complexity})...`);
      
      const response = await openRouterClient.simpleThought(prompt);
      const jsonText = extractJSON(response);
      
      if (jsonText) {
        try {
          const thought = JSON.parse(jsonText) as InnerThought;
          console.log(`[InnerThought] Generated: "${thought.thought.slice(0, 80)}..."`);
          console.log(`[InnerThought] Approach: ${thought.responseApproach}, Tone: ${thought.emotionalTone}`);
          return thought;
        } catch (parseError) {
          console.error('[InnerThought] Failed to parse inner thought JSON:', parseError);
          console.error('[InnerThought] Attempted to parse:', jsonText.slice(0, 500));
          console.error('[InnerThought] Full response preview:', response.slice(0, 500));
        }
      } else {
        console.error('[InnerThought] No valid JSON found in response');
        console.error('[InnerThought] Response preview:', response.slice(0, 500));
      }
    } catch (error) {
      console.error('[InnerThought] Thought generation error:', error);
    }
    
    // Fallback thought if AI fails
    return this.generateFallbackThought(params.userMessage, params.context);
  }

  /**
   * Generate a simple fallback thought if AI fails
   */
  private generateFallbackThought(
    userMessage: string,
    context: ContextClassification
  ): InnerThought {
    const fallbackThoughts: Record<ConversationContext, string> = {
      casual: "Just keeping it light and easy. No need to overthink this one.",
      deep_discussion: "This is interesting. I want to really engage with this thoughtfully.",
      flirty: "There's something fun happening here. I can play with this energy.",
      emotional_support: "They need me to really show up right now. This matters.",
      intellectual_debate: "Okay, brain fully engaged. Let's think through this properly.",
      playful: "This is fun! Just gonna lean into the chaos and see where it goes.",
      vulnerable: "They're opening up. I need to meet that with realness, not performance."
    };
    
    return {
      thought: fallbackThoughts[context.context],
      responseApproach: context.context === 'emotional_support' ? 'supportive and warm' : 'engaged and authentic',
      emotionalTone: context.context === 'playful' ? 'light and fun' : 'present and genuine',
      memoryGuidance: {
        shouldStore: context.context === 'vulnerable' || context.context === 'emotional_support',
        importanceModifier: 0,
        additionalContext: `Fallback thought for ${context.context} context`
      },
      moodImpact: {
        valenceDelta: 0,
        arousalDelta: 0.05
      }
    };
  }
}

export const innerThoughtEngine = new InnerThoughtEngine();

