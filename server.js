import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');
const mailConfigured = Boolean(
  process.env.RESEND_API_KEY &&
  process.env.MAIL_FROM &&
  process.env.MAIL_TO &&
  !process.env.RESEND_API_KEY.startsWith('your-') &&
  !process.env.MAIL_FROM.includes('example.com') &&
  !process.env.MAIL_TO.includes('example.com')
);

// Sent over HTTPS via Resend's API instead of raw SMTP: Render blocks
// outbound SMTP ports (25/465/587) at the platform level, so no SMTP
// provider works from a Render web service regardless of host/port.
async function sendMail({ to, from, replyTo, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, reply_to: replyTo, subject, text, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Deliberately loose: the browser's type="email" does the fine-grained check;
// this just rejects obviously broken values and header-injection attempts.
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

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
  const { name, email, company, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Nom, email et message requis.' });
  }

  const cleanEmail = String(email).trim().slice(0, 254);
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ ok: false, error: 'Adresse email invalide.' });
  }

  const entry = {
    name: String(name).slice(0, 200),
    email: cleanEmail,
    company: String(company || '').slice(0, 200),
    message: String(message).slice(0, 4000),
    receivedAt: new Date().toISOString(),
  };

  const all = readSubmissions();
  all.push(entry);
  writeSubmissions(all);

  // Respond immediately to the client
  res.json({ ok: true });

  // Send email in the background (don't wait for it)
  if (mailConfigured) {
    console.log(`[${new Date().toISOString()}] Attempting to send email to:`, process.env.MAIL_TO);
    const mailBody = [
      `Nom: ${entry.name}`,
      `Email: ${entry.email}`,
      `Entreprise: ${entry.company || 'Non renseignée'}`,
      `Reçu le: ${entry.receivedAt}`,
      '',
      'Demande:',
      entry.message,
    ].join('\n');

    sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      // "Reply" in the inbox goes straight to the visitor; MAIL_FROM must stay
      // a Resend-verified sender, so the visitor's address can't go there.
      replyTo: entry.email,
      subject: `Nouveau message de ${entry.name} <${entry.email}>`,
      text: mailBody,
      html: `<h2>Nouvelle demande de contact</h2>
        <p><strong>Nom:</strong> ${escapeHtml(entry.name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(entry.email)}">${escapeHtml(entry.email)}</a></p>
        <p><strong>Entreprise:</strong> ${escapeHtml(entry.company) || 'Non renseignée'}</p>
        <p><strong>Reçu le:</strong> ${entry.receivedAt}</p>
        <hr>
        <p><strong>Demande:</strong></p>
        <p>${escapeHtml(entry.message).replaceAll('\n', '<br>')}</p>`,
    })
      .then(() => {
        console.log(`[${new Date().toISOString()}] Email sent successfully`);
      })
      .catch(error => {
        console.error(`[${new Date().toISOString()}] Email delivery failed:`, error.message);
      });
  } else {
    console.warn('Mail not configured');
  }
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
  console.log(`Mail configured: ${mailConfigured}`);
  if (mailConfigured) {
    console.log(`Sending emails to: ${process.env.MAIL_TO}`);
  }
});
