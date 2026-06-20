const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let database;

const ready = initSqlJs().then((SQL) => {
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
    persist();
  }
  database.run('PRAGMA foreign_keys = ON');
  return database;
});

function persist() {
  if (!database) {
    return;
  }
  const data = database.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

async function run(sql, params = []) {
  const db = await ready;
  db.run(sql, params);
  const id = db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] || 0;
  const changes = db.exec('SELECT changes() AS changes')[0]?.values[0]?.[0] || 0;
  persist();
  return { id, changes };
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0];
}

async function all(sql, params = []) {
  const db = await ready;
  const stmt = db.prepare(sql);
  const rows = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
  } finally {
    stmt.free();
  }
  return rows;
}

module.exports = { ready, run, get, all };
