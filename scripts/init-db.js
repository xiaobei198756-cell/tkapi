require('dotenv').config();

const bcrypt = require('bcryptjs');
const { ensureSchema } = require('../config/schema');
const { run, get } = require('../config/db');

async function main() {
  await ensureSchema();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const existingAdmin = await get('SELECT id FROM admin_users WHERE username = ?', [username]);

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 12);
    await run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
    console.log(`Created admin user: ${username}`);
  } else {
    console.log(`Admin user already exists: ${username}`);
  }

  const accountCount = await get('SELECT COUNT(*) AS count FROM accounts');
  if (accountCount.count === 0) {
    await run(
      `INSERT INTO accounts
        (account_name, platform, contact_url, country_code, daily_limit, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['WhatsApp US Support', 'whatsapp', 'https://wa.me/15551234567', 'US', 50, 1]
    );
    await run(
      `INSERT INTO accounts
        (account_name, platform, contact_url, country_code, daily_limit, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Telegram Global Support', 'telegram', 'https://t.me/support_demo', 'US', 50, 1]
    );
    console.log('Inserted sample accounts.');
  }

  const campaignCount = await get('SELECT COUNT(*) AS count FROM campaigns');
  if (campaignCount.count === 0) {
    await run(
      `INSERT INTO campaigns
        (campaign_name, slug, allowed_countries, enabled)
       VALUES (?, ?, ?, ?)`,
      ['Campaign A', 'campaign-a', 'US,CA,GB', 1]
    );
    console.log('Inserted sample campaign: /go/campaign-a');
  }

  console.log('Database initialized.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
