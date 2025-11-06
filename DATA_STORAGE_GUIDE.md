# Evelyn Data Storage Guide

## Overview
All of Evelyn's data is stored in a **SQLite database** located at:
```
/Users/kevinlin/Downloads/EvelynChat-main/server/prisma/dev.db
```

**Current size:** ~128 KB (empty after recent schema migration)

## Database Structure

### 11 Tables Total:

1. **Message** - Chat conversation history
2. **Memory** - Long-term memory storage
3. **SearchResult** - Web search history
4. **PersonalityAnchor** - Personality traits
5. **MoodState** - Current emotional state
6. **Chapter** - Conversation chapters
7. **MemoryLink** - Connections between memories
8. **ToolActivity** - Activity logs
9. **Settings** - Application settings
10. **User** - User profiles
11. **Job** - Background jobs

---

## Detailed Table Descriptions

### 1. Message Table
**Purpose:** Stores all chat messages (user and assistant)

**Schema:**
```prisma
model Message {
  id         Int      @id @default(autoincrement())
  role       String   // "user" | "assistant" | "system"
  content    String   // The actual message text
  tokensIn   Int      @default(0)
  tokensOut  Int      @default(0)
  createdAt  DateTime @default(now())
  chapterId  Int?
  auxiliary  String?  // JSON: { toolCalls, searchUsed, retrievalIds, moodSnapshot }
}
```

**What's stored:**
- ✅ All conversation messages
- ✅ Token usage for each message
- ✅ Timestamps
- ✅ Associated chapter (for organization)
- ✅ Metadata (which tools were used, mood at time)

**Location:** `/server/prisma/dev.db` → `Message` table

---

### 2. Memory Table
**Purpose:** Evelyn's long-term memory system

**Schema:**
```prisma
model Memory {
  id               Int      @id @default(autoincrement())
  type             String   // episodic | semantic | preference | insight | plan | relational
  text             String   // The memory content
  importance       Float    // 0.0 to 1.0 importance score
  embedding        String   // JSON float[] - vector representation
  privacy          String   // public | private | ephemeral
  lastAccessedAt   DateTime @default(now())
  sourceMessageId  Int?
  createdAt        DateTime @default(now())
}
```

**Memory Types:**
- **episodic** - Specific events and conversations
- **semantic** - General facts and knowledge
- **preference** - User preferences and likes/dislikes
- **insight** - Deep understanding about the user
- **plan** - Future plans and commitments
- **relational** - Relationship dynamics and patterns

**What's stored:**
- ✅ Memory text
- ✅ Vector embeddings (for semantic search)
- ✅ Importance scores (for prioritization)
- ✅ Last accessed timestamps (for recency)
- ✅ Links to source messages
- ✅ Privacy levels

**Location:** `/server/prisma/dev.db` → `Memory` table

---

### 3. SearchResult Table
**Purpose:** Web search history

**Schema:**
```prisma
model SearchResult {
  id            Int      @id @default(autoincrement())
  query         String   // Refined search query
  originalQuery String?  // User's original query
  answer        String   // Detailed answer from Perplexity
  citations     String   // JSON string[] - Source URLs
  synthesis     String   // AI-synthesized summary
  model         String   // Search model used (e.g., "sonar-pro")
  createdAt     DateTime @default(now())
}
```

**What's stored:**
- ✅ Search queries (both original and AI-refined)
- ✅ Full search answers
- ✅ Source citations (URLs)
- ✅ AI synthesized summaries
- ✅ Which model was used
- ✅ Timestamps

**Location:** `/server/prisma/dev.db` → `SearchResult` table

---

### 4. PersonalityAnchor Table
**Purpose:** Evelyn's personality traits

**Schema:**
```prisma
model PersonalityAnchor {
  id           Int      @id @default(autoincrement())
  trait        String   @unique // Trait name (e.g., "Intellectual Spark")
  value        Float    // -1.0 to 1.0 intensity
  evidenceIds  String   // JSON Int[] - Memory IDs supporting this trait
  lastUpdateAt DateTime @default(now())
  description  String   // Detailed description of the trait
}
```

**Default Traits:**
1. Social Fluidity (0.5)
2. Intellectual Spark (0.7)
3. Chaotic Warmth (0.6)
4. Natural Flirtation (0.4)
5. Unfiltered Honesty (0.7)
6. Fierce Loyalty (0.8)

**What's stored:**
- ✅ Trait names and values
- ✅ Evidence supporting each trait (memory IDs)
- ✅ Last update timestamps
- ✅ Trait descriptions

**Location:** `/server/prisma/dev.db` → `PersonalityAnchor` table

---

### 5. MoodState Table
**Purpose:** Evelyn's current emotional state

**Schema:**
```prisma
model MoodState {
  id               Int      @id @default(autoincrement())
  valence          Float    // -1 (negative) to 1 (positive)
  arousal          Float    // 0 (calm) to 1 (excited)
  stance           String   // e.g., "curious", "playful", "serious"
  decayHalfLifeMins Int     @default(30)
  lastUpdateAt     DateTime @default(now())
}
```

**What's stored:**
- ✅ Emotional valence (happy/sad)
- ✅ Arousal level (calm/excited)
- ✅ Current stance/attitude
- ✅ Mood decay rate
- ✅ Last update time

**Location:** `/server/prisma/dev.db` → `MoodState` table

---

### 6. Chapter Table
**Purpose:** Conversation organization

**Schema:**
```prisma
model Chapter {
  id              Int      @id @default(autoincrement())
  title           String
  summary         String
  startMessageId  Int?
  endMessageId    Int?
  createdAt       DateTime @default(now())
  features        String?  // JSON: { topicVector, keywords, participants }
}
```

**What's stored:**
- ✅ Chapter titles and summaries
- ✅ Message range (start/end IDs)
- ✅ Topic vectors and keywords
- ✅ Timestamps

**Location:** `/server/prisma/dev.db` → `Chapter` table

---

### 7. MemoryLink Table
**Purpose:** Connections between related memories

**Schema:**
```prisma
model MemoryLink {
  id       Int    @id @default(autoincrement())
  fromId   Int    // Source memory ID
  toId     Int    // Target memory ID
  relation String // Type of relationship (e.g., "causes", "contradicts")
  weight   Float  // Strength of connection (0.0 to 1.0)
}
```

**What's stored:**
- ✅ Memory-to-memory connections
- ✅ Relationship types
- ✅ Connection strengths

**Location:** `/server/prisma/dev.db` → `MemoryLink` table

---

### 8. ToolActivity Table
**Purpose:** Logs of all tool/subroutine executions

**Schema:**
```prisma
model ToolActivity {
  id              Int       @id @default(autoincrement())
  tool            String    // recall | search | summarize | evolve | embed | dream | classify
  status          String    // queued | running | done | error | cancelled
  inputSummary    String
  outputSummary   String?
  error           String?
  createdAt       DateTime  @default(now())
  finishedAt      DateTime?
  linkedMessageId Int?
}
```

**What's stored:**
- ✅ Which tools were used
- ✅ Execution status
- ✅ Input/output summaries
- ✅ Error messages
- ✅ Timing data

**Location:** `/server/prisma/dev.db` → `ToolActivity` table

---

### 9. Settings Table
**Purpose:** Application configuration

**Schema:**
```prisma
model Settings {
  id                   Int      @id @default(autoincrement())
  thoughtVerbosity     String   @default("medium") // low | medium | high
  memoryPrivacyDefault String   @default("public")
  dreamSchedule        String?  // cron or null
  enableDiagnostics    Boolean  @default(true)
  searchPreference     String   @default("auto")   // auto | never | ask
}
```

**What's stored:**
- ✅ User preferences
- ✅ Feature toggles
- ✅ Default behaviors

**Location:** `/server/prisma/dev.db` → `Settings` table

---

### 10. User Table
**Purpose:** User profiles (future use)

**Schema:**
```prisma
model User {
  id          Int      @id @default(autoincrement())
  displayName String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Location:** `/server/prisma/dev.db` → `User` table

---

### 11. Job Table
**Purpose:** Background job queue

**Schema:**
```prisma
model Job {
  id        Int       @id @default(autoincrement())
  type      String    // dream | reindex | cleanup
  status    String    // queued | running | done | error
  payload   String?   // JSON
  nextRunAt DateTime?
  createdAt DateTime  @default(now())
}
```

**What's stored:**
- ✅ Scheduled jobs (like nightly dreams)
- ✅ Job status
- ✅ Next run times

**Location:** `/server/prisma/dev.db` → `Job` table

---

## Data Persistence Flow

### When You Chat:
1. **Your message** → Saved to `Message` table
2. **Evelyn's response** → Saved to `Message` table
3. **Important exchanges** → Extracted and saved to `Memory` table
4. **Mood changes** → Updated in `MoodState` table
5. **Tool usage** → Logged in `ToolActivity` table
6. **Web searches** → Saved to `SearchResult` table

### On Page Reload:
1. Frontend calls `/api/messages` → Loads recent messages
2. Frontend calls `/api/search-results` → Loads recent searches
3. Frontend calls `/api/personality` → Loads current personality
4. All data restored from `dev.db`

---

## File Locations

### Database File
```
📁 /Users/kevinlin/Downloads/EvelynChat-main/
  └── 📁 server/
      └── 📁 prisma/
          ├── dev.db           ← ALL DATA STORED HERE (SQLite)
          ├── dev.db-journal   ← Temporary journal file
          └── schema.prisma    ← Database schema definition
```

### Configuration Files
```
📁 /Users/kevinlin/Downloads/EvelynChat-main/
  └── 📁 server/
      └── .env   ← Contains DATABASE_URL and API keys
                    (not tracked by git)
```

### Environment Variables
The `.env` file contains:
```bash
DATABASE_URL="file:./dev.db"
OPENROUTER_API_KEY="your_key_here"
PERPLEXITY_API_KEY="your_key_here"
VOYAGE_API_KEY="your_key_here"
EMBEDDING_MODEL="openai/text-embedding-3-large"
```

---

## Current Data Status

**As of last check:**
- **Messages:** 0 (database was reset)
- **Memories:** 0 (database was reset)
- **Search Results:** 0 (database was reset)
- **Personality Anchors:** 4 (initialized)
- **Activities:** 0 (database was reset)

**Database Size:** 128 KB (mostly empty)

---

## Data Management

### View Database Contents
```bash
cd server
npx prisma studio
```
This opens a web UI to browse all tables.

### Backup Database
```bash
cp server/prisma/dev.db server/prisma/dev.db.backup
```

### Reset Database (⚠️ DELETES ALL DATA)
```bash
cd server
npx prisma db push --force-reset
```

### Export Data
```bash
# Export messages to JSON
sqlite3 server/prisma/dev.db "SELECT json_group_array(json_object('id', id, 'role', role, 'content', content, 'createdAt', createdAt)) FROM Message;" > messages.json

# Export memories to JSON
sqlite3 server/prisma/dev.db "SELECT json_group_array(json_object('id', id, 'type', type, 'text', text, 'importance', importance, 'createdAt', createdAt)) FROM Memory;" > memories.json
```

---

## Data Privacy & Security

### Local Storage
- ✅ All data stored **locally** on your machine
- ✅ No cloud sync (unless you implement it)
- ✅ No external database servers

### API Keys
- ⚠️ Stored in `.env` file (not committed to git)
- ⚠️ Used for OpenRouter, Perplexity, Voyage APIs
- ⚠️ Keep `.env` file secure

### Sensitive Data
- ✅ Memories marked as "private" stay in the database
- ✅ No automatic deletion of old data
- ⚠️ No encryption at rest (SQLite is plaintext)

---

## Data Retention

### Automatic Cleanup
Currently **none**. All data is retained indefinitely.

### Manual Cleanup Options
1. **Delete old messages:**
   ```bash
   sqlite3 server/prisma/dev.db "DELETE FROM Message WHERE createdAt < datetime('now', '-30 days');"
   ```

2. **Delete low-importance memories:**
   ```bash
   sqlite3 server/prisma/dev.db "DELETE FROM Memory WHERE importance < 0.3;"
   ```

3. **Clear all search results:**
   ```bash
   sqlite3 server/prisma/dev.db "DELETE FROM SearchResult;"
   ```

---

## Troubleshooting

### Database Locked
If you get "database is locked" error:
```bash
# Kill any running server processes
pkill -f "node.*server"
# Restart the server
npm run dev
```

### Corrupted Database
If the database is corrupted:
```bash
cd server
# Backup current database
mv prisma/dev.db prisma/dev.db.corrupted
# Create fresh database
npx prisma db push
```

### Missing Data After Restart
Check if the database file exists:
```bash
ls -lh server/prisma/dev.db
```

If missing, the database will be recreated on next server start.

---

## Summary

**🗄️ Single Database File:** `server/prisma/dev.db`

**📊 All Data Stored:**
- ✅ Chat messages
- ✅ Memories (with embeddings)
- ✅ Search results
- ✅ Personality traits
- ✅ Mood states
- ✅ Conversation chapters
- ✅ Activity logs
- ✅ Settings

**🔒 Privacy:** All data stored locally, no cloud sync

**💾 Backup:** Copy `dev.db` file to backup

**🔍 View Data:** Use `npx prisma studio`

**📈 Current Size:** ~128 KB (empty after migration)

