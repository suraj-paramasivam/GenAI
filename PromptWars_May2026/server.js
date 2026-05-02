const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GCP_PROJECT || 'pw-chennai';

// Secret names in Secret Manager
const SECRET_USERNAME = `projects/${PROJECT_ID}/secrets/app-username/versions/latest`;
const SECRET_PASSWORD = `projects/${PROJECT_ID}/secrets/app-password/versions/latest`;
const SECRET_GEMINI_KEY = `projects/${PROJECT_ID}/secrets/gemini-api-key/versions/latest`;

// Session token signing key (random per instance — sessions reset on redeploy)
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// ── Secret Manager Client ──
const smClient = new SecretManagerServiceClient();

async function getSecret(secretName) {
  try {
    const [version] = await smClient.accessSecretVersion({ name: secretName });
    return version.payload.data.toString('utf8');
  } catch (err) {
    console.error(`Failed to access secret ${secretName}:`, err.message);
    return null;
  }
}

// ── Auth helpers ──
function createToken(username) {
  const payload = JSON.stringify({ user: username, ts: Date.now() });
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + hmac;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  try {
    const payload = Buffer.from(b64, 'base64').toString('utf8');
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (sig === expected) return JSON.parse(payload);
  } catch (e) { /* invalid */ }
  return null;
}

// ── Auth middleware ──
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  const user = verifyToken(token);
  if (user) {
    req.user = user;
    return next();
  }
  // For API calls return 401, for page loads redirect
  if (req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.redirect('/login');
}

// ── Routes ──

// Login page (public)
app.get('/login', (req, res) => {
  // If already logged in, redirect to board
  if (verifyToken(req.cookies?.auth_token)) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Login CSS (public)
app.get('/login.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.css'));
});

// Login API (public)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Fetch credentials from Secret Manager
  const validUser = await getSecret(SECRET_USERNAME);
  const validPass = await getSecret(SECRET_PASSWORD);

  if (!validUser || !validPass) {
    return res.status(500).json({ error: 'Server configuration error. Could not retrieve credentials.' });
  }

  if (username === validUser && password === validPass) {
    const token = createToken(username);
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    return res.json({ success: true });
  }

  return res.status(401).json({ error: 'Invalid username or password.' });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// AI Agent Proxy (Protected)
app.post('/api/ai', requireAuth, async (req, res) => {
  const { userMessage, userName, tasks, chatContext } = req.body;
  
  const apiKey = await getSecret(SECRET_GEMINI_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service unavailable.' });
  }

  const promptText = `You are a helpful AI assistant integrated into a Scrum Board app called "team collaborator - Kekron Mekron Inc".
The current user is ${userName}.
Here are their current tasks:
${tasks}

Here are the recent messages in the team chat:
${chatContext}

The user asks: "${userMessage}"
Please provide a helpful, concise summary or answer based on this context. Format nicely.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API Error:', err);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (error) {
    console.error('AI Proxy Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Protected static assets
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.css', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.css'));
});
app.get('/app.js', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'app.js'));
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Project: ${PROJECT_ID}`);
});
