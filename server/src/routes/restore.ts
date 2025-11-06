/**
 * Data Restoration API Endpoints
 * Handles bulk data restoration from LocalStorage backups
 */

import { Express } from 'express';
import { db } from '../db/client.js';

export function setupRestoreRoutes(app: Express) {
  
  // Bulk restore messages
  app.post('/api/messages/bulk-restore', async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Invalid messages array' });
      }

      console.log(`[Restore] Restoring ${messages.length} messages...`);

      // Get existing message IDs to avoid duplicates
      const existingMessages = await db.message.findMany({
        select: { id: true }
      });
      const existingIds = new Set(existingMessages.map(m => m.id));

      let restoredCount = 0;
      let skippedCount = 0;

      for (const msg of messages) {
        // Skip if already exists
        if (existingIds.has(msg.id)) {
          skippedCount++;
          continue;
        }

        try {
          await db.message.create({
            data: {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              tokensIn: msg.tokensIn || 0,
              tokensOut: msg.tokensOut || 0,
              createdAt: new Date(msg.createdAt),
              chapterId: msg.chapterId,
              auxiliary: msg.auxiliary
            }
          });
          restoredCount++;
        } catch (error) {
          console.error(`[Restore] Failed to restore message ${msg.id}:`, error);
        }
      }

      console.log(`[Restore] Restored ${restoredCount} messages, skipped ${skippedCount} duplicates`);
      res.json({ 
        success: true, 
        restored: restoredCount, 
        skipped: skippedCount 
      });
    } catch (error) {
      console.error('[Restore] Bulk message restore error:', error);
      res.status(500).json({ error: 'Failed to restore messages' });
    }
  });

  // Bulk restore search results
  app.post('/api/search-results/bulk-restore', async (req, res) => {
    try {
      const { searchResults } = req.body;
      
      if (!Array.isArray(searchResults) || searchResults.length === 0) {
        return res.status(400).json({ error: 'Invalid search results array' });
      }

      console.log(`[Restore] Restoring ${searchResults.length} search results...`);

      // Get existing search result IDs
      const existingSearches = await db.searchResult.findMany({
        select: { id: true }
      });
      const existingIds = new Set(existingSearches.map(s => s.id));

      let restoredCount = 0;
      let skippedCount = 0;

      for (const sr of searchResults) {
        // Skip if already exists
        if (existingIds.has(sr.id)) {
          skippedCount++;
          continue;
        }

        try {
          await db.searchResult.create({
            data: {
              id: sr.id,
              query: sr.query,
              originalQuery: sr.originalQuery,
              answer: sr.answer,
              citations: JSON.stringify(sr.citations),
              synthesis: sr.synthesis,
              model: sr.model,
              createdAt: new Date(sr.timestamp || sr.createdAt)
            }
          });
          restoredCount++;
        } catch (error) {
          console.error(`[Restore] Failed to restore search result ${sr.id}:`, error);
        }
      }

      console.log(`[Restore] Restored ${restoredCount} search results, skipped ${skippedCount} duplicates`);
      res.json({ 
        success: true, 
        restored: restoredCount, 
        skipped: skippedCount 
      });
    } catch (error) {
      console.error('[Restore] Bulk search result restore error:', error);
      res.status(500).json({ error: 'Failed to restore search results' });
    }
  });

  // Restore personality anchors
  app.post('/api/personality/restore', async (req, res) => {
    try {
      const { anchors, mood } = req.body;

      if (!anchors || !Array.isArray(anchors)) {
        return res.status(400).json({ error: 'Invalid personality data' });
      }

      console.log(`[Restore] Restoring ${anchors.length} personality anchors...`);

      let restoredCount = 0;

      for (const anchor of anchors) {
        try {
          await db.personalityAnchor.upsert({
            where: { trait: anchor.trait },
            create: {
              trait: anchor.trait,
              value: anchor.value,
              evidenceIds: anchor.evidenceIds || '[]',
              description: anchor.description || '',
              lastUpdateAt: new Date()
            },
            update: {
              value: anchor.value,
              lastUpdateAt: new Date()
            }
          });
          restoredCount++;
        } catch (error) {
          console.error(`[Restore] Failed to restore anchor ${anchor.trait}:`, error);
        }
      }

      // Restore mood if provided
      if (mood) {
        await db.moodState.deleteMany({});
        await db.moodState.create({
          data: {
            valence: mood.valence,
            arousal: mood.arousal,
            stance: mood.stance,
            decayHalfLifeMins: mood.decayHalfLifeMins || 30
          }
        });
      }

      console.log(`[Restore] Restored ${restoredCount} personality anchors`);
      res.json({ success: true, restored: restoredCount });
    } catch (error) {
      console.error('[Restore] Personality restore error:', error);
      res.status(500).json({ error: 'Failed to restore personality' });
    }
  });

  // Get restore status
  app.get('/api/restore/status', async (req, res) => {
    try {
      const messageCount = await db.message.count();
      const searchCount = await db.searchResult.count();
      const memoryCount = await db.memory.count();
      const anchorCount = await db.personalityAnchor.count();

      const latestMessage = await db.message.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });

      res.json({
        messageCount,
        searchCount,
        memoryCount,
        anchorCount,
        lastUpdate: latestMessage?.createdAt || null,
        serverTime: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Restore] Status check error:', error);
      res.status(500).json({ error: 'Failed to get restore status' });
    }
  });
}

