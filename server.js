import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');
const mailConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.MAIL_FROM &&
  process.env.MAIL_TO &&
  !process.env.SMTP_HOST.includes('example.com') &&
  !process.env.SMTP_USER.startsWith('your-') &&
  !process.env.SMTP_PASS.startsWith('your-') &&
  !process.env.MAIL_FROM.includes('example.com') &&
  !process.env.MAIL_TO.includes('example.com')
);
const mailTransport = mailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

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
app.post('/api/contact', async (req, res) => {
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

  if (!mailTransport) {
    return res.status(503).json({
      ok: false,
      error: 'Le service email n\'est pas configuré sur le serveur.',
    });
  }

  const mailBody = [
    `Nom: ${entry.name}`,
    `Entreprise: ${entry.company || 'Non renseignée'}`,
    `Reçu le: ${entry.receivedAt}`,
    '',
    'Demande:',
    entry.message,
  ].join('\n');

  try {
    await mailTransport.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      replyTo: process.env.MAIL_FROM,
      subject: `Nouveau message de ${entry.name}`,
      text: mailBody,
      html: `<h2>Nouvelle demande de contact</h2>
        <p><strong>Nom:</strong> ${entry.name}</p>
        <p><strong>Entreprise:</strong> ${entry.company || 'Non renseignée'}</p>
        <p><strong>Reçu le:</strong> ${entry.receivedAt}</p>
        <hr>
        <p><strong>Demande:</strong></p>
        <p>${entry.message.replaceAll('\n', '<br>')}</p>`,
    });
  } catch (error) {
    console.error('Email delivery failed:', error.message);
    return res.status(502).json({
      ok: false,
      error: 'Le message a été enregistré, mais l\'email n\'a pas pu être envoyé.',
    });
  }

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
