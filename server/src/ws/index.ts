import { Server, Socket } from 'socket.io';
import { orchestrator } from '../agent/orchestrator.js';

export function setupWebSocket(io: Server) {
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

    socket.on('dream:start', async () => {
      try {
        const { dreamEngine } = await import('../agent/dream.js');
        await dreamEngine.startDream(socket);
      } catch (error) {
        console.error('Dream start error:', error);
        socket.emit('dream:error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    socket.on('dream:cancel', async () => {
      try {
        const { dreamEngine } = await import('../agent/dream.js');
        await dreamEngine.cancelDream();
      } catch (error) {
        console.error('Dream cancel error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

