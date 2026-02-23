const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const { Resend } = require('resend');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const ALLOWED_YEARS = new Set(['2024', '2025', '2026']);
const UPLOAD_ROOT =
  process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
const DATA_ROOT = process.env.DATA_DIR || path.join(__dirname, '../data');
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
const RSVP_FILE = path.join(DATA_ROOT, 'rsvps.json');
const RSVP_RECIPIENTS = ['john.kanel@hey.com', 'Brockword@yahoo.com'];
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM || 'Soup Party RSVP <no-reply@febsucksoup.com>';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
fs.mkdirSync(DATA_ROOT, { recursive: true });
ensureRsvpStore();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const year = sanitizeYear(req.body.year);
    if (!year) {
      return cb(new Error('Invalid year'));
    }
    const targetDir = path.join(UPLOAD_ROOT, year);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB per file
    files: 10
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image uploads are allowed.'));
    }
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_ROOT));

app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get('/api/photos/:year', async (req, res) => {
  try {
    const year = sanitizeYear(req.params.year);
    if (!year) {
      return res.status(400).json({ error: 'Invalid year supplied.' });
    }
    const photos = await listPhotos(year);
    return res.json({ photos });
  } catch (error) {
    console.error('Failed to list photos', error);
    return res.status(500).json({ error: 'Unable to load gallery.' });
  }
});

app.post('/api/photos', upload.array('photos', 10), async (req, res) => {
  const token = req.body.token;
  const year = sanitizeYear(req.body.year);
  const files = req.files ?? [];

  if (!year) {
    cleanupFiles(files);
    return res.status(400).json({ error: 'Year is required.' });
  }

  if (!files.length) {
    return res
      .status(400)
      .json({ error: 'Please include at least one image file.' });
  }

  try {
    const isHuman = await verifyRecaptcha(token, req.ip);
    if (!isHuman) {
      cleanupFiles(files);
      return res.status(401).json({ error: 'reCAPTCHA validation failed.' });
    }

    const payload = await Promise.all(
      files.map(async (file) => {
        const stats = await fsPromises.stat(file.path);
        return buildPhotoPayload(year, path.basename(file.filename), stats);
      })
    );

    return res.status(201).json({ photos: payload });
  } catch (error) {
    console.error('Upload failed', error);
    cleanupFiles(files);
    return res.status(500).json({ error: 'Unable to upload photos right now.' });
  }
});

app.get('/api/rsvps', async (_req, res) => {
  try {
    const list = await readRsvps();
    res.json({ attendees: list });
  } catch (error) {
    console.error('Failed to read RSVP list', error);
    res.status(500).json({ error: 'Unable to load RSVP list.' });
  }
});

app.post('/api/rsvps', async (req, res) => {
  try {
    const payload = normalizeRsvp(req.body);
    if (!payload) {
      return res
        .status(400)
        .json({ error: 'Name and number attending are required.' });
    }

    const list = await readRsvps();
    list.push(payload);
    await fsPromises.writeFile(RSVP_FILE, JSON.stringify(list, null, 2));
    await sendRsvpEmail(list, payload);

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Failed to save RSVP', error);
    return res.status(500).json({ error: 'Unable to save RSVP right now.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../dist');
  if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('/form', (_req, res) =>
      res.sendFile(path.join(clientPath, 'form.html'))
    );
    app.get('*', (_req, res) =>
      res.sendFile(path.join(clientPath, 'index.html'))
    );
  }
}

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

function sanitizeYear(rawYear = '') {
  const cleaned = String(rawYear);
  return ALLOWED_YEARS.has(cleaned) ? cleaned : null;
}

async function listPhotos(year) {
  const yearDir = path.join(UPLOAD_ROOT, year);
  try {
    const entries = await fsPromises.readdir(yearDir);
    const payload = await Promise.all(
      entries.map(async (fileName) => {
        const filePath = path.join(yearDir, fileName);
        const stats = await fsPromises.stat(filePath);
        if (!stats.isFile()) return null;
        return buildPhotoPayload(year, fileName, stats);
      })
    );
    return payload.filter(Boolean);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function buildPhotoPayload(year, fileName, stats) {
  return {
    fileName,
    year,
    url: `/uploads/${year}/${fileName}`,
    uploadedAt: stats.mtime,
    size: stats.size
  };
}

async function verifyRecaptcha(token, remoteIp) {
  if (!RECAPTCHA_SECRET) {
    console.warn('Missing RECAPTCHA_SECRET. Skipping verification.');
    return true;
  }

  if (!token) {
    return false;
  }

  const params = new URLSearchParams();
  params.append('secret', RECAPTCHA_SECRET);
  params.append('response', token);
  if (remoteIp) {
    params.append('remoteip', remoteIp);
  }

  const response = await fetch(
    'https://www.google.com/recaptcha/api/siteverify',
    {
      method: 'POST',
      body: params
    }
  );

  const data = await response.json();
  if (!data.success) {
    console.warn('reCAPTCHA verification failed', data['error-codes']);
  }
  return data.success;
}

function cleanupFiles(files) {
  files.forEach((file) => {
    fsPromises
      .unlink(file.path)
      .catch((error) => console.error('Failed to clean temp file', error));
  });
}

function ensureRsvpStore() {
  if (!fs.existsSync(RSVP_FILE)) {
    fs.writeFileSync(RSVP_FILE, '[]', 'utf-8');
  }
}

async function readRsvps() {
  const raw = await fsPromises.readFile(RSVP_FILE, 'utf-8');
  return JSON.parse(raw || '[]');
}

function normalizeRsvp(body = {}) {
  const name = String(body.name ?? '').trim();
  const guests = Number(body.guests);
  if (!name || Number.isNaN(guests) || guests < 1) {
    return null;
  }
  return {
    name,
    guests,
    submittedAt: new Date().toISOString()
  };
}

async function sendRsvpEmail(list, latest) {
  const subject = `[RSVP] ${latest.name} is coming! (party of ${latest.guests})`;
  const rows = list
    .map(
      (entry, idx) =>
        `${idx + 1}. ${entry.name} (party of ${entry.guests})`
    )
    .join('\n');
  const text = `
New RSVP from ${latest.name}
Guests: ${latest.guests}
Submitted: ${new Date(latest.submittedAt).toLocaleString()}

Current roster:
${rows}
`;

  const htmlRows = list
    .map(
      (entry, idx) =>
        `<li><strong>${idx + 1}.</strong> ${entry.name} (party of ${entry.guests})</li>`
    )
    .join('');

  const html = `
    <h2>New RSVP: ${latest.name}</h2>
    <p><strong>Guests:</strong> ${latest.guests}<br/>
    <strong>Submitted:</strong> ${new Date(latest.submittedAt).toLocaleString()}</p>
    <h3>Current roster</h3>
    <ul>${htmlRows}</ul>
  `;

  if (!resend) {
    console.log('---- RSVP EMAIL (no Resend API key configured) ----');
    console.log('To:', RSVP_RECIPIENTS.join(', '));
    console.log('Subject:', subject);
    console.log(text);
    console.log('---- END RSVP EMAIL ----');
    return;
  }

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: RSVP_RECIPIENTS,
      subject,
      text,
      html
    });
  } catch (error) {
    console.error('Failed to send RSVP email via Resend', error);
  }
}



