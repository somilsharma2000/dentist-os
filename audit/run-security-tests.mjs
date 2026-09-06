// Security regression harness for Dentist OS — run: node audit/run-security-tests.mjs
// Spawns the real server on an isolated temp DB and probes auth/tenant/OTP/webhook behavior.
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const ROOT = path.resolve(process.cwd());
const PORT = process.env.TEST_PORT || 4177;
const BASE = `http://127.0.0.1:${PORT}/api`;

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

function tmpDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dentos-'));
  const p = path.join(dir, 'db.json');
  fs.copyFileSync(path.join(ROOT, 'server/db.json'), p);
  return p;
}

async function api(method, url, { token, body, headers } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(headers || {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

async function withServer(env, fn) {
  const dbPath = tmpDb();
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), DENTOS_DB_PATH: dbPath, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  const deadline = Date.now() + 10000;
  for (;;) {
    try { await fetch(BASE + '/settings'); break; } catch {
      if (Date.now() > deadline) throw new Error('server did not start: ' + logs);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  try { return await fn(); } finally {
    child.kill('SIGKILL');
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function main() {
  await withServer({}, async () => {
    // ---- logins ----
    const admin = await api('POST', '/auth/login', { body: { email: 'admin@smilecraft.com', password: 'admin123' } });
    record('tenant-1 admin can log in', admin.status === 200 && !!admin.json.token, admin.status);
    const tok = admin.json?.token;

    const agency = await api('POST', '/auth/login', { body: { email: 'agency@dentos.com', password: 'agency123' } });
    const superTok = agency.json?.token;
    record('super admin can log in', agency.status === 200 && agency.json?.staff?.role === 'super');

    const badpw = await api('POST', '/auth/login', { body: { email: 'admin@smilecraft.com', password: 'nope' } });
    record('wrong password rejected', badpw.status === 401);

    const empty = await api('POST', '/auth/login', { body: { email: 'admin@smilecraft.com', password: '' } });
    record('empty password rejected (undefined bypass)', empty.status === 401, JSON.stringify(empty.json));

    // rate limit: hammer login 12x with wrong password
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const r = await api('POST', '/auth/login', { body: { email: `rl${i}@x.com`, password: 'x' } });
      last = r.status;
    }
    record('login rate limit kicks in (429)', last === 429, 'last=' + last);

    // ---- tenant hopping / mass assignment ----
    const hop = await api('POST', '/patients', { token: tok, body: { name: 'Hopper', tenantId: 2 } });
    record('POST patient ignores client tenantId', hop.status === 200 && String(hop.json.tenantId) === '1', JSON.stringify(hop.json.tenantId));

    await api('PUT', '/patients/' + hop.json.id, { token: tok, body: { tenantId: 2 } });
    let hopRecord = (await api('GET', '/patients', { token: tok })).json.find((p) => p.name === 'Hopper');
    record('PUT cannot move record to another tenant', String(hopRecord.tenantId) === '1', JSON.stringify(hopRecord.tenantId));

    await api('PUT', '/patients/' + hop.json.id, { token: tok, body: { id: 99999 } });
    hopRecord = (await api('GET', '/patients', { token: tok })).json.find((p) => p.name === 'Hopper');
    record('PUT cannot rewrite record id', String(hopRecord.id) === String(hop.json.id), JSON.stringify(hopRecord.id));

    // ---- unauthenticated generic CRUD ----
    const noAuth = await api('GET', '/patients');
    record('GET /patients requires auth', noAuth.status === 401);
    const pubRev = await api('GET', '/reviews');
    record('GET /reviews public view ok', pubRev.status === 200 && Array.isArray(pubRev.json), Array.isArray(pubRev.json) ? pubRev.json.length + ' published' : '');

    // super view-tenant scoping
    await api('PUT', '/auth/view-tenant', { token: superTok, body: { tenantId: 2 } });
    const t2view = await api('GET', '/patients', { token: superTok });
    const tenantIds = new Set(t2view.json.map((p) => String(p.tenantId)));
    record('super view-tenant scopes reads', tenantIds.has('2') && !tenantIds.has('1'), [...tenantIds].join(','));
    await api('PUT', '/auth/view-tenant', { token: superTok, body: { tenantId: null } });

    const vt = await api('PUT', '/auth/view-tenant', { token: tok, body: { tenantId: 3 } });
    record('non-super cannot switch tenant view', vt.status === 403, vt.status);

    const t403 = await api('GET', '/tenants', { token: tok });
    record('non-super blocked from /tenants', t403.status === 403);
    const staff403 = await api('GET', '/staff', { token: tok });
    record('non-super blocked from /staff', staff403.status === 403);

    // ---- secrets leakage: configure integrations, then inspect leak surfaces ----
    await api('PUT', '/integrations', { token: tok, body: { key: 'whatsapp', config: { apiKey: 'EAAG_TOPSECRET_TOKEN', phoneNumberId: '1093', appSecret: 'APP_SECRET_XYZ', webhookVerifyToken: 'wvt_abc123' } } });
    await api('PUT', '/integrations', { token: tok, body: { key: 'sms', config: { authKey: 'AUTHKEY_SECRET', senderId: 'DENTOS', templateId: 'tpl1' } } });

    const integr = await api('GET', '/integrations', { token: tok });
    const integrStr = JSON.stringify(integr.json);
    record('GET /integrations masks secrets', !integrStr.includes('TOPSECRET') && !integrStr.includes('APP_SECRET_XYZ') && !integrStr.includes('wvt_abc123') && !integrStr.includes('AUTHKEY_SECRET'), '');

    const loginAfter = await api('POST', '/auth/login', { body: { email: 'admin@smilecraft.com', password: 'admin123' } });
    const loginStr = JSON.stringify(loginAfter.json);
    record('login response hides connector secrets', !loginStr.includes('TOPSECRET') && !loginStr.includes('APP_SECRET_XYZ') && !loginStr.includes('wvt_abc123') && !loginStr.includes('AUTHKEY_SECRET'),
      loginStr.includes('TOPSECRET') ? 'leaked apiKey' : loginStr.includes('wvt_abc123') ? 'leaked webhookVerifyToken' : '');

    const me = await api('GET', '/auth/me', { token: loginAfter.json.token });
    const meStr = JSON.stringify(me.json);
    record('/auth/me hides connector secrets', !meStr.includes('TOPSECRET') && !meStr.includes('APP_SECRET_XYZ') && !meStr.includes('wvt_abc123') && !meStr.includes('AUTHKEY_SECRET'),
      meStr.includes('TOPSECRET') ? 'leaked apiKey' : '');

    const tenantsList = await api('GET', '/tenants', { token: superTok });
    const tlStr = JSON.stringify(tenantsList.json);
    record('GET /tenants hides connector secrets (super)', !tlStr.includes('TOPSECRET') && !tlStr.includes('APP_SECRET_XYZ') && !tlStr.includes('wvt_abc123') && !tlStr.includes('AUTHKEY_SECRET'),
      tlStr.includes('TOPSECRET') ? 'leaked apiKey' : '');

    // ---- /whatsapp/send (broken payload reference?) ----
    const sendRes = await Promise.race([
      api('POST', '/whatsapp/send', { token: tok, body: { phone: '9876543210', text: 'hello from test', category: 'utility' } }),
      new Promise((r) => setTimeout(() => r({ status: 'HANG/CRASH', json: null }), 3000))
    ]);
    record('POST /whatsapp/send responds (no ReferenceError/hang)', sendRes.status !== 'HANG/CRASH' && typeof sendRes.status === 'number' && sendRes.status < 500, 'status=' + sendRes.status + (sendRes.json?.error ? ' err=' + sendRes.json.error : ''));

    // ---- webhook verification ----
    const wvOk = await fetch(`${BASE}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wvt_abc123&hub.challenge=CHAL123`);
    record('webhook GET verifies with correct token', wvOk.status === 200 && (await wvOk.text()) === 'CHAL123', wvOk.status);
    const wvBad = await fetch(`${BASE}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=CHAL123`);
    record('webhook GET rejects wrong token', wvBad.status === 403, wvBad.status);

    const hookBody = { entry: [{ changes: [{ value: { metadata: { phone_number_id: '1093' }, messages: [{ id: 'wamid.1', from: '9876543210', type: 'text', text: { body: 'STOP' } }] } }] }] };
    const sigBad = await fetch(`${BASE}/webhooks/whatsapp`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) }, body: JSON.stringify(hookBody) });
    record('webhook POST rejects bad signature', sigBad.status === 403, sigBad.status);

    const goodSig = 'sha256=' + crypto.createHmac('sha256', 'APP_SECRET_XYZ').update(JSON.stringify(hookBody)).digest('hex');
    const sigOk = await fetch(`${BASE}/webhooks/whatsapp`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': goodSig }, body: JSON.stringify(hookBody) });
    record('webhook POST accepts good signature', sigOk.status === 200, sigOk.status);

    // ---- OTP abuse ----
    await api('POST', '/portal/register', { body: { name: 'OTP Tester', phone: '9123456780' } });
    const otp1 = await api('POST', '/portal/otp/request', { body: { phone: '9123456780' } });
    const otpStr = JSON.stringify(otp1.json || {});
    record('OTP request works', otp1.status === 200, otp1.status + ' ' + (otp1.json?.error || ''));
    record('OTP response never echoes the code (default env)', !otpStr.includes('devCode'), otpStr.includes('devCode') ? 'devCode leaked: ' + otp1.json.devCode : '');

    let bruteFinal = null;
    for (let i = 0; i < 40; i++) {
      const r = await api('POST', '/portal/otp/verify', { body: { phone: '9123456780', code: String(100000 + i).slice(0, 6) } });
      bruteFinal = r.status;
      if (r.status === 200) break;
    }
    record('OTP verify brute force blocked (never 200)', bruteFinal !== 200, 'last=' + bruteFinal);

    let rl = 0;
    for (let i = 0; i < 10; i++) {
      const r = await api('POST', '/portal/otp/request', { body: { phone: '9123456780' } });
      rl = r.status;
    }
    record('OTP request rate limited (429)', rl === 429, 'last=' + rl);

    const legacy = await api('POST', '/portal/login', { body: { phone: '9123456780' } });
    record('legacy phone-only portal login disabled', legacy.status === 410, legacy.status);

    // ---- public endpoint abuse ----
    const today = new Date().toISOString().slice(0, 10);
    let booked = 0;
    for (let i = 0; i < 25; i++) {
      const r = await api('POST', '/bookings', { body: { service: 'Checkup', date: today, time: '09:00', name: 'Spam' + i, phone: '98765000' + String(i).padStart(2, '0'), consentGiven: true, consentVersion: '2026-09-06' } });
      if (r.status === 200) booked++;
    }
    record('public /bookings rate limited', booked < 25, booked + '/25 accepted');

    let revs = 0;
    for (let i = 0; i < 25; i++) {
      const r = await api('POST', '/reviews/public', { body: { name: 'R' + i, rating: 5, text: 'spam review' } });
      if (r.status === 200) revs++;
    }
    record('public /reviews/public rate limited', revs < 25, revs + '/25 accepted');

    const db1 = await api('POST', '/bookings', { body: { service: 'Checkup', date: '2026-12-01', time: '09:00', name: 'First', phone: '9876500001', consentGiven: true, consentVersion: '2026-09-06' } });
    const db2 = await api('POST', '/bookings', { body: { service: 'Checkup', date: '2026-12-01', time: '09:00', name: 'Second', phone: '9876500002', consentGiven: true, consentVersion: '2026-09-06' } });
    record('double booking rejected (409)', db1.status === 200 && db2.status === 409, db1.status + '/' + db2.status);

    const jobNoAuth = await api('POST', '/jobs/run', { body: { type: 'all', dryRun: true } });
    record('jobs/run requires auth when CRON_SECRET unset', jobNoAuth.status === 401, jobNoAuth.status);
  });

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
