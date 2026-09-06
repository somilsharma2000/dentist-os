const express = require('express');
const crypto = require('crypto');
const { load, save, get } = require('./db');
const { seed } = require('./seed');

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
  'whatsappChats', 'qrCodes', 'consentLogs'
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
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00Z'));
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
  if (!user || !password || user.password !== password) {
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
  res.json({ staff: stripSecrets(user), tenant, token });
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
  res.json({ staff: s.staff, tenant: s.tenant || null, viewTenantId: s.viewTenantId || null });
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
    if (t === 'tenants') return res.json(db.tenants);
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
    const body = sanitizeBody(req.body, { allowTenantId: s.staff.role === 'super' });
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
    const body = sanitizeBody(req.body, { allowTenantId: s.staff.role === 'super' });
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
  res.json({ appointment: appt, patient, isNewPatient: isNew });
});

router.post('/reviews/public', (req, res) => {
  const { name, phone, rating, text } = req.body || {};
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
  res.json({ ok: true, review });
});

// ---- Patient portal (tenant 1) ----
// NOTE (demo): portal auth is phone-number-only by design for the demo build.
// Before any real deployment this MUST be hardened (OTP verification via an SMS
// provider, or a password/PIN) — a phone number alone must never grant access
// to clinical records.
router.post('/portal/login', (req, res) => {
  const rawPhone = String((req.body || {}).phone || '').trim();
  const normalizedPhone = normalizePhone(rawPhone);
  const patient = sc(db.patients, PUBLIC_TENANT)
    .find((p) => p.phone === rawPhone || (normalizedPhone && p.phone === normalizedPhone));
  if (!patient) return res.status(404).json({ error: 'No account found with this phone number. Please register.' });
  const dName = (id) => { const d = sc(db.dentists, PUBLIC_TENANT).find((x) => x.id === Number(id)); return d ? d.name : '—'; };
  // Clinical notes are internal — do not expose them through the portal.
  const { notes, ...safePatient } = patient;
  res.json({
    patient: safePatient,
    appointments: sc(db.appointments, PUBLIC_TENANT)
      .filter((a) => a.patientId === patient.id)
      .map((a) => ({ ...a, dentistName: dName(a.dentistId) })),
    treatmentPlans: sc(db.treatmentPlans, PUBLIC_TENANT).filter((tp) => tp.patientId === patient.id),
    invoices: sc(db.invoices, PUBLIC_TENANT).filter((i) => i.patientId === patient.id),
    recalls: sc(db.recall || [], PUBLIC_TENANT).filter((r) => String(r.patientId) === String(patient.id) || r.phone === patient.phone)
  });
});

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

module.exports = { router };
