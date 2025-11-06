import { create } from 'zustand';
import { localStorageManager } from '../lib/localStorage';
import { syncManager } from '../lib/syncManager';

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  auxiliary?: any;
}

interface Activity {
  id: number;
  tool: string;
  status: string;
  messageId?: number;
  summary?: string;
  inputSummary?: string;
  outputSummary?: string;
  query?: string;
  citationCount?: number;
  metadata?: {
    thought?: string;
    context?: string;
    contextConfidence?: number;
    contextReasoning?: string;
    responseApproach?: string;
    emotionalTone?: string;
    complexity?: string;
    memoryGuidance?: any;
    moodImpact?: any;
    memoryCount?: number;
  };
  createdAt?: string;
  finishedAt?: string;
}

interface SearchResult {
  id: number;
  query: string;
  originalQuery?: string;
  answer: string;
  citations: string[];
  synthesis: string;
  model: string;
  timestamp: string;
}

interface Personality {
  anchors: Array<{ trait: string; value: number; description: string }>;
  mood: { valence: number; arousal: number; stance: string };
}

interface RelationshipState {
  id: number;
  userId: number | null;
  closeness: number;
  trust: number;
  flirtation: number;
  boundaries: { topics: string[]; notes: string } | null;
  stage: string;
  lastUpdateAt: string;
}

interface PersonaBelief {
  id: number;
  subject: string;
  statement: string;
  confidence: number;
  evidenceIds: number[];
  lastUpdateAt: string;
}

interface PersonaGoal {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: number;
  progress: number;
  evidenceIds: number[];
  createdAt: string;
  updatedAt: string;
}

interface PersonaEvolutionEvent {
  id: number;
  type: string;
  target: string;
  delta: number | null;
  rationale: string;
  evidenceIds: number[];
  metadata: any;
  createdAt: string;
}

interface FullPersona {
  anchors: Array<{ trait: string; value: number; description: string }>;
  mood: { valence: number; arousal: number; stance: string };
  relationship: RelationshipState;
  beliefs: PersonaBelief[];
  goals: PersonaGoal[];
}

interface ContextUsage {
  tokens: number;
  maxTokens: number;
  percentage: number;
  messageCount: number;
  truncated: boolean;
  removedMessages?: number;
  timestamp: string;
}

interface ReflectionEvent {
  type: 'start' | 'complete';
  conversationsProcessed?: number;
  newMemoriesCount?: number;
  summary?: string;
  newBeliefs?: number;
  updatedBeliefs?: number;
  newGoals?: number;
  updatedGoals?: number;
  anchorNudges?: number;
  duration?: string;
  timestamp: string;
}

interface BeliefEvent {
  id: number;
  subject: string;
  statement: string;
  confidence: number;
  rationale: string;
  evidenceIds: number[];
  timestamp: string;
}

interface GoalEvent {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: number;
  rationale: string;
  timestamp: string;
}

interface Store {
  connected: boolean;
  messages: Message[];
  currentMessage: string;
  activities: Activity[];
  searchResults: SearchResult[];
  personality: Personality | null;
  persona: FullPersona | null;
  evolutionEvents: PersonaEvolutionEvent[];
  reflectionEvents: ReflectionEvent[];
  beliefEvents: BeliefEvent[];
  goalEvents: GoalEvent[];
  showDiagnostics: boolean;
  error: string | null;
  dreamStatus: any;
  contextUsage: ContextUsage | null;
  
  setConnected: (connected: boolean) => void;
  addMessage: (message: Message) => void;
  appendToCurrentMessage: (token: string) => void;
  completeMessage: () => void;
  updateActivity: (activity: Activity) => void;
  setActivities: (activities: Activity[]) => void;
  addSearchResult: (result: SearchResult) => void;
  setPersonality: (personality: Personality) => void;
  setPersona: (persona: FullPersona) => void;
  setEvolutionEvents: (events: PersonaEvolutionEvent[]) => void;
  toggleDiagnostics: () => void;
  setError: (error: string | null) => void;
  updateDreamStatus: (status: any) => void;
  updateContextUsage: (usage: Omit<ContextUsage, 'timestamp'>) => void;
  addReflectionEvent: (event: Omit<ReflectionEvent, 'id'>) => void;
  addBeliefEvent: (event: BeliefEvent) => void;
  addGoalEvent: (event: GoalEvent) => void;
  clearMessages: () => void;
  loadMessages: () => Promise<void>;
  loadActivities: () => Promise<void>;
  loadSearchResults: () => Promise<void>;
  loadPersona: () => Promise<void>;
  loadEvolutionEvents: () => Promise<void>;
  syncWithLocalStorage: () => Promise<any>;
  saveToLocalStorage: () => void;
  performFullSync: () => Promise<any>;
}

export const useStore = create<Store>((set, get) => ({
  connected: false,
  messages: [],
  currentMessage: '',
  activities: [],
  searchResults: [],
  personality: null,
  persona: null,
  evolutionEvents: [],
  reflectionEvents: [],
  beliefEvents: [],
  goalEvents: [],
  showDiagnostics: true,
  error: null,
  dreamStatus: null,
  contextUsage: null,

  setConnected: (connected) => set({ connected }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  appendToCurrentMessage: (token) => set((state) => ({
    currentMessage: state.currentMessage + token
  })),

  completeMessage: () => {
    const content = get().currentMessage;
    if (content) {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: Date.now(),
            role: 'assistant',
            content,
            createdAt: new Date().toISOString()
          }
        ],
        currentMessage: ''
      }));
    }
  },

  updateActivity: (activity) => set((state) => {
    const existing = state.activities.findIndex(a => a.id === activity.id);
    if (existing >= 0) {
      const newActivities = [...state.activities];
      newActivities[existing] = activity;
      return { activities: newActivities };
    }
    return { activities: [...state.activities, activity] };
  }),

  setActivities: (activities) => set({ activities }),

  addSearchResult: (result) => set((state) => ({
    searchResults: [...state.searchResults, result]
  })),

  setPersonality: (personality) => set({ personality }),
  
  setPersona: (persona) => set({ persona }),
  
  setEvolutionEvents: (events) => set({ evolutionEvents: events }),
  
  toggleDiagnostics: () => set((state) => ({
    showDiagnostics: !state.showDiagnostics
  })),

  setError: (error) => set({ error }),
  
  updateDreamStatus: (dreamStatus) => set({ dreamStatus }),
  
  updateContextUsage: (usage) => set({ 
    contextUsage: { ...usage, timestamp: new Date().toISOString() } 
  }),

  addReflectionEvent: (event) => set((state) => ({
    reflectionEvents: [event as ReflectionEvent, ...state.reflectionEvents].slice(0, 20)
  })),

  addBeliefEvent: (event) => set((state) => ({
    beliefEvents: [event, ...state.beliefEvents].slice(0, 50)
  })),

  addGoalEvent: (event) => set((state) => ({
    goalEvents: [event, ...state.goalEvents].slice(0, 50)
  })),
  
  clearMessages: () => set({ messages: [], currentMessage: '' }),

  loadMessages: async () => {
    try {
      console.log('[Store] Loading historical messages...');
      const response = await fetch('/api/messages?limit=100');
      if (response.ok) {
        const messages = await response.json();
        console.log(`[Store] Loaded ${messages.length} historical messages`);
        set({ messages });
      }
    } catch (error) {
      console.error('[Store] Failed to load messages:', error);
    }
  },

  loadActivities: async () => {
    try {
      console.log('[Store] Loading historical activities...');
      const response = await fetch('/api/activities?limit=50');
      if (response.ok) {
        const activities = await response.json();
        console.log(`[Store] Loaded ${activities.length} activities`);
        set({ activities });
      }
    } catch (error) {
      console.error('[Store] Failed to load activities:', error);
    }
  },

  loadSearchResults: async () => {
    try {
      console.log('[Store] Loading historical search results...');
      const response = await fetch('/api/search-results?limit=50');
      if (response.ok) {
        const searchResults = await response.json();
        console.log(`[Store] Loaded ${searchResults.length} search results`);
        set({ searchResults });
      }
    } catch (error) {
      console.error('[Store] Failed to load search results:', error);
    }
  },

  loadPersona: async () => {
    try {
      console.log('[Store] Loading persona snapshot...');
      const response = await fetch('/api/persona');
      if (response.ok) {
        const persona = await response.json();
        console.log('[Store] Loaded persona snapshot');
        set({ persona });
      }
    } catch (error) {
      console.error('[Store] Failed to load persona:', error);
    }
  },

  loadEvolutionEvents: async () => {
    try {
      console.log('[Store] Loading evolution events...');
      const response = await fetch('/api/persona/evolution?limit=50');
      if (response.ok) {
        const events = await response.json();
        console.log(`[Store] Loaded ${events.length} evolution events`);
        set({ evolutionEvents: events });
      }
    } catch (error) {
      console.error('[Store] Failed to load evolution events:', error);
    }
  },

  syncWithLocalStorage: async () => {
    try {
      console.log('[Store] Syncing with LocalStorage...');
      const result = await syncManager.performSync();
      console.log('[Store] Sync complete:', result);
      
      // Reload data after sync
      await get().loadMessages();
      await get().loadSearchResults();
      
      return result;
    } catch (error) {
      console.error('[Store] Sync failed:', error);
    }
  },

  saveToLocalStorage: () => {
    const state = get();
    localStorageManager.saveAll({
      messages: state.messages,
      searchResults: state.searchResults,
      personality: state.personality,
      activities: state.activities,
      settings: {}
    });
  },

  performFullSync: async () => {
    return await get().syncWithLocalStorage();
  }
}));

