const express = require('express');
const crypto = require('crypto');
const { load, save, get } = require('./db');
const { seed } = require('./seed');
const { PASSWORD_HASH_PREFIX, hashPassword, verifyPassword } = require('./passwords');

load(seed);

const router = express.Router();
const db = get();
const PUBLIC_TENANT = 1; // the clinic that owns the public website

// ---- Auth: in-memory token sessions (demo-grade; swap for JWT in production hardening) ----
const SESSIONS = {}; // token -> { staff, tenant, viewTenantId, expiresAt }
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const LOGIN_ATTEMPTS = {}; // key -> { count, windowStart }
const LOGIN_LIMIT = 10; // attempts per window
const LOGIN_WINDOW_MS = 60 * 1000;

const TABLES = [
  'patients', 'dentists', 'appointments', 'treatmentPlans', 'invoices', 'leads', 'reviews',
  'tasks', 'inventory', 'automations', 'recall', 'socialPosts', 'tenants', 'staff',
  'whatsappChats', 'qrCodes'
];
const TENANT_TABLES = new Set(TABLES.filter((t) => t !== 'tenants' && t !== 'staff'));
const SUPER_TABLES = new Set(['tenants', 'staff']);
const PUBLIC_TABLES = new Set(['dentists', 'reviews']);

const BOOKING_SLOTS = ['09:00', '09:45', '10:30', '11:15', '12:00', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45'];
const TOOTH_STATES = new Set(['healthy', 'filled', 'crowned', 'rootcanal', 'implant', 'extracted']);
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Appointment statuses that do NOT block a slot / count as conflicts.
const INACTIVE_APPT = new Set(['cancelled', 'no-show', 'no show']);
const BOOKING_CONSENT_VERSION = '2026-09-06';

function nextId() {
  db.nextId = (db.nextId || 1000) + 1;
  return db.nextId;
}

// ---- IST date helpers (correct regardless of the server's own timezone) ----
// Uses Intl with an explicit IANA zone instead of offset arithmetic:
// the old (getTimezoneOffset()+330) trick silently returned UTC's date when
// the server itself ran on IST (or any other non-UTC zone).
const istFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
});

function istToday() {
  return istFmt.format(new Date()); // YYYY-MM-DD
}

function istDaysAgo(n) {
  const [y, m, d] = istToday().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

function lastMonths(count) {
  const [y, m] = istToday().split('-').map(Number);
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push({ key: dt.toISOString().slice(0, 7), label: MONTH_NAMES[dt.getUTCMonth()] });
  }
  return out;
}

function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Normalize an Indian phone number to a bare 10-digit string (or null if invalid).
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9][0-9]{9}$/.test(ten) ? ten : null;
}

function sessionOf(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const s = token && SESSIONS[token];
  if (!s) return null;
  if (Date.now() > s.expiresAt) { delete SESSIONS[token]; return null; }
  return s;
}

function staff(req) {
  const s = sessionOf(req);
  if (!s || !s.staff) return null;
  return s;
}

function tid(req) {
  const s = sessionOf(req);
  if (!s || !s.staff) return PUBLIC_TENANT;
  if (s.staff.role === 'super') return s.viewTenantId || null;
  return s.staff.tenantId || PUBLIC_TENANT;
}

// Tenant scope filter. Records without a tenantId are treated as belonging to
// the public tenant — previously they were visible to EVERY tenant.
function sc(arr, t) {
  if (t === null || t === undefined) return arr;
  return arr.filter((x) => String(x.tenantId || PUBLIC_TENANT) === String(t));
}

function tenantSettings(t) {
  const tn = (db.tenants || []).find((x) => String(x.id) === String(t));
  return (tn && tn.settings) ? tn.settings : db.settings;
}

function stripSecrets(u) {
  const { password, ...rest } = u;
  return rest;
}

function safeTenant(t) {
  if (!t) return t;
  return { ...t, integrations: maskIntegrations(t.integrations) };
}

const PUBLIC_RATE = {};
function publicRateLimited(req, bucket, limit, windowMs = 10 * 60 * 1000) {
  const key = `${bucket}:${req.ip || 'unknown'}`;
  const now = Date.now();
  const rec = PUBLIC_RATE[key];
  if (!rec || now - rec.windowStart > windowMs) {
    PUBLIC_RATE[key] = { count: 1, windowStart: now };
    return false;
  }
  rec.count += 1;
  return rec.count > limit;
}

function migrateLegacyPasswords() {
  let changed = false;
  for (const u of db.staff || []) {
    if (typeof u.password === 'string' && !u.password.startsWith(PASSWORD_HASH_PREFIX)) {
      u.password = hashPassword(u.password);
      changed = true;
    }
  }
  if (changed) save();
}

migrateLegacyPasswords();

function prepareStaffBody(body) {
  const out = { ...(body || {}) };
  if (typeof out.password === 'string' && out.password.length > 0 && !out.password.startsWith(PASSWORD_HASH_PREFIX)) {
    out.password = hashPassword(out.password);
  }
  return out;
}

function newToken() {
  return 'tok_' + crypto.randomBytes(24).toString('hex');
}

function loginRateLimited(key) {
  const now = Date.now();
  const rec = LOGIN_ATTEMPTS[key];
  if (!rec || now - rec.windowStart > LOGIN_WINDOW_MS) {
    LOGIN_ATTEMPTS[key] = { count: 1, windowStart: now };
    return false;
  }
  rec.count += 1;
  return rec.count > LOGIN_LIMIT;
}

function clearLoginAttempts(key) {
  delete LOGIN_ATTEMPTS[key];
}

// Fields a client may never set/overwrite on generic CRUD routes.
const PROTECTED_FIELDS = ['id', 'created_date', 'created_by', 'tenantId'];

function sanitizeBody(body, opts = {}) {
  const out = { ...(body || {}) };
  PROTECTED_FIELDS.forEach((f) => delete out[f]);
  // Super admins may assign records to a clinic via tenantId (e.g. creating staff).
  if (opts.allowTenantId) out.tenantId = (body || {}).tenantId;
  return out;
}

function isSlotStillOpen(date, time, dentistId) {
  return !sc(db.appointments, PUBLIC_TENANT).some((a) =>
    a.date === date
    && a.time === time
    && !INACTIVE_APPT.has(String(a.status || '').toLowerCase())
    && (a.dentistId == null || dentistId == null || String(a.dentistId) === String(dentistId))
  );
}

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const key = String(email || '').toLowerCase().trim() + '@' + (req.ip || 'unknown');
  if (loginRateLimited(key)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
  }
  const user = db.staff.find(
    (u) => String(u.email).toLowerCase() === String(email || '').trim().toLowerCase()
  );
  // `!password` blocks the old undefined-vs-undefined bypass on passwordless staff records.
  if (!user || !password || !verifyPassword(String(password), user.password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const tenant = db.tenants.find((t) => t.id === user.tenantId) || null;
  if (user.role !== 'super' && tenant && String(tenant.status || '').toLowerCase() === 'suspended') {
    return res.status(403).json({ error: 'This clinic is suspended. Contact the agency owner.' });
  }
  clearLoginAttempts(key);
  const token = newToken();
  SESSIONS[token] = {
    staff: stripSecrets(user), tenant, viewTenantId: null,
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  res.json({ staff: stripSecrets(user), tenant: safeTenant(tenant), token });
});

router.post('/auth/logout', (req, res) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) delete SESSIONS[token];
  res.json({ ok: true });
});

router.get('/auth/me', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  res.json({ staff: s.staff, tenant: safeTenant(s.tenant), viewTenantId: s.viewTenantId || null });
});

// Super-admin tenant switching
router.put('/auth/view-tenant', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  if (s.staff.role !== 'super') return res.status(403).json({ error: 'Agency owner only.' });
  const t = (req.body || {}).tenantId || null;
  if (t !== null && !db.tenants.find((x) => String(x.id) === String(t))) {
    return res.status(404).json({ error: 'Clinic not found.' });
  }
  s.viewTenantId = t;
  res.json({ ok: true, viewTenantId: t });
});

// ---- Integrations hub (per-clinic connector credentials) ----
const SECRET_KEY_RE = /key|token|secret|password|pass/i;
const SECRET_MASK = '••••••••';

function maskIntegrations(integrations) {
  const out = {};
  Object.entries(integrations || {}).forEach(([k, v]) => {
    out[k] = {
      ...v,
      config: Object.fromEntries(Object.entries(v.config || {}).map(([ck, cv]) => [
        ck, SECRET_KEY_RE.test(ck) && cv ? SECRET_MASK : cv
      ]))
    };
  });
  return out;
}

router.get('/integrations', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  const t = tid(req);
  if (t === null) {
    return res.json(db.tenants.map((tn) => ({ id: tn.id, name: tn.name, integrations: maskIntegrations(tn.integrations) })));
  }
  const tn = db.tenants.find((x) => String(x.id) === String(t));
  if (!tn) return res.status(404).json({ error: 'Clinic not found.' });
  res.json({ id: tn.id, name: tn.name, integrations: maskIntegrations(tn.integrations) });
});

router.put('/integrations', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  const { tenantId, key, config, disconnect } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Missing connector key.' });
  const targetId = tenantId !== undefined ? tenantId : tid(req);
  if (targetId === null) return res.status(400).json({ error: 'Pick a clinic first.' });
  if (s.staff.role !== 'super' && String(s.staff.tenantId) !== String(targetId)) {
    return res.status(403).json({ error: 'You can only configure connectors for your own clinic.' });
  }
  const tn = db.tenants.find((x) => String(x.id) === String(targetId));
  if (!tn) return res.status(404).json({ error: 'Clinic not found.' });
  tn.integrations = tn.integrations || {};
  if (disconnect) delete tn.integrations[key];
  else {
    const prev = (tn.integrations[key] && tn.integrations[key].config) || {};
    const merged = { ...(config || {}) };
    // If the client round-tripped a masked secret back to us, keep the stored value.
    Object.keys(merged).forEach((ck) => {
      if (merged[ck] === SECRET_MASK) merged[ck] = prev[ck] || '';
    });
    tn.integrations[key] = { status: 'configured', config: merged, connectedAt: istToday() };
  }
  save();
  res.json({ ok: true, integrations: maskIntegrations(tn.integrations) });
});

// ---- WhatsApp webhook: verification, inbound messages, delivery status ----
function whatsappTenantByConfig(value) {
  return (db.tenants || []).find((t) => {
    const c = t.integrations?.whatsapp?.config || {};
    return [c.phoneNumberId, c.phoneNumber, c.businessNumber].filter(Boolean).some((v) => String(v) === String(value));
  });
}

router.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const tenant = (db.tenants || []).find((t) => t.integrations?.whatsapp?.config?.webhookVerifyToken === token);
  if (mode === 'subscribe' && tenant && challenge) return res.status(200).send(String(challenge));
  return res.sendStatus(403);
});

router.post('/webhooks/whatsapp', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const entries = req.body?.entry || [];
  const phoneId = entries[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  const tenant = whatsappTenantByConfig(phoneId);
  const secret = tenant?.integrations?.whatsapp?.config?.appSecret;
  if (!tenant || !secret || typeof signature !== 'string' || !signature.startsWith('sha256=')) return res.sendStatus(403);
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.sendStatus(403);
  db.whatsappMessages = db.whatsappMessages || [];
  for (const entry of entries) for (const change of entry.changes || []) {
    const value = change.value || {};
    for (const status of value.statuses || []) {
      const msg = db.whatsappMessages.find((m) => m.providerMessageId === status.id && String(m.tenantId) === String(tenant.id));
      if (msg) { msg.status = status.status || msg.status; msg.statusAt = new Date().toISOString(); }
    }
    for (const incoming of value.messages || []) {
      const from = normalizePhone(incoming.from);
      if (!from) continue;
      const patient = sc(db.patients, tenant.id).find((p) => p.phone === from);
      const inboundText = incoming.text?.body || '';
      db.whatsappMessages.push({
        id: nextId(), tenantId: tenant.id, patientId: patient?.id || null, phone: from,
        direction: 'in', type: incoming.type || 'text', text: inboundText,
        providerMessageId: incoming.id || null, status: 'received', createdAt: new Date().toISOString()
      });
      if (/^(stop|unsubscribe|opt[- ]?out|போதும்)$/i.test(String(inboundText).trim())) {
        db.consentLogs = db.consentLogs || [];
        db.consentLogs.push({
          id: nextId(), tenantId: tenant.id, patientId: patient?.id || null, phone: from,
          scope: 'marketing', status: 'withdrawn', consentType: 'whatsapp_opt_out',
          purpose: 'Patient requested WhatsApp marketing opt-out', source: 'whatsapp_inbound',
          withdrawnAt: new Date().toISOString(), capturedAt: new Date().toISOString()
        });
      }
    }
  }
  save();
  return res.sendStatus(200);
});

// ---- WhatsApp outbound transport ----
// Messages are only sent when the clinic has configured Meta Cloud API credentials.
// Without credentials the API refuses the send instead of pretending delivery.
//
// Two payload modes, mirroring the Meta Cloud API:
//   1. Free-form text:    { phone, patientId, text, category }
//      Meta only delivers free-form text inside the 24-hour customer-service
//      window that opens when the patient last messages the clinic.
//   2. Approved template: { phone, patientId, template: { name, language, components }, category }
//      `name` must be the exact name of a template Meta has ALREADY approved for
//      the clinic's WhatsApp Business Account; it is passed through verbatim.
//      Deliverable outside the 24-hour window. The server cannot verify template
//      approval upfront — Meta rejects unknown/unapproved templates at send time
//      and the send is recorded as failed.
// Both modes share the same consent gate: a DPDP consent log (scope "service" for
// category utility, "marketing" for category marketing) must be on file for the
// recipient, otherwise the send is refused with 403.
const TEMPLATE_NAME_RE = /^[A-Za-z0-9_]{1,60}$/;
const TEMPLATE_LANG_RE = /^[A-Za-z0-9_-]{2,20}$/;
const TEMPLATE_COMPONENT_TYPES = new Set(['header', 'body', 'button']);
const TEMPLATE_MAX_COMPONENTS = 10;
const TEMPLATE_MAX_JSON_CHARS = 4096; // template payload cap
const DEFAULT_TEMPLATE_LANGUAGE = 'en';

function templateRequestError(template) {
  if (!template || typeof template !== 'object' || Array.isArray(template)) {
    return 'template must be an object: { name, language?, components? }.';
  }
  if (!TEMPLATE_NAME_RE.test(String(template.name || ''))) {
    return 'Invalid template name. Use the exact name of a Meta-approved template (letters, numbers, underscores).';
  }
  const language = template.language === undefined || template.language === null
    ? DEFAULT_TEMPLATE_LANGUAGE
    : String(template.language);
  if (!TEMPLATE_LANG_RE.test(language)) {
    return 'Invalid template language code (e.g. "en", "en_US", "hi").';
  }
  if (template.components !== undefined && template.components !== null) {
    if (!Array.isArray(template.components) || template.components.length > TEMPLATE_MAX_COMPONENTS) {
      return 'template.components must be an array of at most 10 items.';
    }
    for (const c of template.components) {
      if (!c || typeof c !== 'object' || Array.isArray(c) || !TEMPLATE_COMPONENT_TYPES.has(String(c.type || ''))) {
        return 'Each template component needs a valid type: header, body or button.';
      }
    }
  }
  if (JSON.stringify(template).length > TEMPLATE_MAX_JSON_CHARS) {
    return 'Template payload is too large.';
  }
  return null;
}

router.post('/whatsapp/send', async (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  const { phone, patientId, text, template, category = 'utility' } = req.body || {};
  const normalizedPhone = normalizePhone(phone);
  const templateMode = template !== undefined && template !== null;
  if (!normalizedPhone) return res.status(400).json({ error: 'A valid 10-digit Indian mobile number is required.' });
  if (templateMode && typeof text === 'string' && text.trim()) {
    return res.status(400).json({ error: 'Send either free-form text or an approved template, not both.' });
  }
  if (templateMode) {
    const terr = templateRequestError(template);
    if (terr) return res.status(400).json({ error: terr });
  } else {
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'A message or an approved template is required.' });
    }
    if (text.length > 4096) return res.status(400).json({ error: 'Message is too long.' });
  }
  if (!['utility', 'marketing'].includes(category)) return res.status(400).json({ error: 'Invalid message category.' });
  const tenantId = tid(req);
  if (tenantId === null) return res.status(400).json({ error: 'Pick a clinic first.' });
  const patient = sc(db.patients, tenantId).find((p) => p.phone === normalizedPhone || (patientId && String(p.id) === String(patientId)));
  const phoneForSend = patient?.phone || normalizedPhone;
  // Build the Meta Cloud API payload from the request (free-form text or an
  // approved template). This used to reference an undefined `payload` variable,
  // which crashed every send with a ReferenceError (500).
  const templateLanguage = template?.language === undefined || template?.language === null
    ? DEFAULT_TEMPLATE_LANGUAGE
    : String(template.language);
  const payload = templateMode
    ? {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: String(template.name),
          language: { code: templateLanguage },
          ...(Array.isArray(template.components) && template.components.length
            ? { components: template.components }
            : {})
        }
      }
    : { messaging_product: 'whatsapp', type: 'text', text: { preview_url: false, body: text } };
  // Consent gate + provider dispatch live in deliverWhatsApp (shared with the
  // scheduler-ready reminder job below) so both paths enforce identical rules.
  const result = await deliverWhatsApp({ tenantId, patient, phone: phoneForSend, category, payload });
  if (result.ok) return res.json({ message: { ...result.message, apiKey: undefined } });
  if (result.skipped) {
    if (result.reason === 'no-consent') return res.status(403).json({ error: `No ${category} consent is on file for this number.` });
    if (result.reason === 'whatsapp-not-configured') return res.status(503).json({ error: 'WhatsApp is not configured. Add the Meta access token and phone number ID in Settings.' });
    return res.status(400).json({ error: 'A valid 10-digit Indian mobile number is required.' });
  }
  return res.status(502).json({ error: result.error, message: { id: result.message.id, status: result.message.status } });
});

// ---- Consent-aware WhatsApp transport (shared) ----
// Used by POST /whatsapp/send above and the reminder/recall job below, so the
// consent gate can never drift between them:
//   * no DPDP consent on file         -> { ok:false, skipped:true, reason:'no-consent' }
//   * no Meta credentials configured  -> { ok:false, skipped:true, reason:'whatsapp-not-configured' }
//   * dryRun                          -> { ok:true, dryRun:true }  (writes nothing, consumes no ids)
//   * provider accepted               -> { ok:true, status:'sent', message }
//   * provider rejected / offline     -> { ok:false, status:'failed', error, message } (recorded as failed)
// The function never throws; callers map outcomes to their own responses.
async function deliverWhatsApp({ tenantId, patient, phone, category, payload, jobRef = null, dryRun = false }) {
  const phoneForSend = (patient && patient.phone) || normalizePhone(phone);
  if (!phoneForSend) return { ok: false, skipped: true, reason: 'invalid-phone' };
  const consent = findEffectiveConsent(tenantId, patient, phoneForSend, category);
  if (!consent) return { ok: false, skipped: true, reason: 'no-consent' };
  const tenant = db.tenants.find((t) => String(t.id) === String(tenantId));
  const config = tenant?.integrations?.whatsapp?.config || {};
  if (!config.apiKey || !config.phoneNumberId) return { ok: false, skipped: true, reason: 'whatsapp-not-configured' };
  if (dryRun) {
    return {
      ok: true, dryRun: true,
      message: {
        tenantId, patientId: patient?.id || null, phone: phoneForSend, direction: 'out',
        type: payload.type, category, jobRef, consentId: consent.id
      }
    };
  }
  const message = {
    id: nextId(), tenantId, patientId: patient?.id || null, phone: phoneForSend, direction: 'out',
    type: payload.type, category,
    text: payload.type === 'text' ? payload.text.body : null,
    ...(payload.type === 'template' ? {
      templateName: payload.template.name,
      templateLanguage: payload.template.language.code,
      templateComponents: payload.template.components || []
    } : {}),
    ...(jobRef ? { jobRef } : {}),
    consentId: consent.id, status: 'queued', createdAt: new Date().toISOString()
  };
  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(config.phoneNumberId)}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const providerPayload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(providerPayload?.error?.message || 'WhatsApp provider rejected the message.');
    message.status = 'sent'; message.providerMessageId = providerPayload.messages?.[0]?.id || null;
    db.whatsappMessages = db.whatsappMessages || [];
    db.whatsappMessages.push(message); save();
    return { ok: true, status: 'sent', message };
  } catch (e) {
    message.status = 'failed'; message.error = String(e.message).slice(0, 300);
    db.whatsappMessages = db.whatsappMessages || [];
    db.whatsappMessages.push(message); save();
    return { ok: false, status: 'failed', error: message.error, message };
  }
}

// Consent resolution shared by every outbound WhatsApp path. The LATEST consent
// log for (tenant, patient-or-phone, scope) wins, so a WhatsApp "STOP" (a
// webhook-written log with status 'withdrawn') blocks sends even when an older
// grant exists — previously a withdrawn log still passed the gate.
// Logs may be linked by patientId (booking flow) or by phone (webhook opt-out).
function findEffectiveConsent(tenantId, patient, phone, category) {
  const scope = category === 'utility' ? 'service' : 'marketing';
  const logs = (db.consentLogs || []).filter((c) => {
    if (String(c.tenantId || PUBLIC_TENANT) !== String(tenantId)) return false;
    if (c.scope !== scope) return false;
    if (patient && c.patientId != null && String(c.patientId) === String(patient.id)) return true;
    if (phone && c.phone === phone) return true;
    return false;
  });
  if (!logs.length) return null;
  const latest = logs.reduce((a, b) => (String(b.capturedAt || '') > String(a.capturedAt || '') ? b : a));
  return String(latest.status || '').toLowerCase() === 'withdrawn' ? null : latest;
}

// ---- Scheduler-ready reminder job: appointment reminders + recall sends ----
// POST /jobs/run — auth is either a staff session (clinic-scoped; the agency
// owner with "All clinics" selected runs every tenant) or an external scheduler
// sending the x-cron-secret header matching $CRON_SECRET (runs every tenant;
// leave CRON_SECRET unset to disable that path entirely).
//
//   body: { type: 'appointment-reminders' | 'recall-sends' | 'all',
//           dryRun?: boolean (default false), days?: 0-14 lookahead (default 1),
//           limit?: 1-200 max recipients (default 50) }
//
// Safety properties (mirror the /whatsapp/send contract — no fake sends):
//   * recipients without DPDP consent are SKIPPED with reason 'no-consent';
//   * clinics without Meta credentials are SKIPPED with 'whatsapp-not-configured';
//   * dryRun plans the exact sends but writes nothing (no ids consumed);
//   * re-runs are idempotent: each send carries jobRef 'appt-reminder-<id>' /
//     'recall-send-<id>' and a second run reports 'already-sent' instead of
//     double-texting the patient;
//   * suspended clinics are skipped entirely;
//   * free-form text only delivers inside Meta's 24-hour service window —
//     clinics that need reminders outside it should send via an approved
//     template (POST /whatsapp/send { template }) once Meta approves one.
const JOB_TYPES = new Set(['all', 'appointment-reminders', 'recall-sends']);
const SENT_LIKE = new Set(['sent', 'queued', 'simulated', 'delivered', 'read']);
const JOB_DEFAULT_DAYS = 1;   // reminders for today + tomorrow
const JOB_MAX_DAYS = 14;
const JOB_DEFAULT_LIMIT = 50;
const JOB_MAX_LIMIT = 200;

function istAddDays(iso, n) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function prettyDate(iso) {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

function jobAlreadySent(tenantId, jobRef) {
  return (db.whatsappMessages || []).some((m) =>
    String(m.tenantId) === String(tenantId) && m.jobRef === jobRef && SENT_LIKE.has(String(m.status || '').toLowerCase())
  );
}

function reminderText(kind, patient, clinic, record) {
  const firstName = String(patient.name || 'there').split(' ')[0];
  if (kind === 'appointment') {
    const when = `${prettyDate(record.date)}${record.time ? ` at ${record.time}` : ''}`;
    return `Hi ${firstName}, a reminder from ${clinic}: your appointment is on ${when}. Reply here or call the clinic to reschedule.`;
  }
  return `Hi ${firstName}, ${clinic} here. You're due for: ${record.type}. Reply here or call the clinic to book a time that suits you.`;
}

async function runReminderJob({ type = 'all', dryRun = false, days = JOB_DEFAULT_DAYS, limit = JOB_DEFAULT_LIMIT, tenantIds = [] }) {
  const today = istToday();
  const until = istAddDays(today, days);
  const results = [];
  const totals = { planned: 0, sent: 0, skipped: 0, failed: 0 };
  const reasons = {};
  const skippedTenants = [];
  let seen = 0;

  for (const tenantId of tenantIds) {
    const tenant = db.tenants.find((t) => String(t.id) === String(tenantId));
    if (!tenant) continue;
    if (String(tenant.status || '').toLowerCase() === 'suspended') {
      skippedTenants.push({ id: tenant.id, name: tenant.name, reason: 'suspended' });
      continue;
    }
    const clinic = tenantSettings(tenantId).clinicName || tenant.name;
    const candidates = [];
    if (type !== 'recall-sends') {
      sc(db.appointments, tenantId)
        .filter((a) => isIsoDate(a.date) && a.date >= today && a.date <= until
          && !INACTIVE_APPT.has(String(a.status || '').toLowerCase()))
        .sort((a, b) => String(a.date + a.time).localeCompare(String(b.date + b.time)))
        .forEach((a) => candidates.push({ kind: 'appointment', record: a }));
    }
    if (type !== 'appointment-reminders') {
      sc(db.recall || [], tenantId)
        .filter((r) => String(r.status || '').toLowerCase() !== 'sent' && isIsoDate(r.dueDate) && r.dueDate <= today)
        .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
        .forEach((r) => candidates.push({ kind: 'recall', record: r }));
    }

    for (const { kind, record } of candidates) {
      if (seen >= limit) break;
      seen += 1;
      const patient = sc(db.patients, tenantId).find((p) => String(p.id) === String(record.patientId));
      const base = {
        tenantId, kind, clinic,
        appointmentId: kind === 'appointment' ? record.id : undefined,
        recallId: kind === 'recall' ? record.id : undefined,
        patientId: patient?.id ?? record.patientId ?? null,
        patientName: patient?.name || 'Unknown',
        phone: patient?.phone || null,
        channel: kind === 'recall' ? String(record.channel || 'WhatsApp') : 'WhatsApp'
      };
      if (!patient) {
        totals.skipped += 1;
        reasons['patient-not-found'] = (reasons['patient-not-found'] || 0) + 1;
        results.push({ ...base, outcome: 'skipped', reason: 'patient-not-found' });
        continue;
      }
      // SMS recalls stay visible in the report (operators can send them by hand
      // once the SMS gateway lands in Phase 10) but are never sent from here.
      if (kind === 'recall' && base.channel.toLowerCase() !== 'whatsapp') {
        totals.skipped += 1;
        reasons['sms-channel-not-supported'] = (reasons['sms-channel-not-supported'] || 0) + 1;
        results.push({ ...base, outcome: 'skipped', reason: 'sms-channel-not-supported' });
        continue;
      }
      const jobRef = kind === 'appointment' ? `appt-reminder-${record.id}` : `recall-send-${record.id}`;
      if (jobAlreadySent(tenantId, jobRef)) {
        totals.skipped += 1;
        reasons['already-sent'] = (reasons['already-sent'] || 0) + 1;
        results.push({ ...base, outcome: 'skipped', reason: 'already-sent' });
        continue;
      }
      const category = kind === 'appointment' ? 'utility' : 'marketing';
      const text = reminderText(kind, patient, clinic, record);
      const outcome = await deliverWhatsApp({
        tenantId, patient, phone: base.phone, category, jobRef, dryRun,
        payload: { messaging_product: 'whatsapp', type: 'text', text: { preview_url: false, body: text } }
      });
      if (outcome.ok && outcome.dryRun) {
        totals.planned += 1;
        results.push({ ...base, category, jobRef, text, outcome: 'planned' });
      } else if (outcome.ok) {
        totals.sent += 1;
        if (kind === 'recall') { record.status = 'Sent'; record.sentAt = today; record.messageId = outcome.message.id; }
        results.push({ ...base, category, jobRef, text, outcome: 'sent', messageId: outcome.message.id });
      } else if (outcome.skipped) {
        totals.skipped += 1;
        reasons[outcome.reason] = (reasons[outcome.reason] || 0) + 1;
        results.push({ ...base, category, jobRef, text, outcome: 'skipped', reason: outcome.reason });
      } else {
        totals.failed += 1;
        results.push({ ...base, category, jobRef, text, outcome: 'failed', error: outcome.error });
      }
    }
  }
  if (!dryRun) save();
  return {
    ok: true,
    job: { type, dryRun, days, limit, ranOn: today, window: type === 'recall-sends' ? null : { from: today, to: until } },
    tenants: tenantIds,
    skippedTenants,
    totals: { ...totals, processed: seen },
    reasons,
    results
  };
}

router.post('/jobs/run', async (req, res) => {
  const { type = 'all', dryRun = false, days = JOB_DEFAULT_DAYS, limit = JOB_DEFAULT_LIMIT } = req.body || {};
  if (!JOB_TYPES.has(type)) {
    return res.status(400).json({ error: "Unknown job type. Use 'appointment-reminders', 'recall-sends' or 'all'." });
  }
  if (typeof dryRun !== 'boolean') return res.status(400).json({ error: 'dryRun must be true or false.' });
  if (!Number.isInteger(days) || days < 0 || days > JOB_MAX_DAYS) {
    return res.status(400).json({ error: `days must be an integer between 0 and ${JOB_MAX_DAYS}.` });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > JOB_MAX_LIMIT) {
    return res.status(400).json({ error: `limit must be an integer between 1 and ${JOB_MAX_LIMIT}.` });
  }
  // Scheduler auth: constant-time compared shared secret. Unset CRON_SECRET
  // (the default) disables this path entirely — then only staff can run jobs.
  const cronSecret = process.env.CRON_SECRET;
  const cronHeader = req.headers['x-cron-secret'];
  let tenantIds = null;
  if (cronSecret && typeof cronHeader === 'string' && cronHeader.length === cronSecret.length) {
    if (crypto.timingSafeEqual(Buffer.from(cronHeader), Buffer.from(cronSecret))) {
      tenantIds = db.tenants.map((t) => t.id);
    }
  }
  if (tenantIds === null) {
    const s = staff(req);
    if (!s) return res.status(401).json({ error: 'Please sign in.' });
    const t = tid(req);
    tenantIds = t === null ? db.tenants.map((x) => x.id) : [t];
  }
  try {
    res.json(await runReminderJob({ type, dryRun, days, limit, tenantIds }));
  } catch (e) {
    console.error('[jobs/run] failed:', String(e.message || e).slice(0, 200));
    return res.status(500).json({ error: 'The reminder job failed to complete. No further messages were sent.' });
  }
});


// ---- Generic CRUD (tenant-scoped) ----
TABLES.forEach((t) => {
  router.get('/' + t, (req, res) => {
    const s = staff(req);
    if (!s) {
      // Unauthenticated: only the public read-view of tenant 1 is exposed.
      if (t === 'reviews') return res.json(sc(db.reviews, PUBLIC_TENANT).filter((r) => r.status === 'published'));
      if (PUBLIC_TABLES.has(t)) return res.json(sc(db[t], PUBLIC_TENANT));
      return res.status(401).json({ error: 'Please sign in.' });
    }
    if (SUPER_TABLES.has(t) && s.staff.role !== 'super') {
      return res.status(403).json({ error: 'Agency owner access only.' });
    }
    if (t === 'staff') return res.json(sc(db.staff, tid(req)).map(stripSecrets));
    if (t === 'tenants') return res.json(db.tenants.map(safeTenant));
    res.json(sc(db[t], tid(req)));
  });

  router.post('/' + t, (req, res) => {
    const s = staff(req);
    if (!s) return res.status(401).json({ error: 'Please sign in.' });
    if (SUPER_TABLES.has(t) && s.staff.role !== 'super') {
      return res.status(403).json({ error: 'Agency owner access only.' });
    }
    if (TENANT_TABLES.has(t) && tid(req) === null) {
      return res.status(400).json({ error: 'Pick a clinic first.' });
    }
    let body = sanitizeBody(req.body, { allowTenantId: s.staff.role === 'super' });
    if (t === 'staff') body = prepareStaffBody(body);
    // Basic sanity validation for money-bearing fields.
    if (t === 'invoices' && body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!Number.isFinite(amt) || amt < 0) return res.status(400).json({ error: 'Invalid invoice amount.' });
      body.amount = amt;
    }
    const stamp = TENANT_TABLES.has(t) ? { tenantId: tid(req) || PUBLIC_TENANT } : {};
    const item = { id: nextId(), created_date: new Date().toISOString(), ...stamp, ...body };
    db[t].push(item);
    save();
    res.json(t === 'staff' ? stripSecrets(item) : item);
  });

  router.put('/' + t + '/:id', (req, res) => {
    const s = staff(req);
    if (!s) return res.status(401).json({ error: 'Please sign in.' });
    if (SUPER_TABLES.has(t) && s.staff.role !== 'super') {
      return res.status(403).json({ error: 'Agency owner access only.' });
    }
    const arr = t === 'tenants' ? db.tenants : db[t];
    const i = arr.findIndex((x) => String(x.id) === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Not found' });
    const active = tid(req);
    // Records with no tenantId are treated as PUBLIC_TENANT (see sc()).
    if (t !== 'tenants' && active !== null && String(arr[i].tenantId || PUBLIC_TENANT) !== String(active)) {
      return res.status(403).json({ error: 'This record belongs to another clinic.' });
    }
    let body = sanitizeBody(req.body, { allowTenantId: s.staff.role === 'super' });
    if (t === 'staff') body = prepareStaffBody(body);
    if (t === 'invoices' && body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!Number.isFinite(amt) || amt < 0) return res.status(400).json({ error: 'Invalid invoice amount.' });
      body.amount = amt;
    }
    arr[i] = { ...arr[i], ...body };
    save();
    res.json(t === 'staff' ? stripSecrets(arr[i]) : arr[i]);
  });

  router.delete('/' + t + '/:id', (req, res) => {
    const s = staff(req);
    if (!s) return res.status(401).json({ error: 'Please sign in.' });
    if (SUPER_TABLES.has(t) && s.staff.role !== 'super') {
      return res.status(403).json({ error: 'Agency owner access only.' });
    }
    const arr = db[t];
    const i = arr.findIndex((x) => String(x.id) === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Not found' });
    const active = tid(req);
    if (t !== 'tenants' && active !== null && String(arr[i].tenantId || PUBLIC_TENANT) !== String(active)) {
      return res.status(403).json({ error: 'This record belongs to another clinic.' });
    }
    arr.splice(i, 1);
    save();
    res.json({ ok: true });
  });
});

// ---- Settings ----
router.get('/settings/mine', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  res.json(tenantSettings(tid(req) ?? 1));
});

// /settings is ALWAYS the public website (tenant 1) — staff sessions must not
// change what the public site shows. Staff pages use /settings/mine.
router.get('/settings', (req, res) => res.json(tenantSettings(1)));
router.put('/settings', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  const t = tid(req) ?? 1;
  if (String(t) === '1') {
    db.settings = { ...db.settings, ...req.body };
  } else {
    const tn = db.tenants.find((x) => String(x.id) === String(t));
    if (!tn) return res.status(404).json({ error: 'Clinic not found.' });
    tn.settings = { ...(tn.settings || db.settings), ...req.body };
  }
  save();
  res.json(tenantSettings(t));
});

// ---- Dashboard ----
router.get('/dashboard', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  const t = tid(req);
  const S = (arr) => sc(arr, t);
  const today = istToday();
  const month = today.slice(0, 7);
  const pName = (id) => { const p = S(db.patients).find((x) => x.id === Number(id)); return p ? p.name : 'Unknown'; };
  const dName = (id) => { const d = S(db.dentists).find((x) => x.id === Number(id)); return d ? d.name : '—'; };

  const appointmentsToday = S(db.appointments)
    .filter((a) => a.date === today)
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
    .map((a) => ({ ...a, patientName: pName(a.patientId), dentistName: dName(a.dentistId) }));

  const isPaid = (i) => String(i.status || '').toLowerCase() === 'paid';
  const revenueThisMonth = S(db.invoices)
    .filter((i) => isPaid(i) && String(i.date || '').startsWith(month))
    .reduce((s2, i) => s2 + (i.amount || 0), 0);

  const pendingInvoices = S(db.invoices).filter((i) => String(i.status || '').toLowerCase() === 'pending');
  const pendingInvoicesAmount = pendingInvoices.reduce((s2, i) => s2 + (i.amount || 0), 0);

  const dailySummary = {
    date: today,
    revenueToday: S(db.invoices)
      .filter((i) => isPaid(i) && i.date === today)
      .reduce((s2, i) => s2 + (i.amount || 0), 0),
    completedVisits: appointmentsToday.filter((a) => a.status === 'Completed').length,
    appointmentsToday: appointmentsToday.length
  };

  const goals = [
    { key: 'revenue', label: 'Revenue', current: revenueThisMonth + ((tenantSettings(t).monthly || {}).revenue || 0), target: (tenantSettings(t).goals || {}).revenue, unit: '₹' },
    { key: 'newPatients', label: 'New Patients', current: (tenantSettings(t).monthly || {}).newPatients || 0, target: (tenantSettings(t).goals || {}).newPatients, unit: '' },
    { key: 'treatments', label: 'Treatments Completed', current: (tenantSettings(t).monthly || {}).treatments || 0, target: (tenantSettings(t).goals || {}).treatments, unit: '' },
    { key: 'reviews', label: 'Reviews Collected', current: (tenantSettings(t).monthly || {}).reviews || 0, target: (tenantSettings(t).goals || {}).reviews, unit: '' }
  ];

  // Last 6 calendar months keyed properly (no 30-day-step month skipping).
  const trend = {};
  lastMonths(6).forEach((m) => { trend[m.key] = 0; });
  S(db.invoices)
    .filter((i) => isPaid(i))
    .forEach((i) => {
      const k = String(i.date || '').slice(0, 7);
      if (trend[k] !== undefined) trend[k] += i.amount || 0;
    });
  const revenueTrend = lastMonths(6).map((m) => ({ month: m.label, total: trend[m.key] }));

  const weekAgo = istDaysAgo(7); // IST-consistent with the rest of the file
  const newLeads = S(db.leads).filter((l) => (l.created_date || '') >= weekAgo);
  const converted = S(db.leads).filter((l) => l.status === 'Converted').length;

  res.json({
    today,
    appointmentsToday,
    todayCount: appointmentsToday.length,
    revenueThisMonth,
    activePatients: S(db.patients).filter((p) => p.status === 'Active').length,
    totalPatients: S(db.patients).length,
    pendingInvoicesCount: pendingInvoices.length,
    pendingInvoicesAmount,
    dailySummary,
    goals,
    tasks: S(db.tasks).filter((ta) => ta.status === 'pending'),
    leadPipeline: {
      newThisWeek: newLeads.length,
      conversionRate: S(db.leads).length ? Math.round((converted / S(db.leads).length) * 100) : 0,
      top: [...S(db.leads)].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)
    },
    revenueTrend,
    recentPatients: [...S(db.patients)]
      .sort((a, b) => String(b.lastVisit || '').localeCompare(String(a.lastVisit || '')))
      .slice(0, 5),
    pendingTreatmentPlans: S(db.treatmentPlans)
      .filter((tp) => tp.status !== 'Completed')
      .map((tp) => ({ ...tp, patientName: pName(tp.patientId) })),
    lowStock: S(db.inventory).filter((i) => i.quantity <= i.minStock)
  });
});

// ---- Tooth chart ----
function isValidTooth(n) {
  // FDI numbering: permanent quadrants 1-4, deciduous 5-8, tooth 1-8 per quadrant.
  const q = Math.floor(n / 10); const u = n % 10;
  return Number.isInteger(n) && q >= 1 && q <= 8 && u >= 1 && u <= 8;
}

router.get('/tooth-chart', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  res.json(sc(db.toothChartStates || [], tid(req)));
});

router.put('/tooth-chart/:tooth', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  const tooth = Number(req.params.tooth);
  const state = (req.body || {}).state;
  if (!isValidTooth(tooth)) return res.status(400).json({ error: 'Invalid tooth number.' });
  if (!TOOTH_STATES.has(state)) return res.status(400).json({ error: 'Invalid tooth state.' });
  db.toothChartStates = db.toothChartStates || [];
  const scoped = sc(db.toothChartStates, tid(req));
  const existing = scoped.find((t) => t.tooth === tooth);
  if (existing) existing.state = state;
  else db.toothChartStates.push({ tenantId: tid(req) || PUBLIC_TENANT, tooth, state });
  save();
  res.json(sc(db.toothChartStates, tid(req)));
});

// ---- Public booking (always tenant 1 — the clinic that owns the website) ----
router.get('/slots', (req, res) => {
  const { date, dentistId } = req.query;
  if (!isIsoDate(date)) return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
  const booked = sc(db.appointments, PUBLIC_TENANT)
    .filter((a) =>
      a.date === date
      && !INACTIVE_APPT.has(String(a.status || '').toLowerCase())
      && (!dentistId || String(a.dentistId) === String(dentistId) || a.dentistId == null))
    .map((a) => a.time);
  res.json(BOOKING_SLOTS.map((t) => ({ time: t, available: !booked.includes(t) })));
});

router.post('/bookings', (req, res) => {
  if (publicRateLimited(req, 'booking', 30)) {
    return res.status(429).json({ error: 'Too many booking attempts. Please try again later.' });
  }
  const { service, dentistId, date, time, name, phone, email, notes, consentGiven, marketingConsentGiven, consentVersion } = req.body || {};
  if (!name || !phone || !date || !time || !service) {
    return res.status(400).json({ error: 'Missing required booking details.' });
  }
  if (consentGiven !== true || consentVersion !== BOOKING_CONSENT_VERSION) {
    return res.status(400).json({ error: 'Please accept the privacy notice to continue.' });
  }
  if (!isIsoDate(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  if (date < istToday()) return res.status(400).json({ error: 'Please pick today or a future date.' });
  if (!BOOKING_SLOTS.includes(time)) return res.status(400).json({ error: 'Invalid time slot.' });
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  let dentist = null;
  if (dentistId !== undefined && dentistId !== null && dentistId !== '') {
    dentist = sc(db.dentists, PUBLIC_TENANT).find((d) => String(d.id) === String(dentistId));
    if (!dentist) return res.status(400).json({ error: 'Selected dentist is not available.' });
  }
  // Conflict check on submit — the slot list is only advisory; without this,
  // two concurrent bookings (or a stale slot page) silently double-book a slot.
  if (!isSlotStillOpen(date, time, dentist ? dentist.id : null)) {
    return res.status(409).json({ error: 'That slot has just been booked. Please pick another time.' });
  }

  const pool = sc(db.patients, PUBLIC_TENANT);
  let patient = pool.find((p) => p.phone === normalizedPhone);
  const isNew = !patient;
  if (!patient) {
    patient = {
      id: nextId(), tenantId: PUBLIC_TENANT, name: String(name).slice(0, 80),
      phone: normalizedPhone, email: String(email || '').slice(0, 120),
      age: null, gender: '', lastVisit: date, status: 'Active', notes: String(notes || '').slice(0, 500)
    };
    db.patients.push(patient);
  }
  const appt = {
    id: nextId(), tenantId: PUBLIC_TENANT, patientId: patient.id,
    dentistId: dentist ? dentist.id : null,
    date, time, type: 'checkup', procedure: String(service).slice(0, 120), fee: 0, status: 'Scheduled'
  };
  db.appointments.push(appt);
  db.consentLogs = db.consentLogs || [];
  db.consentLogs.push({
    id: nextId(), tenantId: PUBLIC_TENANT, patientId: patient.id, appointmentId: appt.id,
    scope: 'service', consentType: 'booking_privacy_notice', purpose: 'Appointment booking and clinic communication',
    policyVersion: BOOKING_CONSENT_VERSION, source: 'public_booking',
    capturedAt: new Date().toISOString()
  });
  if (marketingConsentGiven === true) {
    db.consentLogs.push({
      id: nextId(), tenantId: PUBLIC_TENANT, patientId: patient.id, appointmentId: appt.id,
      scope: 'marketing', consentType: 'whatsapp_marketing', purpose: 'Optional appointment reminders, offers and checkup nudges',
      policyVersion: BOOKING_CONSENT_VERSION, source: 'public_booking',
      capturedAt: new Date().toISOString()
    });
  }
  save();
  res.json({
    appointment: { id: appt.id, date: appt.date, time: appt.time, status: appt.status },
    isNewPatient: isNew
  });
});

router.post('/reviews/public', (req, res) => {
  const { name, phone, rating, text } = req.body || {};
  if (publicRateLimited(req, 'review', 10)) {
    return res.status(429).json({ error: 'Too many reviews from this network. Please try again later.' });
  }
  if (!name || !rating || !text) {
    return res.status(400).json({ error: 'Name, rating and review text are required.' });
  }
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }
  const review = {
    id: nextId(), tenantId: PUBLIC_TENANT, name: String(name).slice(0, 80),
    phone: phone ? String(phone).slice(0, 15) : '', rating: r,
    text: String(text).slice(0, 2000), source: 'Website', status: 'pending',
    date: istToday(), response: '', created_date: new Date().toISOString()
  };
  db.reviews.push(review);
  save();
  res.json({ ok: true, reviewId: review.id });
});

// ---- Patient portal (tenant 1) ----
// Portal auth is OTP-based: the phone number alone must never grant access to
// clinical records. See docs/OTP-AUTH.md for the design and the known blocker
// around real SMS delivery (DLT-registered template required in India).

// ---- Portal OTP machinery (in-memory, single instance) ----
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 5 * 60 * 1000;        // code lifetime
const OTP_RESEND_MS = Number(process.env.OTP_RESEND_MS) || 60 * 1000;      // min gap between sends per phone
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;        // wrong entries per code
const OTP_REQUEST_LIMIT = Number(process.env.OTP_REQUEST_LIMIT) || 5;     // sends per phone per window
const OTP_IP_LIMIT = Number(process.env.OTP_IP_LIMIT) || 15;              // sends per IP per window
const OTP_VERIFY_IP_LIMIT = Number(process.env.OTP_VERIFY_IP_LIMIT) || 30; // verifies per IP per window
const OTP_WINDOW_MS = Number(process.env.OTP_WINDOW_MS) || 10 * 60 * 1000;

// The pepper is never written to disk: OTP records are in-memory only, so a
// per-process random fallback is safe (and OTPs die with the process anyway).
const OTP_PEPPER = process.env.OTP_PEPPER || crypto.randomBytes(32).toString('hex');

const PORTAL_OTPS = {};   // phone -> { codeHash, expiresAt, attempts, sentAt }
const OTP_REQUESTS = {}; // rate-limit counters: '<kind>:<key>' -> { count, windowStart }

function otpRateLimited(kind, key, limit) {
  const now = Date.now();
  const k = kind + ':' + key;
  const rec = OTP_REQUESTS[k];
  if (!rec || now - rec.windowStart > OTP_WINDOW_MS) {
    OTP_REQUESTS[k] = { count: 1, windowStart: now };
    return false;
  }
  rec.count += 1;
  return rec.count > limit;
}

function otpClearRates(phone, ip) {
  delete OTP_REQUESTS['phone:' + phone];
  delete OTP_REQUESTS['ip:' + ip];
}

function hashOtp(phone, code) {
  return crypto.createHash('sha256').update(code + ':' + phone + ':' + OTP_PEPPER).digest();
}

function otpEqual(phone, code, codeHash) {
  const a = hashOtp(phone, code);
  const b = Buffer.from(codeHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function portalPayload(patient) {
  const dName = (id) => { const d = sc(db.dentists, PUBLIC_TENANT).find((x) => x.id === Number(id)); return d ? d.name : '—'; };
  // Clinical notes are internal — do not expose them through the portal.
  const { notes, ...safePatient } = patient;
  return {
    patient: safePatient,
    appointments: sc(db.appointments, PUBLIC_TENANT)
      .filter((a) => a.patientId === patient.id)
      .map((a) => ({ ...a, dentistName: dName(a.dentistId) })),
    treatmentPlans: sc(db.treatmentPlans, PUBLIC_TENANT).filter((tp) => tp.patientId === patient.id),
    invoices: sc(db.invoices, PUBLIC_TENANT).filter((i) => i.patientId === patient.id),
    recalls: sc(db.recall || [], PUBLIC_TENANT).filter((r) => String(r.patientId) === String(patient.id) || r.phone === patient.phone)
  };
}

// ---- SMS delivery (production) ----
// Only MSG91 is wired (the connector shape in docs/INTEGRATIONS.md). Delivery
// needs authKey + senderId + a DLT-registered OTP templateId; without them the
// endpoint refuses to send (503) and never leaks the code in the response.
async function sendOtpSms(phone, code) {
  const tenant = db.tenants.find((t) => String(t.id) === String(PUBLIC_TENANT));
  const cfg = (tenant && tenant.integrations && tenant.integrations.sms && tenant.integrations.sms.config) || {};
  if (!cfg.authKey || !cfg.senderId || !cfg.templateId) {
    return { sent: false, status: 503, error: 'SMS delivery is not configured yet. The clinic must add an SMS gateway (auth key, sender ID and a DLT-registered OTP template) under Admin → Integrations. Portal login is unavailable until then.' };
  }
  try {
    const response = await fetch('https://api.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: cfg.authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: cfg.templateId,
        short_url: '0',
        recipients: [{ mobiles: '91' + phone, VAR: code, VAR1: code, VAR2: code }]
      })
    });
    if (!response.ok) {
      console.error('[otp] SMS gateway rejected the send with HTTP', response.status);
      return { sent: false, status: 502, error: 'The SMS gateway rejected the request. Please try again in a moment.' };
    }
    return { sent: true };
  } catch (e) {
    console.error('[otp] SMS gateway unreachable:', e.message);
    return { sent: false, status: 502, error: 'The SMS gateway could not be reached. Please try again in a moment.' };
  }
}

// Step 1: request a code for a registered phone.
router.post('/portal/otp/request', async (req, res) => {
  const rawPhone = String((req.body || {}).phone || '').trim();
  const phone = normalizePhone(rawPhone);
  if (!phone) return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  const ip = req.ip || 'unknown';

  if (otpRateLimited('ip', ip, OTP_IP_LIMIT)) {
    return res.status(429).json({ error: 'Too many verification requests from this network. Please wait a few minutes.' });
  }
  if (otpRateLimited('phone', phone, OTP_REQUEST_LIMIT)) {
    return res.status(429).json({ error: 'Too many codes requested for this number. Please wait a few minutes.' });
  }

  const existing = PORTAL_OTPS[phone];
  if (existing && !existing.consumed && Date.now() - existing.sentAt < OTP_RESEND_MS) {
    return res.status(429).json({ error: 'A code was just sent. Please wait before requesting another one.' });
  }

  const patient = sc(db.patients, PUBLIC_TENANT).find((p) => p.phone === phone);
  if (!patient) return res.status(404).json({ error: 'No account found with this phone number. Please register.' });

  const code = String(crypto.randomInt(100000, 1000000)); // 6-digit, crypto-random

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const result = await sendOtpSms(phone, code);
    if (!result.sent) return res.status(result.status).json({ error: result.error });
  }
  // Store only after delivery succeeded (or in dev/demo, where the code is
  // returned to the caller below on purpose so the flow is testable).
  PORTAL_OTPS[phone] = {
    codeHash: hashOtp(phone, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    sentAt: Date.now(),
    consumed: false
  };

  const body = {
    ok: true,
    channel: isProduction ? 'sms' : 'dev',
    expiresInSec: Math.round(OTP_TTL_MS / 1000),
    resendInSec: Math.round(OTP_RESEND_MS / 1000)
  };
  // NEVER in production: exposing the code in the response would defeat the OTP.
  // In dev/demo builds there is no real SMS transport, so the code is returned
  // for the same flow to be fully testable (and mirrored by api-demo.js).
  if (!isProduction && process.env.ALLOW_DEV_OTP === 'true') body.devCode = code;
  res.json(body);
});

// Step 2: verify the code; on success returns the full portal payload.
router.post('/portal/otp/verify', (req, res) => {
  const rawPhone = String((req.body || {}).phone || '').trim();
  const phone = normalizePhone(rawPhone);
  const code = String((req.body || {}).code || '').trim();
  if (!phone) return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Please enter the 6-digit code from your SMS.' });
  if (otpRateLimited('verify', req.ip || 'unknown', OTP_VERIFY_IP_LIMIT)) {
    return res.status(429).json({ error: 'Too many verification attempts from this network. Please wait a few minutes.' });
  }

  const otp = PORTAL_OTPS[phone];
  const dead = !otp || otp.consumed || Date.now() > otp.expiresAt;
  if (dead) {
    delete PORTAL_OTPS[phone];
    return res.status(401).json({ error: 'This code has expired or was already used. Please request a new one.' });
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    delete PORTAL_OTPS[phone];
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
  }
  if (!otpEqual(phone, code, otp.codeHash)) {
    otp.attempts += 1;
    const left = OTP_MAX_ATTEMPTS - otp.attempts;
    if (left <= 0) {
      delete PORTAL_OTPS[phone];
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }
    return res.status(401).json({ error: 'Incorrect code. ' + left + ' attempt' + (left === 1 ? '' : 's') + ' left.' });
  }

  // One-time use: burn the code immediately after a successful verify.
  delete PORTAL_OTPS[phone];
  otpClearRates(phone, req.ip || 'unknown');

  const patient = sc(db.patients, PUBLIC_TENANT).find((p) => p.phone === phone);
  if (!patient) return res.status(404).json({ error: 'No account found with this phone number. Please register.' });
  res.json(portalPayload(patient));
});

// Phone-only login is retired: it granted access to clinical records with
// nothing but a phone number. Old clients get an explicit, actionable error.
router.post('/portal/login', (_req, res) => {
  res.status(410).json({ error: 'Phone-only login is disabled. Request a verification code with /portal/otp/request, then verify with /portal/otp/verify.' });
});

// Registration still only creates the profile; the patient must then verify
// via OTP before any records are shown (the client drives them to the verify
// step automatically).
router.post('/portal/register', (req, res) => {
  const { name, phone, email, age, gender } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  if (sc(db.patients, PUBLIC_TENANT).find((p) => p.phone === normalizedPhone)) {
    return res.status(409).json({ error: 'An account already exists with this phone number. Please log in.' });
  }
  const patient = {
    id: nextId(), tenantId: PUBLIC_TENANT, name: String(name).slice(0, 80),
    phone: normalizedPhone, email: String(email || '').slice(0, 120),
    age: age === undefined || age === null || age === '' ? null : Number(age) || null,
    gender: gender || '', lastVisit: istToday(), status: 'Active', notes: ''
  };
  db.patients.push(patient);
  save();
  res.json({ patient });
});

// runReminderJob is exported so an in-process scheduler (or a script that
// shares this DB) can run jobs without going through HTTP.
module.exports = { router, runReminderJob };
