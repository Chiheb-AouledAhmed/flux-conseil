import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readSubmissions() {
  try {
    return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeSubmissions(data) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(data, null, 2));
}

// Contact form submission
app.post('/api/contact', (req, res) => {
  const { name, company, message } = req.body || {};

  if (!name || !message) {
    return res.status(400).json({ ok: false, error: 'Nom et message requis.' });
  }

  const entry = {
    name: String(name).slice(0, 200),
    company: String(company || '').slice(0, 200),
    message: String(message).slice(0, 4000),
    receivedAt: new Date().toISOString(),
  };

  const all = readSubmissions();
  all.push(entry);
  writeSubmissions(all);

  // Swap this console.log for a real email send (see README) when you go live.
  console.log('New contact submission:', entry);

  res.json({ ok: true });
});

// List submissions (simple admin view — protect this before going live, see README)
app.get('/api/contact', (req, res) => {
  res.json(readSubmissions());
});

// Dashboard stats — replace with a real data source (a DB, a project-tracking
// export, etc.) once you're tracking actual project lots.
app.get('/api/stats', (req, res) => {
  const lots = [
    { name: 'Lot A', progress: 55 },
    { name: 'Lot B', progress: 82 },
    { name: 'Lot C', progress: 40 },
    { name: 'Lot D', progress: 68 },
    { name: 'Lot E', progress: 30 },
  ];
  res.json({ lots, updatedAt: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Flux Conseil server running on http://localhost:${PORT}`);
});
