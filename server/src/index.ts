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
    const startTime = Date.now();
    await backupManager.createBackup('auto', 'startup');
    backupManager.startAutomaticBackups();
    const elapsedMs = Date.now() - startTime;
    console.log(`[Backup] 💾 System initialized in ${elapsedMs}ms | auto-saves enabled`);
  } catch (error) {
    console.error('[Backup] ❌ Init failed:', error.message || error);
  }
}

const PORT = process.env.PORT || 3001;

// Track server start time for uptime calculation
let serverStartTime: number;

httpServer.listen(PORT, async () => {
  serverStartTime = Date.now();
  const bootStart = Date.now();
  
  console.log(`\n[Server] 🚀 Starting Evelyn on port ${PORT}...`);
  
  // Initialize temporal engine (system clock-based calculations)
  await temporalEngine.initialize();
  
  // Initialize backup system after server starts
  await initializeBackupSystem();
  
  // Initialize persona defaults
  await initializePersonaDefaults();
  
  const bootTime = Date.now() - bootStart;
  console.log(`[Server] ✨ All systems ready in ${bootTime}ms | port ${PORT} | WebSocket online\n`);
});

// Graceful shutdown handlers
async function gracefulShutdown(signal: string) {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  console.log(`\n[Server] 🛑 ${signal} received | shutting down gracefully...`);
  
  await temporalEngine.recordShutdown(uptimeSeconds);
  
  httpServer.close(() => {
    console.log(`[Server] ✅ Shutdown complete | goodbye!\n`);
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('[Server] ⚠️ Force shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

