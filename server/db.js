const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

let db = null;

function load(seedFn) {
  if (fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
      // A corrupted db.json used to crash the server on boot. Instead: back the
      // file up (forensics) and fall back to a fresh seed so the service stays up.
      try { fs.copyFileSync(DB_PATH, DB_PATH + '.corrupt'); } catch (_) {}
      console.error('[db] db.json was corrupted; backed up to db.json.corrupt and reseeded.', e.message);
      db = typeof seedFn === 'function' ? seedFn() : seedFn;
      save();
    }
  } else {
    db = typeof seedFn === 'function' ? seedFn() : seedFn;
    save();
  }
}

function save() {
  // Atomic write: a crash mid-write corrupts db.json if we write in place.
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

function get() {
  return db;
}

function reset() {
  try { fs.unlinkSync(DB_PATH); } catch (e) {}
  db = null;
}

module.exports = { load, save, get, reset };
