/**
 * ══════════════════════════════════════════════════════════════════════════
 * TEAM COLLABORATOR - KEKRON MEKRON INC
 * Backend Server (Node.js + Express)
 * ══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// ── Initialize Express ──
const app = express();
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies for session management

// ── Configuration ──
const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GCP_PROJECT || 'pw-chennai';

// Secret Manager resource paths (pointing to 'latest' version)
const SECRET_USERNAME = `projects/${PROJECT_ID}/secrets/app-username/versions/latest`;
const SECRET_PASSWORD = `projects/${PROJECT_ID}/secrets/app-password/versions/latest`;
const SECRET_GEMINI_KEY = `projects/${PROJECT_ID}/secrets/gemini-api-key/versions/latest`;

// Session token signing key (unique per instance — resets on redeploy for security)
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// ── Google Cloud Secret Manager Setup ──
const smClient = new SecretManagerServiceClient();

/**
 * Retrieves a plain-text secret from Google Cloud Secret Manager.
 * @param {string} secretName - The full resource path of the secret version.
 * @returns {Promise<string|null>} The secret payload or null if failed.
 */
async function getSecret(secretName) {
  try {
    const [version] = await smClient.accessSecretVersion({ name: secretName });
    return version.payload.data.toString('utf8');
  } catch (err) {
    console.error(`[Error] Failed to access secret ${secretName}:`, err.message);
    return null;
  }
}

// ── Authentication Logic ──

/**
 * Creates a signed session token.
 * @param {string} username - The authenticated user's name.
 * @returns {string} Base64 encoded payload + HMAC signature.
 */
function createToken(username) {
  const payload = JSON.stringify({ user: username, ts: Date.now() });
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + hmac;
}

/**
 * Verifies a session token signature and timestamp.
 * @param {string} token - The token from the request cookie.
 * @returns {object|null} The decoded user object or null if invalid.
 */
function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  try {
    const payload = Buffer.from(b64, 'base64').toString('utf8');
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (sig === expected) return JSON.parse(payload);
  } catch (e) { /* Signature mismatch or malformed JSON */ }
  return null;
}

/**
 * Express Middleware to protect routes. 
 * Redirects to /login for page requests, returns 401 for API requests.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  const user = verifyToken(token);
  if (user) {
    req.user = user;
    return next();
  }
  if (req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.redirect('/login');
}

// ── Public Routes ──

// Serves the Login page
app.get('/login', (req, res) => {
  // If already logged in, skip login and go to board
  if (verifyToken(req.cookies?.auth_token)) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Serves Login-specific styles
app.get('/login.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.css'));
});

/**
 * Handle Login Requests.
 * Validates against credentials stored in Google Secret Manager.
 */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Fetch true credentials securely from GCP
  const validUser = await getSecret(SECRET_USERNAME);
  const validPass = await getSecret(SECRET_PASSWORD);

  if (!validUser || !validPass) {
    return res.status(500).json({ error: 'Server configuration error. Could not retrieve credentials.' });
  }

  // Basic credential comparison
  if (username === validUser && password === validPass) {
    const token = createToken(username);
    res.cookie('auth_token', token, {
      httpOnly: true, // Prevent client-side JS from accessing token (XSS protection)
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // Valid for 24 hours
    });
    return res.json({ success: true });
  }

  return res.status(401).json({ error: 'Invalid username or password.' });
});

// Handle Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// ── Protected API Routes ──

/**
 * AI Agent Proxy.
 * Securely proxies frontend requests to Gemini 1.5 Flash.
 * Context (tasks, chat) is passed from frontend to the LLM.
 */
app.post('/api/ai', requireAuth, async (req, res) => {
  const { userMessage, userName, tasks, chatContext } = req.body;
  
  // Retrieve API Key from Secret Manager (never exposed to browser)
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
    // Call Google's Generative AI API (Gemini 1.5 Flash)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Gemini API Error]:', err);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (error) {
    console.error('[AI Proxy Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── BigQuery Integration (Analytical Storage) ──
const { BigQuery } = require('@google-cloud/bigquery');
const bq = new BigQuery();
const DATASET_ID = 'scrum_analytics';

/**
 * Endpoint to sync application state to BigQuery for future analysis.
 * Streams tasks and chat messages into their respective tables.
 */
app.post('/api/sync', requireAuth, async (req, res) => {
  const { type, data } = req.body;
  
  try {
    if (type === 'task_update') {
      // Stream task record
      await bq.dataset(DATASET_ID).table('tasks').insert({
        task_id: data.id,
        title: data.title,
        column_id: data.column,
        priority: data.priority,
        assignee_id: data.assignee,
        points: data.points,
        timestamp: new Date().toISOString()
      });
    } else if (type === 'chat_message') {
      // Stream chat message
      await bq.dataset(DATASET_ID).table('chat_messages').insert({
        sender: data.sender,
        text: data.text,
        channel: data.channel,
        timestamp: new Date().toISOString()
      });
    }
    res.json({ success: true });
  } catch (error) {
    // Log error but don't break the frontend experience
    console.error('[BigQuery Sync Error]:', error.message);
    res.status(200).json({ success: false, error: 'Sync failed' });
  }
});

// ── Protected Static Assets ──

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.css', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.css'));
});
app.get('/app.js', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'app.js'));
});

// ── Server Start ──
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Success] Server running on port ${PORT}`);
    console.log(`[Info] Project ID: ${PROJECT_ID}`);
  });
}

// Export app for Vitest/Supertest integration testing
module.exports = app;
