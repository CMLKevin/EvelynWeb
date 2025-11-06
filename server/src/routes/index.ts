import { Express } from 'express';
import { Server } from 'socket.io';
import { db } from '../db/client.js';
import { setupRestoreRoutes } from './restore.js';
import { setupBackupRoutes } from './backup.js';

export function setupRoutes(app: Express, io: Server) {
  
  // Setup restore routes
  setupRestoreRoutes(app);
  
  // Setup backup routes
  setupBackupRoutes(app);
  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get messages
  app.get('/api/messages', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      
      const messages = await db.message.findMany({
        where: before ? { id: { lt: before } } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          chapter: {
            select: { id: true, title: true }
          }
        }
      });
      
      res.json(messages.reverse());
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Get chapters
  app.get('/api/chapters', async (req, res) => {
    try {
      const chapters = await db.chapter.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      res.json(chapters);
    } catch (error) {
      console.error('Get chapters error:', error);
      res.status(500).json({ error: 'Failed to fetch chapters' });
    }
  });

  // Get memories
  app.get('/api/memories', async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const memories = await db.memory.findMany({
        where: type ? { type: type as any } : undefined,
        orderBy: [
          { importance: 'desc' },
          { lastAccessedAt: 'desc' }
        ],
        take: limit
      });
      
      res.json(memories);
    } catch (error) {
      console.error('Get memories error:', error);
      res.status(500).json({ error: 'Failed to fetch memories' });
    }
  });

  // Delete specific memory
  app.delete('/api/memories/:id', async (req, res) => {
    try {
      const memoryId = parseInt(req.params.id);
      
      if (isNaN(memoryId)) {
        return res.status(400).json({ error: 'Invalid memory ID' });
      }

      // Delete memory links first (foreign key constraint)
      await db.memoryLink.deleteMany({
        where: {
          OR: [
            { fromId: memoryId },
            { toId: memoryId }
          ]
        }
      });

      // Delete the memory
      const deleted = await db.memory.delete({
        where: { id: memoryId }
      });

      console.log(`🗑️  Deleted memory #${memoryId}: ${deleted.text.slice(0, 50)}...`);
      res.json({ success: true, deleted });
    } catch (error) {
      console.error('Delete memory error:', error);
      res.status(500).json({ error: 'Failed to delete memory' });
    }
  });

  // Bulk delete memories
  app.post('/api/memories/bulk-delete', async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid memory IDs' });
      }

      // Delete memory links first
      await db.memoryLink.deleteMany({
        where: {
          OR: [
            { fromId: { in: ids } },
            { toId: { in: ids } }
          ]
        }
      });

      // Delete memories
      const result = await db.memory.deleteMany({
        where: { id: { in: ids } }
      });

      console.log(`🗑️  Bulk deleted ${result.count} memories`);
      res.json({ success: true, count: result.count });
    } catch (error) {
      console.error('Bulk delete memories error:', error);
      res.status(500).json({ error: 'Failed to delete memories' });
    }
  });

  // Get/Update settings
  app.get('/api/settings', async (req, res) => {
    try {
      let settings = await db.settings.findFirst();
      if (!settings) {
        settings = await db.settings.create({
          data: {
            thoughtVerbosity: 'medium',
            memoryPrivacyDefault: 'public',
            enableDiagnostics: true,
            searchPreference: 'auto'
          }
        });
      }
      res.json(settings);
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      let settings = await db.settings.findFirst();
      if (!settings) {
        settings = await db.settings.create({ data: req.body });
      } else {
        settings = await db.settings.update({
          where: { id: settings.id },
          data: req.body
        });
      }
      res.json(settings);
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Reset personality
  app.post('/api/personality/reset', async (req, res) => {
    try {
      const { personalityEngine } = await import('../agent/personality.js');
      await personalityEngine.resetPersonality(req.body.wipeMemories || false);
      res.json({ success: true });
    } catch (error) {
      console.error('Reset personality error:', error);
      res.status(500).json({ error: 'Failed to reset personality' });
    }
  });

  // Manual search
  app.post('/api/search', async (req, res) => {
    try {
      const { query, complexity } = req.body;
      const { perplexityClient } = await import('../providers/perplexity.js');
      const result = await perplexityClient.search(query, complexity || 'simple');
      res.json(result);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Failed to perform search' });
    }
  });

  // Get personality snapshot
  app.get('/api/personality', async (req, res) => {
    try {
      const { personalityEngine } = await import('../agent/personality.js');
      const snapshot = await personalityEngine.getSnapshot();
      res.json(snapshot);
    } catch (error) {
      console.error('Get personality error:', error);
      res.status(500).json({ error: 'Failed to fetch personality' });
    }
  });

  // Get full persona snapshot (includes relationship, beliefs, goals)
  app.get('/api/persona', async (req, res) => {
    try {
      const { personalityEngine } = await import('../agent/personality.js');
      const snapshot = await personalityEngine.getFullSnapshot();
      res.json(snapshot);
    } catch (error) {
      console.error('Get persona error:', error);
      res.status(500).json({ error: 'Failed to fetch persona' });
    }
  });

  // Get evolution events
  app.get('/api/persona/evolution', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const sinceId = req.query.sinceId ? parseInt(req.query.sinceId as string) : undefined;

      const events = await db.personaEvolutionEvent.findMany({
        where: sinceId ? { id: { gt: sinceId } } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      res.json(events.map((e: any) => ({
        ...e,
        evidenceIds: JSON.parse(e.evidenceIds),
        metadata: e.metadata ? JSON.parse(e.metadata) : null
      })));
    } catch (error) {
      console.error('Get evolution events error:', error);
      res.status(500).json({ error: 'Failed to fetch evolution events' });
    }
  });

  // Create a new goal
  app.post('/api/persona/goals', async (req, res) => {
    try {
      const { title, description, category, priority } = req.body;
      
      if (!title || !description || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const goal = await db.personaGoal.create({
        data: {
          title,
          description,
          category,
          priority: priority || 3,
          progress: 0.0,
          evidenceIds: JSON.stringify([])
        }
      });

      return res.json({
        ...goal,
        evidenceIds: []
      });
    } catch (error) {
      console.error('Create goal error:', error);
      return res.status(500).json({ error: 'Failed to create goal' });
    }
  });

  // Update a goal
  app.patch('/api/persona/goals/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, description, priority, progress } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (progress !== undefined) updateData.progress = Math.max(0, Math.min(1, progress));

      const goal = await db.personaGoal.update({
        where: { id },
        data: updateData
      });

      return res.json({
        ...goal,
        evidenceIds: JSON.parse(goal.evidenceIds)
      });
    } catch (error) {
      console.error('Update goal error:', error);
      return res.status(500).json({ error: 'Failed to update goal' });
    }
  });

  // Add boundary note
  app.post('/api/persona/boundaries', async (req, res) => {
    try {
      const { topic, note } = req.body;

      const relationship = await db.relationshipState.findFirst();
      if (!relationship) {
        return res.status(404).json({ error: 'No relationship state found' });
      }

      let boundaries = relationship.boundaries 
        ? JSON.parse(relationship.boundaries as any) 
        : { topics: [], notes: '' };

      if (topic) {
        boundaries.topics = [...new Set([...boundaries.topics, topic])];
      }
      if (note) {
        boundaries.notes = boundaries.notes ? `${boundaries.notes}\n${note}` : note;
      }

      await db.relationshipState.update({
        where: { id: relationship.id },
        data: {
          boundaries: JSON.stringify(boundaries),
          lastUpdateAt: new Date()
        }
      });

      return res.json({ success: true, boundaries });
    } catch (error) {
      console.error('Add boundary error:', error);
      return res.status(500).json({ error: 'Failed to add boundary' });
    }
  });

  // Get tool activities
  app.get('/api/activities', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await db.toolActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      
      // Parse metadata JSON for each activity
      const activitiesWithParsedMetadata = activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null
      }));
      
      res.json(activitiesWithParsedMetadata);
    } catch (error) {
      console.error('Get activities error:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  });

  // Get search results
  app.get('/api/search-results', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      
      const searchResults = await db.searchResult.findMany({
        where: before ? { id: { lt: before } } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      
      // Parse JSON citations and format for frontend
      const formattedResults = searchResults.map(sr => ({
        id: sr.id,
        query: sr.query,
        originalQuery: sr.originalQuery,
        answer: sr.answer,
        citations: JSON.parse(sr.citations),
        synthesis: sr.synthesis,
        model: sr.model,
        timestamp: sr.createdAt.toISOString()
      }));
      
      res.json(formattedResults.reverse());
    } catch (error) {
      console.error('Get search results error:', error);
      res.status(500).json({ error: 'Failed to fetch search results' });
    }
  });

  // Get personality anchor update status
  app.get('/api/personality/anchor-status', async (req, res) => {
    try {
      const { personalityEngine } = await import('../agent/personality.js');
      const status = await personalityEngine.getAnchorUpdateStatus();
      res.json(status);
    } catch (error) {
      console.error('Get anchor status error:', error);
      res.status(500).json({ error: 'Failed to fetch anchor update status' });
    }
  });

  // Manually trigger personality anchor update (for testing)
  app.post('/api/personality/update-anchors', async (req, res) => {
    try {
      const { personalityEngine } = await import('../agent/personality.js');
      const updated = await personalityEngine.checkAndUpdateAnchors();
      res.json({ 
        success: true, 
        updated,
        message: updated ? 'Anchors updated' : 'No update needed'
      });
    } catch (error) {
      console.error('Manual anchor update error:', error);
      res.status(500).json({ error: 'Failed to update anchors' });
    }
  });

  // Sync personality anchors (adds missing anchors from code)
  app.post('/api/personality/sync-anchors', async (req, res) => {
    try {
      const { personalityEngine } = await import('../agent/personality.js');
      await personalityEngine.initialize();
      const snapshot = await personalityEngine.getSnapshot();
      res.json({ 
        success: true, 
        anchorCount: snapshot.anchors.length,
        anchors: snapshot.anchors.map(a => ({ trait: a.trait, value: a.value })),
        message: `Synced ${snapshot.anchors.length} personality anchors`
      });
    } catch (error) {
      console.error('Anchor sync error:', error);
      res.status(500).json({ error: 'Failed to sync anchors' });
    }
  });
}

