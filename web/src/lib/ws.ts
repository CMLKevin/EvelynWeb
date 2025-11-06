import { io, Socket } from 'socket.io-client';
import { useStore } from '../state/store';

class WSClient {
  private socket: Socket | null = null;
  private url: string = 'http://localhost:3001';

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(this.url, {
      transports: ['websocket'],
      reconnection: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to Evelyn server');
      useStore.getState().setConnected(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      useStore.getState().setConnected(false);
    });

    this.socket.on('chat:token', (token: string) => {
      useStore.getState().appendToCurrentMessage(token);
    });

    this.socket.on('chat:complete', () => {
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
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  sendMessage(content: string, privacy?: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }
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
}

export const wsClient = new WSClient();

