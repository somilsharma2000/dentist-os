const express = require('express');
const { load, save, get } = require('./db');
const { seed } = require('./seed');

load(seed);

const router = express.Router();
const db = get();
const PUBLIC_TENANT = 1; // the clinic that owns the public website

// ---- Auth: in-memory token sessions (demo-grade; swap for JWT in production hardening) ----
const SESSIONS = {}; // token -> { staff, tenant, viewTenantId }

const TABLES = [
  'patients', 'dentists', 'appointments', 'treatmentPlans', 'invoices', 'leads', 'reviews',
  'tasks', 'inventory', 'automations', 'recall', 'socialPosts', 'tenants', 'staff',
  'whatsappChats', 'qrCodes'
];
const TENANT_TABLES = new Set(TABLES.filter((t) => t !== 'tenants' && t !== 'staff'));
const SUPER_TABLES = new Set(['tenants', 'staff']);
const PUBLIC_TABLES = new Set(['dentists', 'reviews']);

function nextId() {
  db.nextId = (db.nextId || 1000) + 1;
  return db.nextId;
}

function istToday() {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  return ist.toISOString().slice(0, 10);
}

function sessionOf(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  return SESSIONS[token] || null;
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

function sc(arr, t) {
  if (t === null || t === undefined) return arr;
  return arr.filter((x) => !x.tenantId || String(x.tenantId) === String(t));
}

function stripSecrets(u) {
  const { password, ...rest } = u;
  return rest;
}

function newToken() {
  return 'tok_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.staff.find(
    (u) => String(u.email).toLowerCase() === String(email || '').trim().toLowerCase()
  );
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const token = newToken();
  const tenant = db.tenants.find((t) => t.id === user.tenantId) || null;
  SESSIONS[token] = { staff: stripSecrets(user), tenant, viewTenantId: null };
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
  s.viewTenantId = (req.body || {}).tenantId || null;
  res.json({ ok: true, viewTenantId: s.viewTenantId });
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
    const stamp = TENANT_TABLES.has(t) ? { tenantId: tid(req) || PUBLIC_TENANT } : {};
    const item = { id: nextId(), created_date: new Date().toISOString(), ...stamp, ...req.body };
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
    if (t !== 'tenants' && active !== null && arr[i].tenantId && String(arr[i].tenantId) !== String(active)) {
      return res.status(403).json({ error: 'This record belongs to another clinic.' });
    }
    arr[i] = { ...arr[i], ...req.body };
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
    if (t !== 'tenants' && active !== null && arr[i].tenantId && String(arr[i].tenantId) !== String(active)) {
      return res.status(403).json({ error: 'This record belongs to another clinic.' });
    }
    arr.splice(i, 1);
    save();
    res.json({ ok: true });
  });
});

// ---- Settings ----
router.get('/settings', (req, res) => res.json(db.settings));
router.put('/settings', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  db.settings = { ...db.settings, ...req.body };
  save();
  res.json(db.settings);
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
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((a) => ({ ...a, patientName: pName(a.patientId), dentistName: dName(a.dentistId) }));

  const revenueThisMonth = S(db.invoices)
    .filter((i) => i.status === 'Paid' && String(i.date).startsWith(month))
    .reduce((s2, i) => s2 + (i.amount || 0), 0);

  const pendingInvoices = S(db.invoices).filter((i) => i.status === 'Pending');
  const pendingInvoicesAmount = pendingInvoices.reduce((s2, i) => s2 + (i.amount || 0), 0);

  const dailySummary = {
    date: today,
    revenueToday: S(db.invoices)
      .filter((i) => i.status === 'Paid' && i.date === today)
      .reduce((s2, i) => s2 + (i.amount || 0), 0),
    completedVisits: appointmentsToday.filter((a) => a.status === 'Completed').length,
    appointmentsToday: appointmentsToday.length
  };

  const goals = [
    { key: 'revenue', label: 'Revenue', current: revenueThisMonth + (db.settings.monthly.revenue || 0), target: db.settings.goals.revenue, unit: '₹' },
    { key: 'newPatients', label: 'New Patients', current: db.settings.monthly.newPatients, target: db.settings.goals.newPatients, unit: '' },
    { key: 'treatments', label: 'Treatments Completed', current: db.settings.monthly.treatments, target: db.settings.goals.treatments, unit: '' },
    { key: 'reviews', label: 'Reviews Collected', current: db.settings.monthly.reviews, target: db.settings.goals.reviews, unit: '' }
  ];

  const trend = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000 - i * 30 * 86400000);
    trend[d.toISOString().slice(0, 7)] = 0;
  }
  S(db.invoices)
    .filter((i) => i.status === 'Paid')
    .forEach((i) => { if (trend[i.date.slice(0, 7)] !== undefined) trend[i.date.slice(0, 7)] += i.amount || 0; });
  const revenueTrend = Object.entries(trend).map(([m, total]) => ({
    month: new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' }),
    total
  }));

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
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
      .sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''))
      .slice(0, 5),
    pendingTreatmentPlans: S(db.treatmentPlans)
      .filter((tp) => tp.status !== 'Completed')
      .map((tp) => ({ ...tp, patientName: pName(tp.patientId) })),
    lowStock: S(db.inventory).filter((i) => i.quantity <= i.minStock)
  });
});

// ---- Tooth chart ----
router.get('/tooth-chart', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  res.json(sc(db.toothChartStates || [], tid(req)));
});

router.put('/tooth-chart/:tooth', (req, res) => {
  const s = staff(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  db.toothChartStates = db.toothChartStates || [];
  const scoped = sc(db.toothChartStates, tid(req));
  const existing = scoped.find((t) => t.tooth === Number(req.params.tooth));
  if (existing) existing.state = (req.body || {}).state;
  else db.toothChartStates.push({ tenantId: tid(req) || PUBLIC_TENANT, tooth: Number(req.params.tooth), state: (req.body || {}).state });
  save();
  res.json(sc(db.toothChartStates, tid(req)));
});

// ---- Public booking (always tenant 1 — the clinic that owns the website) ----
router.get('/slots', (req, res) => {
  const date = req.query.date;
  const dentistId = req.query.dentistId;
  const booked = sc(db.appointments, PUBLIC_TENANT)
    .filter((a) => a.date === date && (!dentistId || String(a.dentistId) === String(dentistId)))
    .map((a) => a.time);
  const all = ['09:00', '09:45', '10:30', '11:15', '12:00', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45'];
  res.json(all.map((t) => ({ time: t, available: !booked.includes(t) })));
});

router.post('/bookings', (req, res) => {
  const { service, dentistId, date, time, name, phone, email, notes } = req.body || {};
  if (!name || !phone || !date || !time || !service) {
    return res.status(400).json({ error: 'Missing required booking details.' });
  }
  const pool = sc(db.patients, PUBLIC_TENANT);
  let patient = pool.find((p) => p.phone === String(phone).trim());
  const isNew = !patient;
  if (!patient) {
    patient = {
      id: nextId(), tenantId: PUBLIC_TENANT, name, phone: String(phone).trim(), email: email || '',
      age: null, gender: '', lastVisit: date, status: 'Active', notes: notes || ''
    };
    db.patients.push(patient);
  }
  const appt = {
    id: nextId(), tenantId: PUBLIC_TENANT, patientId: patient.id, dentistId: dentistId ? Number(dentistId) : null,
    date, time, type: 'checkup', procedure: service, fee: 0, status: 'Scheduled'
  };
  db.appointments.push(appt);
  save();
  res.json({ appointment: appt, patient, isNewPatient: isNew });
});

router.post('/reviews/public', (req, res) => {
  const { name, phone, rating, text } = req.body || {};
  if (!name || !rating || !text) {
    return res.status(400).json({ error: 'Name, rating and review text are required.' });
  }
  const review = {
    id: nextId(), tenantId: PUBLIC_TENANT, name, phone: phone || '', rating: Number(rating), text,
    source: 'Website', status: 'pending', date: istToday(), response: '',
    created_date: new Date().toISOString()
  };
  db.reviews.push(review);
  save();
  res.json({ ok: true, review });
});

// ---- Patient portal (tenant 1) ----
router.post('/portal/login', (req, res) => {
  const patient = sc(db.patients, PUBLIC_TENANT)
    .find((p) => p.phone === String((req.body || {}).phone || '').trim());
  if (!patient) return res.status(404).json({ error: 'No account found with this phone number. Please register.' });
  const dName = (id) => { const d = sc(db.dentists, PUBLIC_TENANT).find((x) => x.id === Number(id)); return d ? d.name : '—'; };
  res.json({
    patient,
    appointments: sc(db.appointments, PUBLIC_TENANT)
      .filter((a) => a.patientId === patient.id)
      .map((a) => ({ ...a, dentistName: dName(a.dentistId) })),
    treatmentPlans: sc(db.treatmentPlans, PUBLIC_TENANT).filter((tp) => tp.patientId === patient.id),
    invoices: sc(db.invoices, PUBLIC_TENANT).filter((i) => i.patientId === patient.id)
  });
});

router.post('/portal/register', (req, res) => {
  const { name, phone, email, age, gender } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });
  if (sc(db.patients, PUBLIC_TENANT).find((p) => p.phone === String(phone).trim())) {
    return res.status(409).json({ error: 'An account already exists with this phone number. Please log in.' });
  }
  const patient = {
    id: nextId(), tenantId: PUBLIC_TENANT, name, phone: String(phone).trim(), email: email || '',
    age: age || null, gender: gender || '', lastVisit: istToday(), status: 'Active', notes: ''
  };
  db.patients.push(patient);
  save();
  res.json({ patient });
});

module.exports = { router };
