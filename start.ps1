# Evelyn Chat - Start Script for Windows
# PowerShell version with colorful logging

# Enable ANSI colors in PowerShell
$PSStyle.OutputRendering = [System.Management.Automation.OutputRendering]::Ansi

# Configuration
$BackendPort = 3001
$FrontendPort = 5000
$BackendUrl = "http://localhost:$BackendPort"
$FrontendUrl = "http://localhost:$FrontendPort"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Global variables for process management
$global:BackendJob = $null
$global:FrontendJob = $null

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║      Evelyn Chat - Starting...       ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Pre-flight checks
Write-Host "Running pre-flight checks..." -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed" -ForegroundColor Red
    Write-Host "  Please install Node.js 20+ from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version 2>$null
    Write-Host "✓ npm found: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm is not installed" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path "server\.env")) {
    Write-Host "✗ Missing server\.env file" -ForegroundColor Red
    Write-Host "  Creating from template..." -ForegroundColor Yellow
    if (Test-Path "server\.env.example") {
        Copy-Item "server\.env.example" "server\.env"
        Write-Host "  ⚠ Please edit server\.env and add your API keys:" -ForegroundColor Yellow
        Write-Host "     - OPENROUTER_API_KEY" -ForegroundColor Yellow
        Write-Host "     - PERPLEXITY_API_KEY" -ForegroundColor Yellow
        Write-Host "  Then run this script again." -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "✗ server\.env.example not found" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Environment file found" -ForegroundColor Green

# Check if API keys are set
$envContent = Get-Content "server\.env" -Raw -ErrorAction SilentlyContinue
if ($envContent -notmatch "OPENROUTER_API_KEY=sk-" -and $envContent -notmatch "OPENROUTER_API_KEY=your_") {
    Write-Host "⚠ OPENROUTER_API_KEY might not be set in server\.env" -ForegroundColor Yellow
}

if ($envContent -notmatch "PERPLEXITY_API_KEY=pplx-" -and $envContent -notmatch "PERPLEXITY_API_KEY=your_") {
    Write-Host "⚠ PERPLEXITY_API_KEY might not be set in server\.env" -ForegroundColor Yellow
}

# Check if ports are available
$backendPortInUse = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue
if ($backendPortInUse) {
    Write-Host "✗ Port $BackendPort is already in use" -ForegroundColor Red
    Write-Host "  Run '.\stop.ps1' to stop any existing servers" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Port $BackendPort is available" -ForegroundColor Green

$frontendPortInUse = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue
if ($frontendPortInUse) {
    Write-Host "✗ Port $FrontendPort is already in use" -ForegroundColor Red
    Write-Host "  Run '.\stop.ps1' to stop any existing servers" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Port $FrontendPort is available" -ForegroundColor Green

Write-Host ""

# Cleanup function
function Cleanup {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║    Shutting down servers...          ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Yellow
    
    if ($global:BackendJob) {
        Stop-Job $global:BackendJob -ErrorAction SilentlyContinue
        Remove-Job $global:BackendJob -ErrorAction SilentlyContinue
    }
    
    if ($global:FrontendJob) {
        Stop-Job $global:FrontendJob -ErrorAction SilentlyContinue
        Remove-Job $global:FrontendJob -ErrorAction SilentlyContinue
    }
    
    # Kill any remaining node processes from this project
    Get-Process node -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*tsx*" -or $_.CommandLine -like "*vite*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "✓ All servers stopped" -ForegroundColor Green
    Write-Host ""
}

# Register cleanup on exit
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

# Function to colorize and display logs
function Write-ColorizedLog {
    param(
        [string]$Line,
        [string]$ServerType
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $prefix = "[$timestamp]"
    
    # Skip empty lines
    if ([string]::IsNullOrWhiteSpace($Line)) { return }
    
    if ($ServerType -eq "BACKEND") {
        # Error logs
        if ($Line -match "error|failed|fail|exception") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor Red -NoNewline
            Write-Host $Line -ForegroundColor DarkRed
        }
        # Warning logs
        elseif ($Line -match "warn|warning") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor Yellow -NoNewline
            Write-Host $Line -ForegroundColor Yellow
        }
        # Success/completion logs
        elseif ($Line -match "✓|success|complete|ready|listening|started") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor Green -NoNewline
            Write-Host $Line -ForegroundColor Green
        }
        # InnerThought system logs
        elseif ($Line -match "\[InnerThought\]") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor Magenta -NoNewline
            Write-Host $Line -ForegroundColor Magenta
        }
        # Memory/Database logs
        elseif ($Line -match "\[Memory\]|\[Database\]|\[Prisma\]") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor Cyan -NoNewline
            Write-Host $Line -ForegroundColor Cyan
        }
        # Personality/Agent logs
        elseif ($Line -match "\[Personality\]|\[Agent\]|\[Orchestrator\]") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor Blue -NoNewline
            Write-Host $Line -ForegroundColor Blue
        }
        # WebSocket logs
        elseif ($Line -match "WebSocket|ws:|connection") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor Cyan -NoNewline
            Write-Host $Line -ForegroundColor Cyan
        }
        # API/Route logs
        elseif ($Line -match "GET|POST|PUT|DELETE|API") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor Blue -NoNewline
            Write-Host $Line
        }
        # Default logs
        else {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [BACKEND] " -ForegroundColor White -NoNewline
            Write-Host $Line
        }
    }
    elseif ($ServerType -eq "FRONTEND") {
        # Vite-specific formatting
        if ($Line -match "VITE") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [FRONTEND] " -ForegroundColor Cyan -NoNewline
            Write-Host $Line -ForegroundColor Cyan
        }
        elseif ($Line -match "Local:") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [FRONTEND] " -ForegroundColor Green -NoNewline
            Write-Host $Line -ForegroundColor Green
        }
        elseif ($Line -match "Network:") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [FRONTEND] " -ForegroundColor Blue -NoNewline
            Write-Host $Line -ForegroundColor Blue
        }
        elseif ($Line -match "error|Error") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [FRONTEND] " -ForegroundColor Red -NoNewline
            Write-Host $Line -ForegroundColor DarkRed
        }
        elseif ($Line -match "ready|✓") {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [FRONTEND] " -ForegroundColor Green -NoNewline
            Write-Host $Line -ForegroundColor Green
        }
        else {
            Write-Host $prefix -ForegroundColor DarkGray -NoNewline
            Write-Host " [FRONTEND] " -ForegroundColor Cyan -NoNewline
            Write-Host $Line
        }
    }
}

# Check if node_modules exist
if (-not (Test-Path "server\node_modules") -or -not (Test-Path "web\node_modules")) {
    Write-Host "⚠ Dependencies not found. Installing..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║    Starting Backend Server...        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Start backend in background job
$global:BackendJob = Start-Job -ScriptBlock {
    Set-Location $using:ScriptDir\server
    npm run dev 2>&1
}

# Wait for backend to initialize
Start-Sleep -Seconds 3

# Check if backend job is running
if ($global:BackendJob.State -ne "Running") {
    Write-Host "✗ Backend failed to start" -ForegroundColor Red
    Cleanup
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║    Starting Frontend Server...       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Start frontend in background job
$global:FrontendJob = Start-Job -ScriptBlock {
    Set-Location $using:ScriptDir\web
    npm run dev 2>&1
}

Write-Host ""
Write-Host "Waiting for servers to be ready..." -ForegroundColor Cyan

# Wait for backend to be ready
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        $backendReady = $true
        break
    } catch {
        try {
            $response = Invoke-WebRequest -Uri "$BackendUrl/api/personality" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
            $backendReady = $true
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
}

if ($backendReady) {
    Write-Host "✓ Backend is ready" -ForegroundColor Green
} else {
    Write-Host "⚠ Backend might still be starting..." -ForegroundColor Yellow
}

# Wait for frontend to be ready
$frontendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        $frontendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($frontendReady) {
    Write-Host "✓ Frontend is ready" -ForegroundColor Green
} else {
    Write-Host "⚠ Frontend might still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║    Servers started successfully!     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: " -NoNewline -ForegroundColor Cyan
Write-Host $FrontendUrl -ForegroundColor White
Write-Host "⚙️  Backend:  " -NoNewline -ForegroundColor Cyan
Write-Host $BackendUrl -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor DarkGray

# Ask if user wants to open browser
Write-Host ""
$timeout = 5
$timer = [Diagnostics.Stopwatch]::StartNew()
Write-Host "Open browser? [y/N] (auto-skip in ${timeout}s): " -NoNewline -ForegroundColor Cyan

$response = $null
while ($timer.Elapsed.TotalSeconds -lt $timeout) {
    if ([Console]::KeyAvailable) {
        $key = [Console]::ReadKey($true)
        $response = $key.KeyChar
        break
    }
    Start-Sleep -Milliseconds 100
}
$timer.Stop()

Write-Host ""
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "Opening browser..." -ForegroundColor Cyan
    Start-Process $FrontendUrl
}

Write-Host ""

# Main loop - display logs from both jobs
try {
    while ($true) {
        # Get backend output
        if ($global:BackendJob -and $global:BackendJob.State -eq "Running") {
            $backendOutput = Receive-Job $global:BackendJob -ErrorAction SilentlyContinue
            if ($backendOutput) {
                foreach ($line in $backendOutput) {
                    Write-ColorizedLog -Line $line.ToString() -ServerType "BACKEND"
                }
            }
        }
        
        # Get frontend output
        if ($global:FrontendJob -and $global:FrontendJob.State -eq "Running") {
            $frontendOutput = Receive-Job $global:FrontendJob -ErrorAction SilentlyContinue
            if ($frontendOutput) {
                foreach ($line in $frontendOutput) {
                    Write-ColorizedLog -Line $line.ToString() -ServerType "FRONTEND"
                }
            }
        }
        
        # Check if either job has failed
        if ($global:BackendJob.State -eq "Failed") {
            Write-Host "Backend job failed!" -ForegroundColor Red
            break
        }
        if ($global:FrontendJob.State -eq "Failed") {
            Write-Host "Frontend job failed!" -ForegroundColor Red
            break
        }
        
        # Small delay to prevent CPU spinning
        Start-Sleep -Milliseconds 100
    }
}
catch {
    # Catch Ctrl+C or other interrupts
    Write-Host "Interrupted" -ForegroundColor Yellow
}
finally {
    Cleanup
}

