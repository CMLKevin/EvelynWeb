# Start Scripts - New Features

## 🎉 What's New

Both `start.sh` (Mac/Linux) and `start.ps1` (Windows) now include:

### ✅ Pre-Flight Checks

Before starting anything, the scripts now verify:

1. **Node.js Installation** - Checks if Node.js is installed and displays version
2. **npm Installation** - Verifies npm is available and shows version
3. **Environment File** - Checks if `server/.env` exists
   - If missing, automatically creates it from `server/.env.example`
   - Reminds you to add your API keys before proceeding
4. **API Key Configuration** - Warns if API keys appear to be missing or not configured
5. **Port Availability** - Ensures ports 3001 (backend) and 5000 (frontend) are free
   - If ports are in use, suggests running the stop script

### 🏥 Health Checks

After starting both servers, the scripts:

1. **Wait for Backend** - Polls `http://localhost:3001/api/health` or `/api/personality`
   - Waits up to 30 seconds for the backend to be ready
   - Shows "✓ Backend is ready" when successful
2. **Wait for Frontend** - Polls `http://localhost:5000`
   - Waits up to 30 seconds for the frontend to be ready
   - Shows "✓ Frontend is ready" when successful
3. **Display Success Message** - Shows a beautiful success box with:
   - 🌐 Frontend URL: http://localhost:5000
   - ⚙️  Backend URL: http://localhost:3001

### 🌐 Browser Auto-Open

After the servers are ready:

1. **Interactive Prompt** - Asks "Open browser? [y/N]"
2. **5-Second Timeout** - Auto-skips after 5 seconds (so it won't block automated runs)
3. **Press Y** - Opens your default browser to the frontend URL
4. **Any Other Key or Wait** - Continues without opening browser

### 📊 Port Configuration

All port numbers are now defined as variables at the top:

```bash
# Mac/Linux (start.sh)
BACKEND_PORT=3001
FRONTEND_PORT=5000
BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
```

```powershell
# Windows (start.ps1)
$BackendPort = 3001
$FrontendPort = 5000
$BackendUrl = "http://localhost:$BackendPort"
$FrontendUrl = "http://localhost:$FrontendPort"
```

Want to change ports? Just update these variables!

### 🎨 Better Error Messages

All errors now include:
- ✗ Clear problem description
- 💡 Actionable suggestions to fix the issue
- 🎯 Specific commands to run

## 🚀 Example Flow

```
╔════════════════════════════════════════╗
║      Evelyn Chat - Starting...       ║
╚════════════════════════════════════════╝

Running pre-flight checks...
✓ Node.js found: v22.3.0
✓ npm found: v10.8.1
✓ Environment file found
✓ Port 3001 is available
✓ Port 5000 is available

╔════════════════════════════════════════╗
║    Starting Backend Server...        ║
╚════════════════════════════════════════╝

[10:30:15] [BACKEND] Server starting...
[10:30:16] [BACKEND] ✓ Database connected

╔════════════════════════════════════════╗
║    Starting Frontend Server...       ║
╚════════════════════════════════════════╝

[10:30:17] [FRONTEND] VITE v5.4.10 ready in 420 ms
[10:30:17] [FRONTEND] ➜  Local: http://localhost:5000/

Waiting for servers to be ready...
✓ Backend is ready
✓ Frontend is ready

╔════════════════════════════════════════╗
║    Servers started successfully!     ║
╚════════════════════════════════════════╝

🌐 Frontend: http://localhost:5000
⚙️  Backend:  http://localhost:3001

Press Ctrl+C to stop both servers

Open browser? [y/N] (auto-skip in 5s): █
```

## 🐛 Error Examples

### Missing .env File

```
✗ Missing server/.env file
  Creating from template...
  ⚠ Please edit server/.env and add your API keys:
     - OPENROUTER_API_KEY
     - PERPLEXITY_API_KEY
  Then run this script again.
```

### Port Already in Use

```
✗ Port 3001 is already in use
  Run './stop.sh' to stop any existing servers
```

### Node.js Not Installed

```
✗ Node.js is not installed
  Please install Node.js 20+ from https://nodejs.org/
```

## 📝 Technical Details

### Mac/Linux (`start.sh`)
- Uses `lsof` to check port availability
- Uses `curl` for health checks
- Uses `open` (Mac) or `xdg-open` (Linux) for browser launch
- Uses `read -t 5` for timeout-based prompt

### Windows (`start.ps1`)
- Uses `Get-NetTCPConnection` to check port availability
- Uses `Invoke-WebRequest` for health checks
- Uses `Start-Process` for browser launch
- Uses `[Console]::KeyAvailable` with a timer for timeout-based prompt

### Windows Batch (`start.bat`)
- Simple wrapper that launches `start.ps1`
- No changes needed - all improvements are in the PowerShell script

## 🎯 Benefits

1. **No More Port Confusion** - Clearly see which ports are being used
2. **Catch Issues Early** - Find problems before servers start
3. **Know When Ready** - Clear feedback when servers are actually responding
4. **Faster Development** - Optional browser auto-open saves a step
5. **Better Debugging** - Detailed error messages guide you to solutions
6. **Cross-Platform** - Consistent experience on Mac, Linux, and Windows

## 🔄 Backward Compatibility

All existing functionality is preserved:
- ✅ Colorful log output still works
- ✅ Ctrl+C still stops both servers
- ✅ Process cleanup still works correctly
- ✅ npm dependencies are still auto-checked

The only changes are **additions** - nothing was removed or broken!

