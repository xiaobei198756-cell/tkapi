const crypto = require('crypto');

function hashValue(value) {
  const secret = process.env.HASH_SECRET || 'development-only-hash-secret';
  return crypto.createHash('sha256').update(`${secret}:${value}`).digest('hex');
}

function normalizeLeadInput(input) {
  return String(input || '').trim().toLowerCase().replace(/\s+/g, '');
}

function isValidContactUrl(platform, url) {
  if (platform === 'whatsapp') {
    return /^https:\/\/wa\.me\/\d{6,20}$/.test(url);
  }
  if (platform === 'telegram') {
    return /^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}$/.test(url);
  }
  return false;
}

function normalizeCountryList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .join(',');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = {
  hashValue,
  isValidContactUrl,
  normalizeCountryList,
  normalizeLeadInput,
  slugify
};
