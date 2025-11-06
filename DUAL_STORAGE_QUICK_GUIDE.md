# Dual Storage System - Quick Reference

## What Is It?

Your data is now stored in **TWO places** simultaneously:
1. **Browser LocalStorage** (instant backup)
2. **Server SQLite Database** (permanent storage)

On startup, the system automatically compares both and uses the most recent data.

---

## How It Works

### Automatic (No Action Needed)

**When you start the app:**
- ✅ Compares LocalStorage vs Server
- ✅ Chooses the newest data
- ✅ Syncs the outdated one
- ✅ Starts auto-save (every 30 seconds)

**While you chat:**
- ✅ Saves to server immediately
- ✅ Saves to LocalStorage every 30s
- ✅ You're always protected

---

## What Gets Saved

### Everywhere (LocalStorage + Server):
- All chat messages
- All search results
- Personality state
- Activity logs
- Settings

### Server Only:
- Memories (too large for browser)
- Vector embeddings

---

## Recovery Scenarios

### Scenario 1: Browser Crash
```
What happens: Browser crashes mid-conversation
Where data is: Server SQLite database
Recovery: Automatic - data loads from server on restart
Data lost: None (all saved to server)
```

### Scenario 2: Server Crash
```
What happens: Server goes down
Where data is: Browser LocalStorage (last 30s)
Recovery: Keep chatting! Saves to LocalStorage
Data lost: None - syncs back when server restarts
```

### Scenario 3: Clear Browser Cache
```
What happens: You clear browser storage
Where data is: Server SQLite database
Recovery: Automatic - loads from server
Data lost: None
```

### Scenario 4: Database Reset
```
What happens: Server database gets reset
Where data is: Browser LocalStorage
Recovery: Automatic - restores from LocalStorage
Data lost: None (if used browser recently)
```

---

## Visual Indicators

### Sync Status Toast (Top Center)
- **"Syncing data..."** → Initial sync in progress
- **"Synced: Loaded from server"** → Server had newest data
- **"Synced: Restored from LocalStorage"** → Browser had newest data
- **Disappears after 5 seconds** → Sync complete

### Console Messages
```
[LocalStorage] Saved 42 messages, 5 search results
[Sync] Starting sync process...
[Sync] Server is newer, updating LocalStorage
[App] Sync result: { source: 'server', action: '...' }
```

---

## Manual Operations

### Export Your Data
1. Open browser console: `F12`
2. Type: `syncManager.exportData()`
3. Copy the JSON output
4. Save to file

Or use the UI button (if Sync Status Panel is visible)

### Import Data
1. Get your JSON backup file
2. Open console: `F12`
3. Type: `await syncManager.importData(jsonString)`

Or use the UI button (if Sync Status Panel is visible)

### Force Sync Now
```javascript
// In browser console
await useStore.getState().performFullSync();
```

### Manual Save
```javascript
// In browser console
useStore.getState().saveToLocalStorage();
```

---

## Storage Usage

### Check LocalStorage Usage
```javascript
// In browser console
localStorageManager.getStorageInfo();
// Returns: { used: 123456, total: 5242880, percentage: 2.35 }
```

### Check What's Stored
```javascript
// In browser console
localStorage.getItem('evelyn_metadata_v1');
// Shows: { version, lastSync, messageCount, ... }
```

### Clear LocalStorage (if needed)
```javascript
// In browser console
localStorageManager.clear();
// Note: Data will reload from server on next refresh
```

---

## Troubleshooting

### Problem: Data Not Syncing

**Check 1**: Is the server running?
```bash
# In terminal
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Check 2**: Look for errors in console
```javascript
// Any red errors about sync or storage?
```

**Check 3**: Force manual sync
```javascript
await useStore.getState().performFullSync();
```

---

### Problem: "QuotaExceededError"

**Cause**: LocalStorage is full (>5-10 MB)

**Auto-Fix**: System automatically cleans up old data

**Manual Fix**:
```javascript
localStorageManager.cleanup();
// Keeps last 50 messages, 20 searches
```

---

### Problem: Old Data Appearing

**Cause**: LocalStorage has older data than server

**Fix**: System auto-resolves on startup (server wins)

**Verify**:
```javascript
// Check timestamps
localStorageManager.getMetadata().lastSync
// vs
// Latest message timestamp on server
```

---

### Problem: Data Disappeared

**Check 1**: Is it in LocalStorage?
```javascript
const data = localStorageManager.loadAll();
console.log(data?.messages.length);
```

**Check 2**: Is it on server?
```bash
curl http://localhost:3001/api/messages | jq length
```

**Recover**:
- If in LocalStorage: System will auto-restore to server
- If on server: System will auto-load to browser
- If neither: Check exports/backups

---

## Best Practices

### ✅ DO:
- Let the auto-save handle backups
- Export data periodically (weekly)
- Check console on startup for sync status
- Keep server running while chatting

### ❌ DON'T:
- Manually edit LocalStorage (corrupts checksum)
- Clear browser cache without exporting first
- Run multiple instances (causes conflicts)
- Stop server mid-conversation (waits 30s for save)

---

## Advanced: Data Locations

### Browser LocalStorage
```
Key: evelyn_data_v1
Location: Chrome → F12 → Application → Local Storage
Size: Usually 1-2 MB
```

### Server Database
```
File: server/prisma/dev.db
Size: Usually 100-500 KB
View: cd server && npx prisma studio
```

---

## Conflict Resolution Logic

```
IF LocalStorage.lastSync > Server.lastMessage:
    → Restore LocalStorage → Server
    
ELSE IF Server.lastMessage > LocalStorage.lastSync:
    → Load Server → LocalStorage
    
ELSE:
    → Data is in sync, no action
```

---

## Testing the System

### Test 1: Normal Operation
1. Send a message
2. Wait 30 seconds
3. Check console: "Saved to LocalStorage"
4. Refresh page
5. Message should still be there

### Test 2: Server Down Recovery
1. Stop the server
2. Send messages (saves to LocalStorage)
3. Restart server
4. Refresh page
5. Messages should restore to server

### Test 3: Browser Clear Recovery
1. Send messages
2. Wait for auto-save
3. Open DevTools → Application → Clear Storage
4. Refresh page
5. Data should load from server

---

## Quick Commands

```javascript
// Check sync status
useStore.getState().performFullSync()

// Force save now
useStore.getState().saveToLocalStorage()

// Export backup
syncManager.exportData()

// Check storage usage
localStorageManager.getStorageInfo()

// View metadata
localStorageManager.getMetadata()

// Clear LocalStorage
localStorageManager.clear()
```

---

## Summary

**You have THREE layers of protection:**

1. **Server SQLite** - Permanent storage
2. **Browser LocalStorage** - Instant backup (30s intervals)
3. **Auto-Sync** - Always uses newest data

**Your data is safe!** 🛡️

Even if:
- Browser crashes → Loads from server ✅
- Server crashes → Saves to LocalStorage ✅
- Cache cleared → Restores from server ✅
- Database reset → Restores from LocalStorage ✅

The system automatically handles all recovery scenarios.

