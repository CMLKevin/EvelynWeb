# Personality Anchors Migration Guide

## Problem

If you're seeing only 4-6 personality anchors instead of all 12, your database needs to be synced with the updated personality system.

## Quick Fix (Automatic)

### Option 1: Using the Sync Script (Recommended)

1. **Make sure the server is running:**
   ```bash
   cd server
   npm run dev
   ```

2. **In a new terminal, run the sync script:**
   ```bash
   cd server
   node sync-personality.js
   ```

3. **Refresh the web interface** - you should now see all 12 anchors!

### Option 2: Using API Call

If the server is running, you can sync via curl:

```bash
curl -X POST http://localhost:3001/api/personality/sync-anchors
```

### Option 3: Automatic on Server Restart

The new code automatically syncs anchors when the server starts. Simply:

1. **Stop the server** (Ctrl+C)
2. **Start it again:**
   ```bash
   npm run dev
   ```
3. **Watch the console logs** - you should see:
   ```
   🧠 Adding new personality anchor: Vulnerable Authenticity
   🧠 Adding new personality anchor: Playful Chaos
   🧠 Adding new personality anchor: Intellectual Hunger
   🧠 Adding new personality anchor: Emotional Attunement
   🧠 Adding new personality anchor: Ambition Drive
   🧠 Adding new personality anchor: Dark Humor Edge
   ✨ Added 6 new personality anchors. Total: 12
   ```

## Manual Fix (Database Reset)

⚠️ **Warning:** This will reset ALL personality evolution (anchors back to default values, mood reset)

If you want a completely fresh start:

1. **Stop the server**

2. **Delete the database:**
   ```bash
   cd server/prisma
   rm dev.db
   ```

3. **Recreate the database:**
   ```bash
   cd ..
   npm run db:push
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

All 12 anchors will be initialized with default values.

## Verification

After running any of the above methods:

1. **Open the web interface** at http://localhost:5173
2. **Open diagnostics panel** (🧠 button in sidebar)
3. **Go to Personality tab**
4. **Check the header** - should say "12 traits"

You should see all 12 anchors:

### Original 6:
1. Social Fluidity (78%)
2. Intellectual Spark (75%)
3. Chaotic Warmth (68%)
4. Natural Flirtation (65%)
5. Fierce Loyalty (62%)
6. Unfiltered Honesty (58%)

### New 6 (with 🆕 badges):
7. Vulnerable Authenticity (55%)
8. Playful Chaos (62%)
9. Intellectual Hunger (71%)
10. Emotional Attunement (68%)
11. Ambition Drive (52%)
12. Dark Humor Edge (58%)

## What This Update Does

The new initialization system:

✅ **Adds missing anchors** - Checks for any anchors in code that aren't in database
✅ **Preserves existing data** - Keeps values and evolution history of existing anchors
✅ **Updates descriptions** - Refreshes anchor descriptions if they've changed
✅ **Non-destructive** - Won't delete or reset existing anchors
✅ **Idempotent** - Safe to run multiple times

## Technical Details

### What Changed

**Before:**
- Only initialized anchors if database was completely empty
- If you had 6 anchors, new ones wouldn't be added

**After:**
- Checks for missing anchors on every server start
- Adds any anchors from `INITIAL_ANCHORS` that aren't in database
- Updates descriptions if they've changed
- Preserves all existing anchor values and evidence

### Code Location

The sync logic is in:
- `server/src/agent/personality.ts` - `initialize()` function
- `server/src/routes/index.ts` - `/api/personality/sync-anchors` endpoint
- `server/sync-personality.js` - Sync script

## Troubleshooting

### Issue: Still seeing 4 traits after restart

**Solution:**
1. Check server console logs for errors
2. Manually run the sync script
3. Verify database file exists at `server/prisma/dev.db`

### Issue: Sync script shows "Server not running"

**Solution:**
1. Start server: `cd server && npm run dev`
2. Wait for "🚀 Evelyn server running" message
3. Run sync script in new terminal

### Issue: All anchors reset to default values

**Solution:**
- This happens if you deleted the database
- Anchors will slowly evolve again through conversations
- Alternatively, restore from backup (see `DATABASE_PROTECTION_SUMMARY.md`)

### Issue: Duplicate anchors showing

**Solution:**
- Should not happen with new code
- If it does, reset database (see Manual Fix above)

## Future Updates

The system is now set up to automatically handle new anchors:

1. Add new anchor to `INITIAL_ANCHORS` in `personality.ts`
2. Restart server (or run sync script)
3. New anchor automatically appears in database
4. No data loss for existing anchors

## API Reference

### POST /api/personality/sync-anchors

Syncs database with code anchors.

**Request:**
```bash
POST http://localhost:3001/api/personality/sync-anchors
```

**Response:**
```json
{
  "success": true,
  "anchorCount": 12,
  "anchors": [
    { "trait": "Social Fluidity", "value": 0.78 },
    ...
  ],
  "message": "Synced 12 personality anchors"
}
```

## Summary

**Quick command to fix:**
```bash
# Make sure server is running, then:
node server/sync-personality.js
```

That's it! Your personality panel should now show all 12 beautiful anchors. 💜

