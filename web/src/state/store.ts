import { create } from 'zustand';

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
    responseLength?: string;
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

interface AgentPage {
  url: string;
  title: string;
  keyPoints: string[];
  screenshotBase64?: string;
  favicon?: string;
  timestamp: string;
  evelynThought?: string;
  evelynReaction?: string;
}

interface AgentSession {
  sessionId: string | null;
  approved: boolean;
  isActive: boolean;
  startedAt: string | null;
  currentStep: string | null;
  currentDetail: string | null;
  pages: AgentPage[];
  pageCount: number;
  maxPages: number;
  error: string | null;
  summary: string | null;
  evelynIntent?: string;
  query?: string;
  entryUrl?: string;
  estimatedTime?: number;
}

interface BrowsingResult {
  sessionId: string;
  query: string;
  summary: string;
  pages: Array<{
    title: string;
    url: string;
    keyPoints: string[];
    evelynThought?: string;
    evelynReaction?: string;
  }>;
  timestamp: string;
  messageId: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

interface UIState {
  activeTab: 'chat' | 'logs' | 'diagnostics';
  commandPaletteOpen: boolean;
  quickSearchOpen: boolean;
  reducedMotion: boolean;
}

interface CommandHistory {
  entries: string[];
  index: number;
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
  agentSession: AgentSession;
  browsingResults: BrowsingResult[];
  
  // Logs state
  logs: LogEntry[];
  logsMaxSize: number;
  logsPaused: boolean;
  
  // UI state
  uiState: UIState;
  
  // Command history
  commandHistory: CommandHistory;
  
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
  deleteMessage: (messageId: number) => Promise<void>;
  loadMessages: () => Promise<void>;
  loadActivities: () => Promise<void>;
  loadSearchResults: () => Promise<void>;
  loadPersona: () => Promise<void>;
  loadEvolutionEvents: () => Promise<void>;
  
  // Agent browsing state actions
  setAgentApprovalRequest: (data: any) => void;
  updateAgentStatus: (data: any) => void;
  addAgentPage: (page: AgentPage) => void;
  completeAgentSession: (data: any) => void;
  setAgentError: (data: any) => void;
  resetAgentSession: () => void;
  addBrowsingResult: (result: BrowsingResult) => void;
  
  // Logs actions
  addLogEntry: (entry: LogEntry) => void;
  clearLogs: () => void;
  setLogsPaused: (paused: boolean) => void;
  loadLogs: () => Promise<void>;
  
  // UI actions
  setActiveTab: (tab: 'chat' | 'logs' | 'diagnostics') => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuickSearchOpen: (open: boolean) => void;
  
  // Command history actions
  addToHistory: (command: string) => void;
  navigateHistory: (direction: 'up' | 'down') => string | null;
  resetHistoryIndex: () => void;
}

export const useStore = create<Store>((set, get) => ({
  connected: false,
  messages: [],
  currentMessage: '',
  activities: [],
  searchResults: [],
  browsingResults: [],
  agentSession: {
    sessionId: null,
    approved: false,
    isActive: false,
    startedAt: null,
    currentStep: null,
    currentDetail: null,
    pages: [],
    pageCount: 0,
    maxPages: 5,
    error: null,
    summary: null
  },
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
  
  // Logs state
  logs: [],
  logsMaxSize: 1000,
  logsPaused: false,
  
  // UI state
  uiState: {
    activeTab: 'chat',
    commandPaletteOpen: false,
    quickSearchOpen: false,
    reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  },
  
  // Command history
  commandHistory: {
    entries: [],
    index: -1,
  },

  setConnected: (connected) => set({ connected }),
  
  addMessage: (message) => {
    // Check if this message contains browsing results in auxiliary
    let newBrowsingResult: BrowsingResult | null = null;
    if (message.auxiliary) {
      try {
        const aux = typeof message.auxiliary === 'string' ? JSON.parse(message.auxiliary) : message.auxiliary;
        if (aux.type === 'browsing_trigger' && aux.browsingResults) {
          newBrowsingResult = {
            sessionId: aux.sessionId,
            query: aux.query,
            summary: aux.browsingResults.summary,
            pages: aux.browsingResults.pages,
            timestamp: aux.browsingResults.timestamp,
            messageId: message.id
          };
        }
      } catch (e) {
        console.error('[Store] Failed to parse message auxiliary:', e);
      }
    }

    set((state) => ({
      messages: [...state.messages, message],
      browsingResults: newBrowsingResult 
        ? [...state.browsingResults, newBrowsingResult]
        : state.browsingResults
    }));
  },

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
      // Merge the new activity data with existing to preserve any fields
      newActivities[existing] = {
        ...newActivities[existing],
        ...activity,
        // Ensure metadata is deeply merged if both exist
        metadata: activity.metadata ? {
          ...newActivities[existing].metadata,
          ...activity.metadata
        } : newActivities[existing].metadata
      };
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

  deleteMessage: async (messageId: number) => {
    try {
      console.log(`[Store] Deleting message ID: ${messageId}`);
      const response = await fetch(`http://localhost:3001/api/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete message: ${error}`);
      }

      // Remove message from local state and related browsing results
      set((state) => ({
        messages: state.messages.filter(msg => msg.id !== messageId),
        browsingResults: state.browsingResults.filter(br => br.messageId !== messageId)
      }));

      console.log(`[Store] Message ${messageId} deleted successfully`);
    } catch (error) {
      console.error('[Store] Delete message error:', error);
      throw error;
    }
  },

  loadMessages: async () => {
    try {
      console.log('[Store] Loading historical messages...');
      const response = await fetch('http://localhost:3001/api/messages?limit=100');
      if (response.ok) {
        const messages = await response.json();
        console.log(`[Store] Loaded ${messages.length} historical messages`);
        set({ messages });

        // Reconstruct browsing results from message auxiliary data
        const reconstructedBrowsingResults: BrowsingResult[] = [];
        for (const msg of messages) {
          if (msg.auxiliary) {
            try {
              const aux = typeof msg.auxiliary === 'string' ? JSON.parse(msg.auxiliary) : msg.auxiliary;
              if (aux.type === 'browsing_trigger' && aux.browsingResults) {
                reconstructedBrowsingResults.push({
                  sessionId: aux.sessionId,
                  query: aux.query,
                  summary: aux.browsingResults.summary,
                  pages: aux.browsingResults.pages,
                  timestamp: aux.browsingResults.timestamp,
                  messageId: msg.id
                });
                console.log(`[Store] Reconstructed browsing result for session: ${aux.sessionId}`);
              }
            } catch (e) {
              console.error('[Store] Failed to parse message auxiliary:', e);
            }
          }
        }

        if (reconstructedBrowsingResults.length > 0) {
          set({ browsingResults: reconstructedBrowsingResults });
          console.log(`[Store] Reconstructed ${reconstructedBrowsingResults.length} browsing results`);
        }
      }
    } catch (error) {
      console.error('[Store] Failed to load messages:', error);
    }
  },

  loadActivities: async () => {
    try {
      console.log('[Store] Loading historical activities...');
      const response = await fetch('http://localhost:3001/api/activities?limit=50');
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
      const response = await fetch('http://localhost:3001/api/search-results?limit=50');
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
      const response = await fetch('http://localhost:3001/api/persona');
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
      const response = await fetch('http://localhost:3001/api/persona/evolution?limit=50');
      if (response.ok) {
        const events = await response.json();
        console.log(`[Store] Loaded ${events.length} evolution events`);
        set({ evolutionEvents: events });
      }
    } catch (error) {
      console.error('[Store] Failed to load evolution events:', error);
    }
  },

  // Agent browsing actions
  setAgentApprovalRequest: (data) => set((state) => ({
    agentSession: {
      ...state.agentSession,
      sessionId: data.sessionId,
      isActive: false,
      approved: false,
      evelynIntent: data.evelynIntent,
      query: data.query,
      entryUrl: data.entryUrl,
      maxPages: data.maxPages || 5,
      estimatedTime: data.estimatedTime,
      startedAt: new Date().toISOString(),
      pages: [],
      pageCount: 0,
      error: null,
      summary: null
    }
  })),

  updateAgentStatus: (data) => set((state) => ({
    agentSession: {
      ...state.agentSession,
      isActive: true,
      currentStep: data.step,
      currentDetail: data.detail,
      pageCount: data.pageCount || state.agentSession.pageCount,
      maxPages: data.maxPages || state.agentSession.maxPages
    }
  })),

  addAgentPage: (page) => set((state) => ({
    agentSession: {
      ...state.agentSession,
      pages: [...state.agentSession.pages, page],
      pageCount: state.agentSession.pages.length + 1
    }
  })),

  completeAgentSession: (data) => set((state) => ({
    agentSession: {
      ...state.agentSession,
      isActive: false,
      currentStep: 'complete',
      summary: data.summary,
      error: null
    }
  })),

  setAgentError: (data) => set((state) => ({
    agentSession: {
      ...state.agentSession,
      isActive: false,
      error: data.message,
      currentStep: 'error'
    }
  })),

  addBrowsingResult: (result) => set((state) => ({
    browsingResults: [...state.browsingResults, result]
  })),

  resetAgentSession: () => set({
    agentSession: {
      sessionId: null,
      approved: false,
      isActive: false,
      startedAt: null,
      currentStep: null,
      currentDetail: null,
      pages: [],
      pageCount: 0,
      maxPages: 5,
      error: null,
      summary: null
    }
  }),

  // Logs actions
  addLogEntry: (entry) => set((state) => {
    if (state.logsPaused) return state;
    
    const newLogs = [...state.logs, entry];
    if (newLogs.length > state.logsMaxSize) {
      newLogs.shift();
    }
    return { logs: newLogs };
  }),

  clearLogs: () => set({ logs: [] }),

  setLogsPaused: (paused) => set({ logsPaused: paused }),

  loadLogs: async () => {
    try {
      const response = await fetch('http://localhost:3001/api/logs?limit=300');
      if (response.ok) {
        const data = await response.json();
        set({ logs: data.logs || [] });
      }
    } catch (error) {
      console.error('[Store] Failed to load logs:', error);
    }
  },

  // UI actions
  setActiveTab: (tab) => set((state) => ({
    uiState: { ...state.uiState, activeTab: tab }
  })),

  setCommandPaletteOpen: (open) => set((state) => ({
    uiState: { ...state.uiState, commandPaletteOpen: open }
  })),

  setQuickSearchOpen: (open) => set((state) => ({
    uiState: { ...state.uiState, quickSearchOpen: open }
  })),

  // Command history actions
  addToHistory: (command) => set((state) => {
    const trimmed = command.trim();
    if (!trimmed || (state.commandHistory.entries.length > 0 && 
        state.commandHistory.entries[state.commandHistory.entries.length - 1] === trimmed)) {
      return state;
    }
    
    const newEntries = [...state.commandHistory.entries, trimmed];
    if (newEntries.length > 100) {
      newEntries.shift();
    }
    
    return {
      commandHistory: {
        entries: newEntries,
        index: -1
      }
    };
  }),

  navigateHistory: (direction) => {
    const state = get();
    const { entries, index } = state.commandHistory;
    
    if (entries.length === 0) return null;
    
    let newIndex = index;
    if (direction === 'up') {
      if (index === -1) {
        newIndex = entries.length - 1;
      } else if (index > 0) {
        newIndex = index - 1;
      }
    } else {
      if (index === -1) return null;
      if (index < entries.length - 1) {
        newIndex = index + 1;
      } else {
        newIndex = -1;
      }
    }
    
    set((state) => ({
      commandHistory: { ...state.commandHistory, index: newIndex }
    }));
    
    return newIndex === -1 ? '' : entries[newIndex];
  },

  resetHistoryIndex: () => set((state) => ({
    commandHistory: { ...state.commandHistory, index: -1 }
  }))
}));

