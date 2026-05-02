# ✨ Glow-Up & Life Alignment Tracker

A full-stack wellness + habit tracker for female students. Built with Node.js + Express backend and a beautiful mobile-first frontend.

## Features
- 16 time blocks covering 6:30 AM → 11:00 PM
- 40+ daily habits with tap-to-check interaction
- Live score ring + streak counter
- Weekly calendar with per-day scores and stats
- Mantra practice with chant counter (counts to 108)
- Skin & diet reference cards
- Gratitude journal + daily notes (saved to server)
- Browser push notifications for reminders

## Local Development

```bash
npm install
npm start
```
Open http://localhost:3000

## Deploy to Render (Free)

1. Push this folder to a **GitHub repository**
2. Go to https://render.com → **New → Web Service**
3. Connect your GitHub repo
4. Fill in these settings:
   - **Name**: glowup-tracker (or anything)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Click **Create Web Service**
6. Wait ~2 min for deploy — your URL appears at the top!

## Tech Stack
- **Backend**: Node.js + Express
- **Storage**: JSON file (data/habits.json) — persistent on Render disk
- **Frontend**: Vanilla HTML/CSS/JS — no framework needed
- **Fonts**: Cormorant Garamond + DM Sans (Google Fonts)

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/day/:date | Get all data for a date |
| POST | /api/habit | Toggle a habit |
| GET | /api/week/:startDate | Get week data |
| POST | /api/gratitude | Save gratitude entries |
| POST | /api/note | Save daily note |
| GET | /api/streak | Get all habit history |
| GET | /api/health | Health check |
