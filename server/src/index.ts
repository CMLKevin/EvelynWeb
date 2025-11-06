import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupWebSocket } from './ws/index.js';
import { setupRoutes } from './routes/index.js';
import { backupManager } from './db/backup.js';
import { initializePersonaDefaults } from './agent/personaInit.js';
import temporalEngine from './core/temporalEngine.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the server directory (parent of src)
const serverDir = join(__dirname, '..');
dotenv.config({ path: join(serverDir, '.env') });

// Fix DATABASE_URL to use absolute path if it's relative
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:./')) {
  const dbPath = process.env.DATABASE_URL.replace('file:./', '');
  process.env.DATABASE_URL = `file:${join(serverDir, dbPath)}`;
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
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

// Track server start time for uptime calculation
let serverStartTime: number;

httpServer.listen(PORT, async () => {
  serverStartTime = Date.now();
  console.log(`🚀 Evelyn server running on port ${PORT}`);
  console.log(`📡 WebSocket ready for connections\n`);
  
  // Initialize temporal engine (system clock-based calculations)
  await temporalEngine.initialize();
  
  // Initialize backup system after server starts
  await initializeBackupSystem();
  
  // Initialize persona defaults
  await initializePersonaDefaults();
  
  console.log('✨ All systems initialized\n');
});

// Graceful shutdown handlers
async function gracefulShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal} signal, shutting down gracefully...`);
  
  // Calculate uptime
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  
  // Record shutdown event in temporal engine
  await temporalEngine.recordShutdown(uptimeSeconds);
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

