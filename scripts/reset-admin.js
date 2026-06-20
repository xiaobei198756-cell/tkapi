require('dotenv').config();

const bcrypt = require('bcryptjs');
const { ensureSchema } = require('../config/schema');
const { run, get } = require('../config/db');

async function main() {
  await ensureSchema();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const passwordHash = await bcrypt.hash(password, 12);
  const existingAdmin = await get('SELECT id FROM admin_users WHERE username = ?', [username]);

  if (existingAdmin) {
    await run('UPDATE admin_users SET password_hash = ? WHERE username = ?', [passwordHash, username]);
  } else {
    await run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
  }

  console.log(`Admin reset complete.`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
