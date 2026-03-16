/**
 * QuantumAI / QA-AGENT — server/server.js
 * Express backend API server.
 *
 * Run with: node server.js
 * For Termux: pkg install nodejs && node server.js
 * Expose with: ngrok http 3000 (or cloudflared tunnel)
 */

const express = require('express');
const cors = require('cors');
const { processMessage } = require('./agent');
const { generateKey, validateKey, listKeys, checkRateLimit } = require('./apiKey');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================

// JSON parsing
app.use(express.json({ limit: '10kb' }));

// CORS — allow GitHub Pages and local dev
app.use(cors({
  origin: '*', // In production, restrict to your GitHub Pages domain
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// ROUTES
// ============================================================

/**
 * GET /health
 * Health check endpoint — no auth required.
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'QA-AGENT',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /generate-key
 * Generate a new API key — no auth required (or add basic protection in production).
 */
app.get('/generate-key', (req, res) => {
  try {
    const key = generateKey();
    res.json({
      key,
      message: 'New API key generated. Save this key — it will not be shown again.',
      format: 'qa-xxxxxxxxxxxx',
    });
  } catch (err) {
    res.status(500).json({ error: 'Key generation failed: ' + err.message });
  }
});

/**
 * GET /keys
 * List registered keys (redacted) — for debugging.
 */
app.get('/keys', (req, res) => {
  res.json({ keys: listKeys(), count: listKeys().length });
});

/**
 * POST /qa-agent
 * Main AI agent endpoint.
 *
 * Headers:
 *   Authorization: qa-xxxxxxxxxxxx
 *   Content-Type: application/json
 *
 * Body:
 *   { "message": "user text" }
 *
 * Response:
 *   { "text": "agent response", "tool": "search|code|task|null" }
 */
app.post('/qa-agent', async (req, res) => {
  // — Validate API key —
  const authHeader = req.headers['authorization'];
  const keyCheck = validateKey(authHeader);

  if (!keyCheck.valid) {
    return res.status(401).json({
      error: 'Unauthorized: ' + keyCheck.reason,
      hint: 'Include a valid API key in the Authorization header. Format: qa-xxxxxxxxxxxx',
    });
  }

  // — Rate limiting —
  const rateCheck = checkRateLimit(keyCheck.key, 30);
  if (rateCheck.limited) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      resetIn: `${Math.ceil(rateCheck.resetIn / 1000)}s`,
    });
  }

  // — Validate body —
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Bad request: "message" field is required and must be a string',
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      error: 'Message too long. Maximum 2000 characters.',
    });
  }

  // — Process with agent —
  try {
    const context = {
      key: keyCheck.key,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const response = await processMessage(message, context);

    res.json({
      text: response.text,
      tool: response.tool,
      agent: 'QA-AGENT',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Server] Agent error:', err);
    res.status(500).json({
      error: 'Agent processing failed',
      text: 'QA-AGENT encountered an internal error. Please try again.',
      tool: null,
    });
  }
});

// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    available: ['GET /health', 'GET /generate-key', 'POST /qa-agent'],
  });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n');
  console.log('  ██████╗  █████╗       █████╗  ██████╗ ███████╗███╗   ██╗████████╗');
  console.log('  ██╔═══██╗██╔══██╗    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝');
  console.log('  ██║   ██║███████║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ');
  console.log('  ██║▄▄ ██║██╔══██║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ');
  console.log('  ╚██████╔╝██║  ██║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ');
  console.log('   ╚══▀▀═╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ');
  console.log('');
  console.log(`  QA-AGENT Server v1.0.0`);
  console.log(`  Running on: http://0.0.0.0:${PORT}`);
  console.log('');
  console.log('  Endpoints:');
  console.log(`  GET  /health        — Health check`);
  console.log(`  GET  /generate-key  — Generate new API key`);
  console.log(`  POST /qa-agent      — Chat with AI agent`);
  console.log('');
  console.log('  Default test key: qa-demo0000key0');
  console.log('');
  console.log('  Tunneling (expose to internet):');
  console.log('  npx ngrok http 3000');
  console.log('  cloudflared tunnel --url http://localhost:3000');
  console.log('');
  console.log('  ═══════════════════════════════════════════════════');
  console.log('');
});

module.exports = app;
