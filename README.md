# OnChat - Free Deployment Guide

## Project Structure
```
chat-app/
├── backend/          # Python FastAPI
├── web/             # React web frontend
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Deploy Everything Free

### 1. Database (Supabase)
1. Go to supabase.com → New project
2. Get connection string: `postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:6543/postgres`
3. Copy for Railway setup

### 2. Backend (Railway)
1. Go to railway.app → New Project → Connect GitHub repo
2. Add environment variables:
   ```
   DATABASE_URL=postgresql+asyncpg://...
   SECRET_KEY=your-random-64-char-string
   REDIS_URL=redis://localhost:6379 (or use Redis Cloud free tier)
   ```
3. Railway auto-detects FastAPI, deploys with `uvicorn chat_service.main:app`

**Railway Free Tier:** $5 credit/mo, sleeps after 15min inactivity

### 3. Frontend (Vercel)
1. Go to vercel.com → New Project → Import `web/` folder
2. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-app.railway.app
   ```
3. Deploy

**Vercel Free Tier:** 100GB bandwidth, unlimited deployments

---

## Slash Commands (Built-in)

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/online` | List online users |
| `/members` | List all channel members |

**How it works:**
- Type `/` to see command suggestions
- Use arrow keys to navigate, Enter/Tab to select
- System responses appear as special messages

---

## Features

- JWT Authentication
- Real-time messaging (Socket.IO)
- Direct messages & group chats
- Emoji reactions
- Online status
- Contact management + block
- Slash commands for workflows

---

## Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
# Set .env with DATABASE_URL, SECRET_KEY
uvicorn chat_service.main:app --reload --port 8000
```

**Frontend:**
```bash
cd web
npm install
npm run dev
```

**Web runs on:** http://localhost:3000
**API runs on:** http://localhost:8000