const express  = require('express');
const cors     = require('cors');
const { Pool } = require('pg');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── PostgreSQL (Render) or JSON fallback (local dev) ─────────────────────────
let pool  = null;
let useDB = false;

if (process.env.DATABASE_URL) {
  pool  = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  useDB = true;
  console.log('Using PostgreSQL');
} else {
  console.log('No DATABASE_URL — using JSON fallback');
}

// ── JSON fallback helpers ─────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE  = path.join(DATA_DIR, 'habits.json');

function ensureLocal() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE))
    fs.writeFileSync(DB_FILE, JSON.stringify({ habits:{}, gratitude:{}, notes:{} }));
}
function readLocal() {
  try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }
  catch { return { habits:{}, gratitude:{}, notes:{} }; }
}
function writeLocal(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }

// ── Init DB tables ────────────────────────────────────────────────────────────
async function initDB() {
  if (!useDB) { ensureLocal(); return; }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS habits (
      date       TEXT    NOT NULL,
      habit_id   TEXT    NOT NULL,
      done       BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (date, habit_id)
    );
    CREATE TABLE IF NOT EXISTS gratitude (
      date       TEXT PRIMARY KEY,
      item1      TEXT DEFAULT '',
      item2      TEXT DEFAULT '',
      item3      TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS notes (
      date       TEXT PRIMARY KEY,
      content    TEXT DEFAULT '',
      mood       TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('DB tables ready');
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── GET /api/day/:date ────────────────────────────────────────────────────────
app.get('/api/day/:date', async (req, res) => {
  const { date } = req.params;
  try {
    if (useDB) {
      const [h, g, n] = await Promise.all([
        pool.query('SELECT habit_id, done FROM habits WHERE date=$1', [date]),
        pool.query('SELECT item1,item2,item3 FROM gratitude WHERE date=$1', [date]),
        pool.query('SELECT content, mood FROM notes WHERE date=$1', [date])
      ]);
      const habits = {};
      h.rows.forEach(r => { habits[r.habit_id] = r.done; });
      const gr = g.rows[0] || {};
      const nr = n.rows[0] || {};
      res.json({
        habits,
        gratitude: [gr.item1||'', gr.item2||'', gr.item3||''].filter(Boolean),
        note: nr.content || '',
        mood: nr.mood    || ''
      });
    } else {
      const db  = readLocal();
      const nd  = db.notes[date] || {};
      res.json({
        habits:    db.habits[date]    || {},
        gratitude: db.gratitude[date] || [],
        note: typeof nd === 'string' ? nd : (nd.content || ''),
        mood: typeof nd === 'object' ? (nd.mood || '') : ''
      });
    }
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── POST /api/habit ───────────────────────────────────────────────────────────
app.post('/api/habit', async (req, res) => {
  const { date, id, done } = req.body;
  if (!date || !id) return res.status(400).json({ error: 'date and id required' });
  try {
    if (useDB) {
      await pool.query(
        `INSERT INTO habits (date, habit_id, done, updated_at) VALUES ($1,$2,$3,NOW())
         ON CONFLICT (date, habit_id) DO UPDATE SET done=$3, updated_at=NOW()`,
        [date, id, done]
      );
    } else {
      const db = readLocal();
      if (!db.habits[date]) db.habits[date] = {};
      db.habits[date][id] = done;
      writeLocal(db);
    }
    res.json({ ok: true });
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── GET /api/week/:startDate ──────────────────────────────────────────────────
app.get('/api/week/:startDate', async (req, res) => {
  const start = new Date(req.params.startDate);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate()+i);
    dates.push(d.toISOString().split('T')[0]);
  }
  try {
    if (useDB) {
      const r = await pool.query(
        'SELECT date, habit_id, done FROM habits WHERE date = ANY($1)', [dates]
      );
      const week = {};
      dates.forEach(d => { week[d] = {}; });
      r.rows.forEach(row => { week[row.date][row.habit_id] = row.done; });
      res.json(week);
    } else {
      const db = readLocal();
      const week = {};
      dates.forEach(d => { week[d] = db.habits[d] || {}; });
      res.json(week);
    }
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── GET /api/streak ───────────────────────────────────────────────────────────
app.get('/api/streak', async (req, res) => {
  try {
    if (useDB) {
      const r = await pool.query(
        `SELECT date, habit_id, done FROM habits
         WHERE date >= NOW() - INTERVAL '90 days' ORDER BY date DESC`
      );
      const habits = {};
      r.rows.forEach(row => {
        if (!habits[row.date]) habits[row.date] = {};
        habits[row.date][row.habit_id] = row.done;
      });
      res.json({ habits });
    } else {
      res.json({ habits: readLocal().habits });
    }
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── POST /api/gratitude ───────────────────────────────────────────────────────
app.post('/api/gratitude', async (req, res) => {
  const { date, items } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  const [i1='',i2='',i3=''] = items || [];
  try {
    if (useDB) {
      await pool.query(
        `INSERT INTO gratitude (date, item1, item2, item3, updated_at) VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (date) DO UPDATE SET item1=$2, item2=$3, item3=$4, updated_at=NOW()`,
        [date, i1, i2, i3]
      );
    } else {
      const db = readLocal();
      db.gratitude[date] = [i1,i2,i3].filter(Boolean);
      writeLocal(db);
    }
    res.json({ ok: true });
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── POST /api/note ────────────────────────────────────────────────────────────
app.post('/api/note', async (req, res) => {
  const { date, note='', mood='' } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  try {
    if (useDB) {
      await pool.query(
        `INSERT INTO notes (date, content, mood, updated_at) VALUES ($1,$2,$3,NOW())
         ON CONFLICT (date) DO UPDATE SET content=$2, mood=$3, updated_at=NOW()`,
        [date, note, mood]
      );
    } else {
      const db = readLocal();
      db.notes[date] = { content: note, mood };
      writeLocal(db);
    }
    res.json({ ok: true });
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── GET /api/journal/history ──────────────────────────────────────────────────
app.get('/api/journal/history', async (req, res) => {
  try {
    if (useDB) {
      const r = await pool.query(
        `SELECT n.date, n.content, n.mood,
                g.item1, g.item2, g.item3
         FROM notes n
         LEFT JOIN gratitude g ON g.date = n.date
         WHERE n.content != '' OR n.mood != ''
         ORDER BY n.date DESC LIMIT 30`
      );
      res.json(r.rows);
    } else {
      const db = readLocal();
      const rows = Object.entries(db.notes)
        .map(([date, v]) => ({
          date,
          content: typeof v === 'object' ? v.content : v,
          mood:    typeof v === 'object' ? v.mood    : '',
          item1: (db.gratitude[date]||[])[0]||'',
          item2: (db.gratitude[date]||[])[1]||'',
          item3: (db.gratitude[date]||[])[2]||''
        }))
        .filter(r => r.content || r.mood)
        .sort((a,b) => b.date.localeCompare(a.date))
        .slice(0, 30);
      res.json(rows);
    }
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', db: useDB?'postgres':'json', time: new Date().toISOString() });
});

// ── Catch-all ─────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Boot ──────────────────────────────────────────────────────────────────────
initDB()
  .then(() => app.listen(PORT, () => console.log(`Glow-Up Tracker on port ${PORT}`)))
  .catch(err => {
    console.error('DB init error:', err.message, '— starting with JSON fallback');
    useDB = false;
    ensureLocal();
    app.listen(PORT, () => console.log(`Running on port ${PORT} (JSON fallback)`));
  });
