const { run } = require('./db');

async function ensureSchema() {
  await run('PRAGMA foreign_keys = ON');
  await run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_name TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
        contact_url TEXT NOT NULL,
        country_code TEXT NOT NULL,
        daily_limit INTEGER NOT NULL DEFAULT 100,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  await run(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        allowed_countries TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        last_assigned_account_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  await run(`
      CREATE TABLE IF NOT EXISTS lead_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        user_hash TEXT NOT NULL,
        assigned_account_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (campaign_id, user_hash),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (assigned_account_id) REFERENCES accounts(id)
      )
    `);
  await run(`
      CREATE TABLE IF NOT EXISTS click_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        user_hash TEXT,
        assigned_account_id INTEGER,
        platform TEXT,
        country_code TEXT,
        ip_hash TEXT,
        user_agent TEXT,
        redirect_url TEXT,
        clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (assigned_account_id) REFERENCES accounts(id)
      )
    `);
  await run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
}

module.exports = { ensureSchema };
