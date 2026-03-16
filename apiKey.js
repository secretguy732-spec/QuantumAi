/**
 * QuantumAI / QA-AGENT — server/apiKey.js
 * API key generation, validation, and management.
 * Keys format: qa-xxxxxxxxxxxx (12 alphanumeric chars after prefix)
 */

// ============================================================
// In-memory key store
// (Replace with a database for production use)
// ============================================================
const keyStore = new Set();
let requestCounts = {}; // Simple rate limiting per key

// Pre-seed a default demo key for easy testing
const DEFAULT_KEY = 'qa-demo0000key0';
keyStore.add(DEFAULT_KEY);

// Allowed characters for key generation
const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const KEY_LENGTH = 12;
const KEY_PREFIX = 'qa-';

/**
 * Generate a new unique API key.
 * Format: qa-xxxxxxxxxxxx
 */
function generateKey() {
  let key;
  let attempts = 0;
  do {
    let suffix = '';
    for (let i = 0; i < KEY_LENGTH; i++) {
      suffix += KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)];
    }
    key = KEY_PREFIX + suffix;
    attempts++;
    if (attempts > 100) throw new Error('Key generation failed after too many attempts');
  } while (keyStore.has(key)); // Ensure uniqueness

  keyStore.add(key);
  console.log(`[ApiKey] Generated new key: ${key.substring(0, 7)}... (total: ${keyStore.size})`);
  return key;
}

/**
 * Validate an API key from a request Authorization header.
 * @param {string} authHeader - Value of the Authorization header
 * @returns {{ valid: boolean, key: string|null, reason: string|null }}
 */
function validateKey(authHeader) {
  if (!authHeader) {
    return { valid: false, key: null, reason: 'Missing Authorization header' };
  }

  // Strip "Bearer " prefix if present
  const key = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  // Check format
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false, key, reason: `Invalid key format. Keys must start with "${KEY_PREFIX}"` };
  }

  if (key.length < KEY_PREFIX.length + 4) {
    return { valid: false, key, reason: 'Key too short' };
  }

  // Check if key exists in store
  if (!keyStore.has(key)) {
    // Also accept any key starting with "qa-" for development convenience
    // Remove this in production and only use: return { valid: false, ... }
    console.warn(`[ApiKey] Key not in store but has valid format: ${key.substring(0, 7)}...`);
    // For development: accept any properly formatted key
    return { valid: true, key, reason: null };
  }

  return { valid: true, key, reason: null };
}

/**
 * List all registered keys (redacted for security).
 */
function listKeys() {
  return Array.from(keyStore).map(k => {
    // Show only prefix + first 3 chars + mask
    const visible = k.substring(0, KEY_PREFIX.length + 3);
    return visible + '*'.repeat(k.length - visible.length);
  });
}

/**
 * Revoke a key.
 */
function revokeKey(key) {
  if (key === DEFAULT_KEY) return false; // Can't revoke demo key
  return keyStore.delete(key);
}

/**
 * Simple rate limiting per key.
 * @param {string} key
 * @param {number} maxPerMinute
 */
function checkRateLimit(key, maxPerMinute = 30) {
  const now = Date.now();
  const windowMs = 60 * 1000;

  if (!requestCounts[key]) {
    requestCounts[key] = [];
  }

  // Clean old timestamps
  requestCounts[key] = requestCounts[key].filter(t => now - t < windowMs);

  if (requestCounts[key].length >= maxPerMinute) {
    return { limited: true, remaining: 0, resetIn: windowMs - (now - requestCounts[key][0]) };
  }

  requestCounts[key].push(now);
  return { limited: false, remaining: maxPerMinute - requestCounts[key].length };
}

module.exports = {
  generateKey,
  validateKey,
  listKeys,
  revokeKey,
  checkRateLimit,
  DEFAULT_KEY,
};
