# Log Output Preview

## What You'll See When Running `./start.sh`

### Startup Sequence

```
╔════════════════════════════════════════╗
║      Evelyn Chat - Starting...       ║
╚════════════════════════════════════════╝

╔════════════════════════════════════════╗
║    Starting Backend Server...        ║
╚════════════════════════════════════════╝

[14:23:15] [BACKEND] > evelyn-server@1.0.0 dev
[14:23:15] [BACKEND] > tsx watch src/index.ts
[14:23:16] [BACKEND] ✓ Server listening on port 3001
[14:23:16] [BACKEND] ✓ WebSocket server ready
[14:23:16] [BACKEND] ✓ Database connected

╔════════════════════════════════════════╗
║    Starting Frontend Server...       ║
╚════════════════════════════════════════╝

[14:23:19] [FRONTEND] VITE v5.0.8  ready in 423 ms
[14:23:19] [FRONTEND] ➜  Local:   http://localhost:5000/
[14:23:19] [FRONTEND] ➜  Network: use --host to expose
```

### During Operation

**When a user sends a message:**

```
[14:25:30] [BACKEND] WebSocket: Message received
[14:25:30] [BACKEND] [InnerThought] AI Trigger Decision: ✓ YES (confidence: 0.92)
[14:25:30] [BACKEND] [InnerThought] Context: deep_discussion (0.87)
[14:25:31] [BACKEND] [InnerThought] Generating thought using Flash Lite model...
[14:25:32] [BACKEND] [InnerThought] Generated: "This is really interesting..."
[14:25:32] [BACKEND] [Personality] Mood shift: valence +0.05, arousal +0.03
[14:25:33] [BACKEND] [Memory] Storing memory: importance 0.78
[14:25:33] [BACKEND] ✓ Response complete
```

**When there's an error:**

```
[14:26:10] [BACKEND] Error: Failed to connect to OpenRouter API
[14:26:10] [BACKEND] Failed to generate inner thought, using fallback
```

**When there are warnings:**

```
[14:27:45] [BACKEND] Warning: Context window approaching limit (45000/50000 tokens)
```

## Color Coding (in your terminal)

- **Timestamps** appear in gray
- **[BACKEND] / [FRONTEND]** tags use bright colors
- **Success messages** (✓, ready, listening) appear in green
- **Errors** appear in red
- **InnerThought logs** appear in magenta/purple
- **Memory/Database** operations appear in cyan
- **Personality/Agent** logs appear in blue
- **Warnings** appear in yellow

## Tips

1. **Filtering logs**: You can pipe to grep for specific logs:
   ```bash
   ./start.sh 2>&1 | grep "InnerThought"
   ```

2. **Saving logs**: Redirect to a file while still viewing:
   ```bash
   ./start.sh 2>&1 | tee evelyn-session.log
   ```

3. **Quiet mode**: If you just want errors:
   ```bash
   ./start.sh 2>&1 | grep -E "ERROR|FAIL|Error"
   ```

## Shutdown Sequence

When you press `Ctrl+C`:

```
╔════════════════════════════════════════╗
║    Shutting down servers...          ║
╚════════════════════════════════════════╝

✓ All servers stopped
```

