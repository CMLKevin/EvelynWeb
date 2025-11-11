import { io, Socket } from 'socket.io-client';
import { useStore } from '../state/store';

class WSClient {
  private socket: Socket | null = null;
  private url: string = 'http://localhost:3001';
  private isConnecting: boolean = false;
  
  // Batching for performance
  private tokenBuffer: string[] = [];
  private tokenBatchTimeout: NodeJS.Timeout | null = null;
  private logBuffer: any[] = [];
  private logBatchTimeout: NodeJS.Timeout | null = null;
  
  // Message deduplication
  private lastSentMessage: string = '';
  private lastSentTime: number = 0;

  connect() {
    // Prevent duplicate connections - check if already connected or connecting
    if (this.socket?.connected) {
      console.log('[WS] Already connected, skipping duplicate connection');
      return;
    }
    
    if (this.isConnecting) {
      console.log('[WS] Connection in progress, skipping duplicate connection');
      return;
    }

    this.isConnecting = true;
    console.log('[WS] Initiating connection...');
    
    // If socket exists but is not connected, clean it up first
    if (this.socket) {
      console.log('[WS] Cleaning up existing disconnected socket');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(this.url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Connected to Evelyn server');
      this.isConnecting = false;
      useStore.getState().setConnected(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnecting = false;
      useStore.getState().setConnected(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      this.isConnecting = false;
    });

    // Batch token updates for performance
    this.socket.on('chat:token', (token: string) => {
      this.tokenBuffer.push(token);
      
      // Clear existing timeout
      if (this.tokenBatchTimeout) {
        clearTimeout(this.tokenBatchTimeout);
      }
      
      // Flush immediately if buffer is large, otherwise debounce
      if (this.tokenBuffer.length >= 10) {
        this.flushTokenBuffer();
      } else {
        this.tokenBatchTimeout = setTimeout(() => this.flushTokenBuffer(), 16); // ~60fps
      }
    });

    this.socket.on('chat:complete', () => {
      // Flush any remaining tokens before completing
      this.flushTokenBuffer();
      useStore.getState().completeMessage();
    });

    this.socket.on('chat:error', (data: { error: string }) => {
      useStore.getState().setError(data.error);
    });

    this.socket.on('subroutine:status', (data: any) => {
      useStore.getState().updateActivity(data);
    });

    this.socket.on('search:results', (data: any) => {
      console.log('[WS] Search results received:', data);
      useStore.getState().addSearchResult({
        ...data,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('dream:status', (data: any) => {
      useStore.getState().updateDreamStatus(data);
    });

    this.socket.on('dream:message', (data: { content: string }) => {
      useStore.getState().addMessage({
        id: Date.now(),
        role: 'assistant',
        content: data.content,
        createdAt: new Date().toISOString()
      });
    });

    this.socket.on('context:usage', (data: any) => {
      useStore.getState().updateContextUsage(data);
    });

    // Reflection events
    this.socket.on('reflection:start', (data: any) => {
      console.log('[WS] Reflection started:', data);
      useStore.getState().addReflectionEvent({
        type: 'start',
        ...data
      });
    });

    this.socket.on('reflection:complete', (data: any) => {
      console.log('[WS] Reflection complete:', data);
      useStore.getState().addReflectionEvent({
        type: 'complete',
        ...data
      });
    });

    this.socket.on('belief:created', (data: any) => {
      console.log('[WS] New belief created:', data);
      useStore.getState().addBeliefEvent(data);
    });

    this.socket.on('goal:created', (data: any) => {
      console.log('[WS] New goal created:', data);
      useStore.getState().addGoalEvent(data);
    });

    // Agentic browsing events
    this.socket.on('agent:request-approval', (data: any) => {
      console.log('[WS] Agent requesting approval:', data);
      useStore.getState().setAgentApprovalRequest(data);
    });

    this.socket.on('agent:status', (data: any) => {
      console.log('[WS] Agent status:', data);
      useStore.getState().updateAgentStatus(data);
    });

    this.socket.on('agent:page', (data: any) => {
      console.log('[WS] Agent page visit:', data);
      useStore.getState().addAgentPage(data);
    });

    this.socket.on('agent:complete', (data: any) => {
      console.log('[WS] Agent session complete:', data);
      useStore.getState().completeAgentSession(data);
    });

    this.socket.on('agent:browsing-results', (data: any) => {
      console.log('[WS] Agent browsing results:', data);
      useStore.getState().addBrowsingResult(data);
    });

    this.socket.on('agent:error', (data: any) => {
      console.error('[WS] Agent error:', data);
      useStore.getState().setAgentError(data);
    });

    // Batch log updates for performance
    this.socket.on('logs:line', (data: any) => {
      this.logBuffer.push(data);
      
      // Clear existing timeout
      if (this.logBatchTimeout) {
        clearTimeout(this.logBatchTimeout);
      }
      
      // Flush immediately if buffer is large, otherwise debounce
      if (this.logBuffer.length >= 5) {
        this.flushLogBuffer();
      } else {
        this.logBatchTimeout = setTimeout(() => this.flushLogBuffer(), 50); // 20 updates/sec max
      }
    });
  }

  // Flush batched tokens
  private flushTokenBuffer() {
    if (this.tokenBuffer.length > 0) {
      const combinedTokens = this.tokenBuffer.join('');
      useStore.getState().appendToCurrentMessage(combinedTokens);
      this.tokenBuffer = [];
    }
    if (this.tokenBatchTimeout) {
      clearTimeout(this.tokenBatchTimeout);
      this.tokenBatchTimeout = null;
    }
  }

  // Flush batched logs
  private flushLogBuffer() {
    if (this.logBuffer.length > 0) {
      // Add all logs in batch
      this.logBuffer.forEach(log => {
        useStore.getState().addLogEntry(log);
    });
      this.logBuffer = [];
    }
    if (this.logBatchTimeout) {
      clearTimeout(this.logBatchTimeout);
      this.logBatchTimeout = null;
    }
  }

  disconnect() {
    // Flush any pending batched updates
    this.flushTokenBuffer();
    this.flushLogBuffer();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    this.socket = null;
    }
    this.isConnecting = false;
  }

  sendMessage(content: string, privacy?: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }
    
    // Prevent duplicate messages within 1 second window
    const now = Date.now();
    if (content === this.lastSentMessage && now - this.lastSentTime < 1000) {
      console.warn('[WS] Duplicate message detected and prevented:', content.slice(0, 50));
      return;
    }
    
    // Update deduplication tracking
    this.lastSentMessage = content;
    this.lastSentTime = now;
    
    console.log('[WS] Sending message:', content.slice(0, 50) + '...');
    this.socket.emit('chat:send', { content, privacy });
  }

  subscribeDiagnostics() {
    this.socket?.emit('diagnostics:subscribe');
  }

  unsubscribeDiagnostics() {
    this.socket?.emit('diagnostics:unsubscribe');
  }

  startDream() {
    this.socket?.emit('dream:start');
  }

  cancelDream() {
    this.socket?.emit('dream:cancel');
  }

  // Agentic browsing methods
  startAgentSession(query: string, maxPages?: number, maxDurationMs?: number, userMessageId?: number) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }
    this.socket.emit('agent:start', { query, maxPages, maxDurationMs, userMessageId });
  }

  approveAgentSession(sessionId: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }
    this.socket.emit('agent:approve', { sessionId });
  }

  cancelAgentSession(sessionId: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }
    this.socket.emit('agent:cancel', { sessionId });
  }

  // Logs methods
  subscribeLogs() {
    this.socket?.emit('logs:subscribe');
  }

  unsubscribeLogs() {
    this.socket?.emit('logs:unsubscribe');
  }
}

export const wsClient = new WSClient();

