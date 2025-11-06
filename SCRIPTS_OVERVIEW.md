# Evelyn Chat - Scripts Overview

All scripts are located in the project root and are ready to use.

> **Platform-Specific Guides:**
> - **Mac/Linux**: Use `.sh` scripts - see below
> - **Windows**: Use `.ps1` PowerShell scripts - see `START_GUIDE_WINDOWS.md`

## 🚀 Main Scripts (Mac/Linux)

### `./start.sh` - Full Logging Mode
**Recommended for development**

```bash
./start.sh
```

**Features:**
- ✅ Colorful, real-time logs from both backend and frontend
- ✅ Intelligent log categorization with color coding
- ✅ Timestamps on every log entry
- ✅ Shows all system activity (InnerThought, Memory, Personality, etc.)
- ✅ Clean shutdown with Ctrl+C

**Perfect for:**
- Development and debugging
- Understanding what Evelyn is "thinking"
- Monitoring system behavior
- Learning how the system works

---

### `./start-quiet.sh` - Quiet Mode
**Recommended for production or clean terminals**

```bash
./start-quiet.sh
```

**Features:**
- ✅ Minimal output (startup confirmation only)
- ✅ Errors are still shown
- ✅ Clean, distraction-free terminal
- ✅ Same reliability as full mode

**Perfect for:**
- Production use
- When you want a clean terminal
- Background operation
- Focus on the chat interface

---

## 🛠️ Utility Scripts

### `./stop.sh` - Emergency Stop

```bash
./stop.sh
```

Force-stops all Evelyn servers. Use this if:
- Servers didn't shut down cleanly
- You need to free up ports quickly
- Something went wrong

---

### `./show-colors.sh` - Color Legend

```bash
./show-colors.sh
```

Displays a visual guide to all log colors with examples. Run this to:
- Learn what each color means
- See example log entries
- Understand the logging system
- Reference while developing

---

## 📋 Quick Command Reference

| Command | Purpose | Output Level |
|---------|---------|--------------|
| `./start.sh` | Start with full logs | **Detailed** |
| `./start-quiet.sh` | Start with minimal output | **Minimal** |
| `./stop.sh` | Stop all servers | **Brief** |
| `./show-colors.sh` | Show color guide | **Visual Guide** |

---

## 🎨 Understanding the Logs

### Log Format

```
[HH:MM:SS] [SERVER] Log message
```

- **Timestamp**: When the event occurred
- **Server Tag**: `[BACKEND]` or `[FRONTEND]`
- **Message**: The actual log content

### Color Meanings

**Backend:**
- 🔴 RED = Errors
- 🟡 YELLOW = Warnings  
- 🟢 GREEN = Success
- 🟣 MAGENTA = AI/InnerThought
- 🔵 CYAN = Memory/Database
- 🔷 BLUE = Personality/Agent
- ⚪ WHITE = General

**Frontend:**
- 🔵 CYAN = Vite system
- 🟢 GREEN = URLs/Success
- 🔴 RED = Errors

---

## 💡 Pro Tips

### Save logs to a file
```bash
./start.sh 2>&1 | tee session.log
```

### Filter specific logs
```bash
# Only show InnerThought logs
./start.sh 2>&1 | grep InnerThought

# Only show errors
./start.sh 2>&1 | grep -i error
```

### Run in background
```bash
./start-quiet.sh &
```

---

## 🐛 Troubleshooting

**"Permission denied" when running scripts:**
```bash
chmod +x *.sh
```

**Port already in use:**
```bash
./stop.sh
# Wait 2 seconds, then:
./start.sh
```

**Dependencies missing:**
```bash
npm install
cd server && npm install
cd ../web && npm install
```

---

## 📚 Additional Resources

- `START_GUIDE.md` - Quick start instructions
- `LOG_PREVIEW.md` - Examples of what logs look like
- `QUICKSTART.md` - Project setup guide

---

## 🪟 Windows Scripts (PowerShell)

All the same functionality is available on Windows using PowerShell scripts:

| Command | Purpose | Mac/Linux Equivalent |
|---------|---------|---------------------|
| `.\start.ps1` | Start with full logs | `./start.sh` |
| `.\start-quiet.ps1` | Start with minimal output | `./start-quiet.sh` |
| `.\stop.ps1` | Stop all servers | `./stop.sh` |
| `.\show-colors.ps1` | Show color guide | `./show-colors.sh` |

**Windows Users**: See `START_GUIDE_WINDOWS.md` for complete instructions.

### Quick Windows Start

```powershell
# Show color guide
.\show-colors.ps1

# Start with full colorful logs
.\start.ps1

# Stop servers
# Press Ctrl+C or run:
.\stop.ps1
```

### PowerShell Execution Policy

If you get an execution policy error, run PowerShell as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

**Need help?** Check the guides above or review the colorful logs - they tell you exactly what's happening!

