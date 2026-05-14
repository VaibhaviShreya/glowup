# ✨ Glow-Up & Life Alignment Tracker v2

## What's Fixed in v2
- ✅ Persistent data — PostgreSQL on Render (never lost on restart)
- ✅ Mood tracker with 6 moods + personalized advice
- ✅ Note history — past 30 days with mood + gratitude
- ✅ Emotion reminder banner — rotating quotes
- ✅ JSON fallback for local dev

## 🚀 Deploy to Render FREE

### Step 1 — Push to GitHub
Upload all files to a new GitHub repo.

### Step 2 — Create Free PostgreSQL on Render
Render → New → PostgreSQL → Free plan → Copy the "Internal Database URL"

### Step 3 — Create Web Service
Render → New → Web Service → Connect GitHub repo
- Build Command: npm install
- Start Command: npm start
- Add Environment Variable: DATABASE_URL = (paste Internal Database URL)

Done! Data persists permanently in PostgreSQL.

## Local Dev (no DB needed)
```
npm install && npm start
```
Opens on http://localhost:3000 with JSON file fallback.
