const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'habits.json');

// ── Ensure data directory exists ──
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ habits: {}, gratitude: {}, notes: {}, streaks: {} }));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Helper: read/write DB ──
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { habits: {}, gratitude: {}, notes: {}, streaks: {} };
  }
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── GET all data for a date ──
app.get('/api/day/:date', (req, res) => {
  const db = readDB();
  const { date } = req.params;
  res.json({
    habits: db.habits[date] || {},
    gratitude: db.gratitude[date] || [],
    note: db.notes[date] || ''
  });
});

// ── POST toggle a habit ──
app.post('/api/habit', (req, res) => {
  const { date, id, done } = req.body;
  if (!date || !id) return res.status(400).json({ error: 'date and id required' });
  const db = readDB();
  if (!db.habits[date]) db.habits[date] = {};
  db.habits[date][id] = done;
  writeDB(db);
  res.json({ ok: true, date, id, done });
});

// ── GET weekly data ──
app.get('/api/week/:startDate', (req, res) => {
  const db = readDB();
  const start = new Date(req.params.startDate);
  const week = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().split('T')[0];
    week[key] = db.habits[key] || {};
  }
  res.json(week);
});

// ── POST gratitude ──
app.post('/api/gratitude', (req, res) => {
  const { date, items } = req.body;
  if (!date || !Array.isArray(items)) return res.status(400).json({ error: 'date and items required' });
  const db = readDB();
  db.gratitude[date] = items;
  writeDB(db);
  res.json({ ok: true });
});

// ── POST note ──
app.post('/api/note', (req, res) => {
  const { date, note } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  const db = readDB();
  db.notes[date] = note;
  writeDB(db);
  res.json({ ok: true });
});

// ── GET streak ──
app.get('/api/streak', (req, res) => {
  const db = readDB();
  res.json({ habits: db.habits });
});

// ── Health check ──
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Catch-all → index.html ──
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✨ Glow-Up Tracker running on port ${PORT}`);
});
