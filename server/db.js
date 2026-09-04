const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

let db = null;

function load(seedFn) {
  if (fs.existsSync(DB_PATH)) {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } else {
    db = typeof seedFn === "function" ? seedFn() : seedFn;
    save();
  }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function get() {
  return db;
}

function reset() {
  try { fs.unlinkSync(DB_PATH); } catch (e) {}
  db = null;
}

module.exports = { load, save, get, reset };
