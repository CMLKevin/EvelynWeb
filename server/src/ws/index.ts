import { Server, Socket } from 'socket.io';
import { orchestrator } from '../agent/orchestrator.js';
import { browserAgent } from '../agent/browserAgent.js';
import { logger } from '../utils/logger.js';

export function setupWebSocket(io: Server) {
  // Attach logger to WebSocket server
  logger.attachWebSocket(io);
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('chat:send', async (data: { content: string; privacy?: string }) => {
      try {
        await orchestrator.handleMessage(socket, data);
      } catch (error) {
        console.error('Chat error:', error);
        socket.emit('chat:error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    socket.on('diagnostics:subscribe', () => {
      socket.join('diagnostics');
      console.log(`${socket.id} subscribed to diagnostics`);
    });

    socket.on('diagnostics:unsubscribe', () => {
      socket.leave('diagnostics');
      console.log(`${socket.id} unsubscribed from diagnostics`);
    });

    // Logs subscription
    socket.on('logs:subscribe', () => {
      socket.join('logs');
      
      // Send recent logs from current session only (buffer is cleared on server restart)
      const recentLogs = logger.getRecent(300);
      recentLogs.forEach((entry) => {
        socket.emit('logs:line', entry);
      });
    });

    socket.on('logs:unsubscribe', () => {
      socket.leave('logs');
    });

    // Agentic browsing events
    socket.on('agent:start', async (data: { query: string; maxPages?: number; maxDurationMs?: number; userMessageId?: number }) => {
      try {
        console.log(`[WebSocket] agent:start received:`, data);
        const sessionId = await browserAgent.startSession(socket, {
          initialQuery: data.query,
          maxPages: data.maxPages,
          maxDurationMs: data.maxDurationMs,
          userMessageId: data.userMessageId
        });
        console.log(`[WebSocket] Created browsing session: ${sessionId}`);
      } catch (error) {
        console.error('Agent start error:', error);
        socket.emit('agent:error', { 
          message: error instanceof Error ? error.message : 'Failed to start browsing session' 
        });
      }
    });

    socket.on('agent:approve', async (data: { sessionId: string }) => {
      try {
        console.log(`[WebSocket] agent:approve received:`, data);
        await browserAgent.approveSession(socket, data.sessionId);
      } catch (error) {
        console.error('Agent approve error:', error);
        socket.emit('agent:error', { 
          sessionId: data.sessionId,
          message: error instanceof Error ? error.message : 'Failed to approve session' 
        });
      }
    });

    socket.on('agent:cancel', async (data: { sessionId: string }) => {
      try {
        console.log(`[WebSocket] agent:cancel received:`, data);
        await browserAgent.cancelSession(data.sessionId);
        socket.emit('agent:status', {
          sessionId: data.sessionId,
          step: 'cancelled',
          detail: 'Session cancelled by user'
        });
      } catch (error) {
        console.error('Agent cancel error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

