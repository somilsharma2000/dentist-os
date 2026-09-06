#!/usr/bin/env node
const readline = require('readline');
const { load, get, save } = require('../server/db');
const { seed } = require('../server/seed');
const { hashPassword } = require('../server/passwords');

load(seed);
const db = get();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  try {
    const email = String(await ask('Staff email to update: ')).trim().toLowerCase();
    const password = await ask('New password: ');
    const confirm = await ask('Repeat new password: ');
    if (!email || password.length < 12 || password !== confirm) {
      throw new Error('Password must be at least 12 characters and both entries must match.');
    }
    const user = (db.staff || []).find((u) => String(u.email).toLowerCase() === email);
    if (!user) throw new Error('Staff email not found.');
    user.password = hashPassword(password);
    save();
    console.log(`Password updated for ${email}.`);
  } catch (err) {
    console.error(`Could not update password: ${err.message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
})();
