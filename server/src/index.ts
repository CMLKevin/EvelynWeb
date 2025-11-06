import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupWebSocket } from './ws/index.js';
import { setupRoutes } from './routes/index.js';
import { backupManager } from './db/backup.js';
import { initializePersonaDefaults } from './agent/personaInit.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5000',
  credentials: true
}));
app.use(express.json());

// Setup routes
setupRoutes(app, io);

// Setup WebSocket
setupWebSocket(io);

// Initialize backup system
async function initializeBackupSystem() {
  try {
    // Create startup backup
    console.log('[Backup] Creating startup backup...');
    await backupManager.createBackup('auto', 'startup');
    
    // Start automatic backup system
    backupManager.startAutomaticBackups();
    
    console.log('[Backup] Multi-layer backup system initialized ✓');
  } catch (error) {
    console.error('[Backup] Failed to initialize backup system:', error);
  }
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  console.log(`🚀 Evelyn server running on port ${PORT}`);
  console.log(`📡 WebSocket ready for connections`);
  
  // Initialize backup system after server starts
  await initializeBackupSystem();
  
  // Initialize persona defaults
  await initializePersonaDefaults();
});

