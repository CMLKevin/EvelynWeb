# 🔐 Evelyn Chat - Setup Guide

## ⚠️ Security First

This project uses API keys that must be configured before running. **Never commit API keys to git!**

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- API Keys:
  - [OpenRouter API Key](https://openrouter.ai/keys)
  - [Perplexity API Key](https://www.perplexity.ai/settings/api)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/CMLKevin/EvelynChat-main.git
cd EvelynChat-main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Keys

**Important:** Create a `.env` file in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Then edit `server/.env` and add your actual API keys:

```env
OPENROUTER_API_KEY=your_actual_openrouter_key_here
PERPLEXITY_API_KEY=your_actual_perplexity_key_here
```

### 4. Setup Database

```bash
cd server
npm run db:generate
npm run db:push
```

### 5. Start the Application

**Option 1: Use the Start Scripts (Easiest)**

**Mac/Linux:**
```bash
./start.sh
```

**Windows:**
```powershell
.\start.ps1
```
or double-click: `start.bat`

**Option 2: Manual Start**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd web
npm run dev
```

### 6. Access the Application

Open your browser to: `http://localhost:5173`

## 📁 Project Structure

```
EvelynChat-main/
├── server/           # Backend (Node.js + Prisma + Socket.io)
│   ├── src/         # Source code
│   ├── prisma/      # Database schema & migrations
│   └── .env         # ⚠️ YOUR API KEYS (DO NOT COMMIT)
├── web/             # Frontend (React + Vite)
├── start.sh         # Mac/Linux startup script
├── start.ps1        # Windows PowerShell script
└── start.bat        # Windows batch file
```

## 🔑 Required Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | ✅ Yes | None |
| `PERPLEXITY_API_KEY` | Perplexity API key | ✅ Yes | None |
| `DATABASE_URL` | Database file path | No | `file:./prisma/dev.db` |
| `PORT` | Server port | No | `3001` |
| `MODEL_CHAT` | Main chat model | No | `deepseek/deepseek-chat-v3.1` |
| `MODEL_THINK_SIMPLE` | Simple reasoning | No | `x-ai/grok-4-fast` |
| `MODEL_THINK_COMPLEX` | Complex reasoning | No | `minimax/minimax-m2` |

## 🛠️ Available Scripts

### Cross-Platform Scripts

| Script | Platform | Purpose |
|--------|----------|---------|
| `./start.sh` | Mac/Linux | Start with colorful logs |
| `.\start.ps1` | Windows | Start with colorful logs |
| `start.bat` | Windows | Easy double-click start |
| `./stop.sh` | Mac/Linux | Stop all servers |
| `.\stop.ps1` | Windows | Stop all servers |

### npm Scripts

**Server:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:studio` - Open Prisma Studio (database GUI)

**Web:**
- `npm run dev` - Start development server
- `npm run build` - Build for production

## 🔒 Security Notes

### ⚠️ IMPORTANT: If Your Keys Were Exposed

If you accidentally committed API keys to git:

1. **Immediately rotate your keys:**
   - [Regenerate OpenRouter key](https://openrouter.ai/keys)
   - [Regenerate Perplexity key](https://www.perplexity.ai/settings/api)

2. **Update your `.env` file** with the new keys

3. **Scrub git history** (advanced):
   ```bash
   # Remove the commit with exposed keys
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch server/src/providers/*.ts" \
   --prune-empty --tag-name-filter cat -- --all
   
   # Force push (⚠️ use with caution)
   git push origin --force --all
   ```

### Files That Should NEVER Be Committed

- ✅ Already protected by `.gitignore`:
  - `server/.env` - Your API keys
  - `server/prisma/dev.db` - Your personal database
  - `server/prisma/backups/**/*.db` - Database backups
  - `node_modules/` - Dependencies

## 🆘 Troubleshooting

### Error: "OPENROUTER_API_KEY environment variable is required"

**Solution:** You haven't created the `.env` file or it's missing the API key.
```bash
cd server
cp .env.example .env
# Then edit .env with your actual keys
```

### Error: "Port 3001 already in use"

**Solution:** Another process is using port 3001.
```bash
# Mac/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Database Issues

**Solution:** Reset the database:
```bash
cd server
rm prisma/dev.db
npm run db:push
```

## 📚 Additional Documentation

- `README.md` - Project overview
- `SCRIPTS_OVERVIEW.md` - Detailed script documentation
- `LOG_PREVIEW.md` - Log output examples
- `START_GUIDE_WINDOWS.md` - Windows-specific guide

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. **Never commit API keys or personal data**
4. Test your changes
5. Submit a pull request

## 📝 License

See `LICENSE` file for details.

---

**Remember:** Your `.env` file is protected by `.gitignore`. Keep your API keys safe! 🔐

