// In-browser demo API — mirrors server/api.js exactly (used for the GitHub Pages
// static deployment, where there is no backend). Data persists in localStorage.
// MULTI-TENANT: every admin route requires a staff session and is scoped to the
// staff member's clinic (tenantId). The agency owner (role "super") sees all
// clinics and can switch the active tenant. Public routes always serve tenant 1
// (SmileCraft), the clinic that owns the public website.
import dbSeed from './demoData.json';
import { getSession } from './auth';

const LS_KEY = 'dentos-demo-db-v3';
const PUBLIC_TENANT = 1; // the clinic that owns the public website

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

let db;
try {
  const raw = localStorage.getItem(LS_KEY);
  db = raw ? JSON.parse(raw) : clone(dbSeed);
} catch (e) {
  db = clone(dbSeed);
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch (e) {
    /* storage full/blocked — keep working in-memory */
  }
}

function resetDemo() {
  db = clone(dbSeed);
  persist();
}

function nextId() {
  db.nextId = (db.nextId || 1000) + 1;
  return db.nextId;
}

// IST date regardless of the visitor's own timezone.
const istFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
});
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayISO() {
  return istFmt.format(new Date()); // YYYY-MM-DD
}

function istDaysAgo(n) {
  const [y, m, d] = todayISO().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

function lastMonths(count) {
  const [y, m] = todayISO().split('-').map(Number);
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push({ key: dt.toISOString().slice(0, 7), label: MONTH_NAMES[dt.getUTCMonth()] });
  }
  return out;
}

function isIsoDate(x) {
  return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(new Date(x + 'T00:00:00Z'));
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9][0-9]{9}$/.test(ten) ? ten : null;
}

const BOOKING_SLOTS = ['09:00', '09:45', '10:30', '11:15', '12:00', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45'];
const TOOTH_STATES = new Set(['healthy', 'filled', 'crowned', 'rootcanal', 'implant', 'extracted']);
const INACTIVE_APPT = new Set(['cancelled', 'no-show', 'no show']);
const BOOKING_CONSENT_VERSION = '2026-09-06';
const PROTECTED_FIELDS = ['id', 'created_date', 'created_by', 'tenantId'];

function sanitizeBody(body, opts = {}) {
  const out = { ...(body || {}) };
  PROTECTED_FIELDS.forEach((f) => delete out[f]);
  if (opts.allowTenantId) out.tenantId = (body || {}).tenantId;
  return out;
}

function slotOpen(date, time, dentistId) {
  return !sc(db.appointments, PUBLIC_TENANT).some((a) =>
    a.date === date && a.time === time
    && !INACTIVE_APPT.has(String(a.status || '').toLowerCase())
    && (a.dentistId == null || dentistId == null || String(a.dentistId) === String(dentistId))
  );
}

function err(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ---- Session & tenant scoping ----

const TABLES = [
  'patients', 'dentists', 'appointments', 'treatmentPlans', 'invoices', 'leads', 'reviews',
  'tasks', 'inventory', 'automations', 'recall', 'socialPosts', 'tenants', 'staff',
  'whatsappChats', 'qrCodes'
];
const TENANT_TABLES = new Set(TABLES.filter((t) => t !== 'tenants' && t !== 'staff'));
const SUPER_TABLES = new Set(['tenants', 'staff']);
const PUBLIC_TABLES = new Set(['dentists', 'reviews']); // readable without a session

function tenantSettings(t) {
  const tn = (db.tenants || []).find((x) => String(x.id) === String(t));
  return (tn && tn.settings) ? tn.settings : db.settings;
}

function session() {
  return getSession();
}

function staff() {
  const s = session();
  if (!s || !s.staff) throw err(401, 'Please sign in.');
  return s;
}

function requireSuper() {
  const s = staff();
  if (s.staff.role !== 'super') throw err(403, 'Agency owner access only.');
  return s;
}

// Active tenant: super's switched view, else the staff member's clinic. null = all clinics.
function tid() {
  const s = session();
  if (!s || !s.staff) return PUBLIC_TENANT;
  if (s.staff.role === 'super') return s.viewTenantId || null;
  return s.staff.tenantId || PUBLIC_TENANT;
}

function sc(arr, t) {
  const active = t === undefined ? tid() : t;
  if (active === null) return arr;
  return arr.filter((x) => String(x.tenantId || PUBLIC_TENANT) === String(active));
}

function stripSecrets(user) {
  const { password, ...rest } = user;
  return rest;
}

function login(body) {
  const { email, password } = body || {};
  const user = db.staff.find(
    (u) => String(u.email).toLowerCase() === String(email || '').trim().toLowerCase()
  );
  if (!user || !password || user.password !== password) throw err(401, 'Invalid email or password.');
  const tenant = db.tenants.find((t) => t.id === user.tenantId) || null;
  return { staff: stripSecrets(user), tenant };
}

function pName(id, t) {
  const p = sc(db.patients, t).find((x) => x.id === Number(id));
  return p ? p.name : 'Unknown';
}

function dName(id, t) {
  const d = sc(db.dentists, t).find((x) => x.id === Number(id));
  return d ? d.name : '—';
}

function getDashboard() {
  const t = tid();
  const S = (arr) => sc(arr, t);
  const today = todayISO();
  const month = today.slice(0, 7);

  const appointmentsToday = S(db.appointments)
    .filter((a) => a.date === today)
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
    .map((a) => ({ ...a, patientName: pName(a.patientId, t), dentistName: dName(a.dentistId, t) }));

  const isPaid = (i) => String(i.status || '').toLowerCase() === 'paid';
  const revenueThisMonth = S(db.invoices)
    .filter((i) => isPaid(i) && String(i.date || '').startsWith(month))
    .reduce((s, i) => s + (i.amount || 0), 0);

  const pendingInvoices = S(db.invoices).filter((i) => String(i.status || '').toLowerCase() === 'pending');

  const goals = [
    { key: 'revenue', label: 'Revenue', current: revenueThisMonth + ((tenantSettings(t).monthly || {}).revenue || 0), target: (tenantSettings(t).goals || {}).revenue, unit: '₹' },
    { key: 'newPatients', label: 'New Patients', current: (tenantSettings(t).monthly || {}).newPatients || 0, target: (tenantSettings(t).goals || {}).newPatients, unit: '' },
    { key: 'treatments', label: 'Treatments Completed', current: (tenantSettings(t).monthly || {}).treatments || 0, target: (tenantSettings(t).goals || {}).treatments, unit: '' },
    { key: 'reviews', label: 'Reviews Collected', current: (tenantSettings(t).monthly || {}).reviews || 0, target: (tenantSettings(t).goals || {}).reviews, unit: '' }
  ];

  const trend = {};
  lastMonths(6).forEach((m) => { trend[m.key] = 0; });
  S(db.invoices)
    .filter((i) => isPaid(i))
    .forEach((i) => {
      const k = String(i.date || '').slice(0, 7);
      if (trend[k] !== undefined) trend[k] += i.amount || 0;
    });
  const revenueTrend = lastMonths(6).map((m) => ({ month: m.label, total: trend[m.key] }));

  const weekAgo = istDaysAgo(7);
  const newLeads = S(db.leads).filter((l) => (l.created_date || '') >= weekAgo);
  const converted = S(db.leads).filter((l) => l.status === 'Converted').length;

  return {
    today,
    appointmentsToday,
    todayCount: appointmentsToday.length,
    revenueThisMonth,
    activePatients: S(db.patients).filter((p) => p.status === 'Active').length,
    totalPatients: S(db.patients).length,
    pendingInvoicesCount: pendingInvoices.length,
    pendingInvoicesAmount: pendingInvoices.reduce((s, i) => s + (i.amount || 0), 0),
    dailySummary: {
      date: today,
      revenueToday: S(db.invoices)
        .filter((i) => isPaid(i) && i.date === today)
        .reduce((s, i) => s + (i.amount || 0), 0),
      completedVisits: appointmentsToday.filter((a) => a.status === 'Completed').length,
      appointmentsToday: appointmentsToday.length
    },
    goals,
    leadPipeline: {
      newThisWeek: newLeads.length,
      conversionRate: S(db.leads).length ? Math.round((converted / S(db.leads).length) * 100) : 0,
      top: [...S(db.leads)].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)
    },
    tasks: S(db.tasks).filter((ta) => ta.status === 'pending'),
    revenueTrend,
    recentPatients: [...S(db.patients)]
      .sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''))
      .slice(0, 5),
    pendingTreatmentPlans: S(db.treatmentPlans)
      .filter((tp) => tp.status !== 'Completed')
      .map((tp) => ({ ...tp, patientName: pName(tp.patientId, t) })),
    lowStock: S(db.inventory).filter((i) => i.quantity <= i.minStock)
  };
}

function getSlots(params) {
  const date = params.get('date');
  const dentistId = params.get('dentistId');
  if (!isIsoDate(date)) throw err(400, 'Invalid date. Use YYYY-MM-DD.');
  const booked = sc(db.appointments, PUBLIC_TENANT)
    .filter((a) =>
      a.date === date
      && !INACTIVE_APPT.has(String(a.status || '').toLowerCase())
      && (!dentistId || String(a.dentistId) === String(dentistId) || a.dentistId == null))
    .map((a) => a.time);
  return BOOKING_SLOTS.map((t) => ({ time: t, available: !booked.includes(t) }));
}

function createBooking(body) {
  const { service, dentistId, date, time, name, phone, email, notes, consentGiven, marketingConsentGiven, consentVersion } = body;
  if (!name || !phone || !date || !time || !service) {
    throw err(400, 'Missing required booking details.');
  }
  if (consentGiven !== true || consentVersion !== BOOKING_CONSENT_VERSION) {
    throw err(400, 'Please accept the privacy notice to continue.');
  }
  if (!isIsoDate(date)) throw err(400, 'Invalid date format. Use YYYY-MM-DD.');
  if (date < todayISO()) throw err(400, 'Please pick today or a future date.');
  if (!BOOKING_SLOTS.includes(time)) throw err(400, 'Invalid time slot.');
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw err(400, 'Please enter a valid 10-digit Indian mobile number.');
  let dentist = null;
  if (dentistId !== undefined && dentistId !== null && dentistId !== '') {
    dentist = sc(db.dentists, PUBLIC_TENANT).find((d) => String(d.id) === String(dentistId));
    if (!dentist) throw err(400, 'Selected dentist is not available.');
  }
  if (!slotOpen(date, time, dentist ? dentist.id : null)) {
    throw err(409, 'That slot has just been booked. Please pick another time.');
  }
  const pool = sc(db.patients, PUBLIC_TENANT);
  let patient = pool.find((p) => p.phone === normalizedPhone);
  const isNew = !patient;
  if (!patient) {
    patient = {
      id: nextId(), tenantId: PUBLIC_TENANT, name: String(name).slice(0, 80), phone: normalizedPhone,
      email: String(email || '').slice(0, 120),
      age: null, gender: '', lastVisit: date, status: 'Active', notes: String(notes || '').slice(0, 500)
    };
    db.patients.push(patient);
  }
  const appt = {
    id: nextId(), tenantId: PUBLIC_TENANT, patientId: patient.id, dentistId: dentist ? dentist.id : null,
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
  persist();
  return { appointment: clone(appt), patient: clone(patient), isNewPatient: isNew };
}

function publicReview(body) {
  const { name, phone, rating, text } = body;
  if (!name || !rating || !text) {
    throw err(400, 'Name, rating and review text are required.');
  }
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) throw err(400, 'Rating must be between 1 and 5.');
  const review = {
    id: nextId(), tenantId: PUBLIC_TENANT, name: String(name).slice(0, 80),
    phone: phone ? String(phone).slice(0, 15) : '', rating: r, text: String(text).slice(0, 2000),
    source: 'Website', status: 'pending', date: todayISO(), response: '',
    created_date: new Date().toISOString()
  };
  db.reviews.push(review);
  persist();
  return { ok: true, review: clone(review) };
}

function portalLogin(body) {
  const rawPhone = String((body || {}).phone || '').trim();
  const normalizedPhone = normalizePhone(rawPhone);
  const patient = sc(db.patients, PUBLIC_TENANT)
    .find((p) => p.phone === rawPhone || (normalizedPhone && p.phone === normalizedPhone));
  if (!patient) throw err(404, 'No account found with this phone number. Please register.');
  // Clinical notes are internal — do not expose them through the portal.
  const { notes, ...safePatient } = patient;
  return {
    patient: clone(safePatient),
    appointments: sc(db.appointments, PUBLIC_TENANT)
      .filter((a) => a.patientId === patient.id)
      .map((a) => ({ ...a, dentistName: dName(a.dentistId, PUBLIC_TENANT) })),
    treatmentPlans: clone(sc(db.treatmentPlans, PUBLIC_TENANT).filter((tp) => tp.patientId === patient.id)),
    invoices: clone(sc(db.invoices, PUBLIC_TENANT).filter((i) => i.patientId === patient.id)),
    recalls: clone(sc(db.recall || [], PUBLIC_TENANT).filter((r) => String(r.patientId) === String(patient.id) || r.phone === patient.phone))
  };
}

function portalRegister(body) {
  const { name, phone, email, age, gender } = body;
  if (!name || !phone) throw err(400, 'Name and phone are required.');
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw err(400, 'Please enter a valid 10-digit Indian mobile number.');
  if (sc(db.patients, PUBLIC_TENANT).find((p) => p.phone === normalizedPhone)) {
    throw err(409, 'An account already exists with this phone number. Please log in.');
  }
  const patient = {
    id: nextId(), tenantId: PUBLIC_TENANT, name: String(name).slice(0, 80), phone: normalizedPhone,
    email: String(email || '').slice(0, 120),
    age: age === undefined || age === null || age === '' ? null : Number(age) || null,
    gender: gender || '', lastVisit: todayISO(), status: 'Active', notes: ''
  };
  db.patients.push(patient);
  persist();
  return { patient: clone(patient) };
}

function routeGet(path) {
  const [p, q] = path.split('?');
  const params = new URLSearchParams(q || '');
  const parts = p.split('/').filter(Boolean);
  const s = session();

  if (p === '/auth/me') {
    const st = staff();
    return { staff: st.staff, tenant: st.tenant || null, viewTenantId: st.viewTenantId || null };
  }
  if (p === '/dashboard') {
    staff();
    return clone(getDashboard());
  }
  if (p === '/integrations') {
    const st = staff();
    const t = tid();
    if (t === null) {
      // Super admin viewing "all clinics" → return every clinic's connector config
      return clone(
        db.tenants.map((tn) => ({
          id: tn.id,
          name: tn.name,
          integrations: tn.integrations || {}
        }))
      );
    }
    const tn = db.tenants.find((x) => String(x.id) === String(t));
    if (!tn) throw err(404, 'Clinic not found.');
    return clone({ id: tn.id, name: tn.name, integrations: tn.integrations || {} });
  }
  // /settings is ALWAYS the public website (tenant 1) — a logged-in staff session
  // must never change public site content. Staff pages use /settings/mine.
  if (p === '/settings/mine') {
    staff();
    return clone(tenantSettings(tid() ?? PUBLIC_TENANT));
  }
  if (p === '/settings') return clone(tenantSettings(PUBLIC_TENANT));
  if (p === '/tooth-chart') {
    staff();
    return clone(sc(db.toothChartStates || []));
  }
  if (p === '/slots') return getSlots(params);

  if (parts.length === 1 && TABLES.includes(parts[0])) {
    const table = parts[0];
    if (!s || !s.staff) {
      // Unauthenticated: only the public read-view of tenant 1 is exposed.
      if (table === 'reviews') return clone(sc(db.reviews, PUBLIC_TENANT).filter((r) => r.status === 'published'));
      if (PUBLIC_TABLES.has(table)) return clone(sc(db[table], PUBLIC_TENANT));
      throw err(401, 'Please sign in.');
    }
    if (SUPER_TABLES.has(table)) requireSuper();
    if (table === 'staff') return clone(sc(db.staff).map(stripSecrets));
    if (table === 'tenants') return clone(db.tenants);
    return clone(sc(db[table]));
  }

  if (parts.length === 2 && TABLES.includes(parts[0])) {
    staff();
    const list = sc(db[parts[0]]);
    const item = list.find((x) => String(x.id) === parts[1]);
    if (!item) throw err(404, 'Not found');
    return clone(parts[0] === 'staff' ? stripSecrets(item) : item);
  }
  throw err(404, 'Not found: ' + p);
}

function sendWhatsApp(body) {
  const { phone, patientId, text, category = 'utility' } = body || {};
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || typeof text !== 'string' || !text.trim()) throw err(400, 'A valid Indian phone number and message are required.');
  if (text.length > 4096) throw err(400, 'Message is too long.');
  if (!['utility', 'marketing'].includes(category)) throw err(400, 'Invalid message category.');
  const patient = sc(db.patients, PUBLIC_TENANT).find((p) => p.phone === normalizedPhone || (patientId && String(p.id) === String(patientId)));
  const consent = (db.consentLogs || []).find((c) => String(c.tenantId || PUBLIC_TENANT) === String(PUBLIC_TENANT) && patient && String(c.patientId) === String(patient.id) && c.scope === (category === 'utility' ? 'service' : 'marketing'));
  if (!consent) throw err(403, `No ${category} consent is on file for this number.`);
  db.whatsappMessages = db.whatsappMessages || [];
  const message = { id: nextId(), tenantId: PUBLIC_TENANT, patientId: patient?.id || null, phone: patient?.phone || normalizedPhone, direction: 'out', category, text: text.trim(), consentId: consent.id, status: 'simulated', createdAt: new Date().toISOString() };
  db.whatsappMessages.push(message); persist();
  return { message: clone(message), simulated: true };
}

function routePost(path, body) {
  if (path === '/auth/login') return login(body);
  if (path === '/auth/logout') return { ok: true };
  if (path === '/bookings') return createBooking(body);
  if (path === '/reviews/public') return publicReview(body);
  if (path === '/portal/login') return portalLogin(body);
  if (path === '/whatsapp/send') return sendWhatsApp(body);
  if (path === '/portal/register') return portalRegister(body);

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 1 && TABLES.includes(parts[0])) {
    const st = staff();
    if (SUPER_TABLES.has(parts[0])) requireSuper();
    if (TENANT_TABLES.has(parts[0]) && tid() === null) {
      throw err(400, 'Pick a clinic first.');
    }
    const allowTenantId = st.staff.role === 'super';
    const item = {
      id: nextId(), created_date: new Date().toISOString(),
      ...(TENANT_TABLES.has(parts[0]) ? { tenantId: tid() || PUBLIC_TENANT } : {}),
      ...sanitizeBody(body, { allowTenantId })
    };
    db[parts[0]].push(item);
    persist();
    return clone(parts[0] === 'staff' ? stripSecrets(item) : item);
  }
  throw err(404, 'Not found: ' + path);
}

function routePut(path, body) {
  const parts = path.split('/').filter(Boolean);

  if (path === '/settings') {
    staff();
    const t = tid() ?? PUBLIC_TENANT;
    if (String(t) === String(PUBLIC_TENANT)) {
      // Tenant 1 owns the public website — update global settings
      db.settings = { ...db.settings, ...(body || {}) };
    } else {
      const tn = db.tenants.find((x) => String(x.id) === String(t));
      if (!tn) throw err(404, 'Clinic not found.');
      tn.settings = { ...(tn.settings || db.settings), ...(body || {}) };
    }
    persist();
    return clone(tenantSettings(t));
  }
  if (parts.length === 2 && parts[0] === 'tooth-chart') {
    staff();
    const tooth = Number(parts[1]);
    const state = (body || {}).state;
    const q = Math.floor(tooth / 10); const u = tooth % 10;
    if (!Number.isInteger(tooth) || q < 1 || q > 8 || u < 1 || u > 8) throw err(400, 'Invalid tooth number.');
    if (!TOOTH_STATES.has(state)) throw err(400, 'Invalid tooth state.');
    db.toothChartStates = db.toothChartStates || [];
    const scoped = sc(db.toothChartStates);
    const existing = scoped.find((t) => t.tooth === tooth);
    if (existing) existing.state = (body || {}).state;
    else db.toothChartStates.push({ tenantId: tid() || PUBLIC_TENANT, tooth: Number(parts[1]), state: (body || {}).state });
    persist();
    return clone(sc(db.toothChartStates));
  }
  if (path === '/integrations') {
    const st = staff();
    const { tenantId, key, config, disconnect } = body || {};
    if (!key) throw err(400, 'Missing connector key.');
    const targetId = tenantId !== undefined ? tenantId : tid();
    if (targetId === null) throw err(400, 'Pick a clinic first.');
    // Super may configure any clinic; clinic admins only their own.
    if (st.staff.role !== 'super' && String(st.staff.tenantId) !== String(targetId)) {
      throw err(403, 'You can only configure connectors for your own clinic.');
    }
    const tn = db.tenants.find((x) => String(x.id) === String(targetId));
    if (!tn) throw err(404, 'Clinic not found.');
    tn.integrations = tn.integrations || {};
    if (disconnect) delete tn.integrations[key];
    else tn.integrations[key] = { status: 'configured', config: config || {}, connectedAt: todayISO() };
    persist();
    return clone({ ok: true, integrations: tn.integrations });
  }

  if (parts.length === 2 && TABLES.includes(parts[0])) {
    staff();
    if (parts[0] === 'staff') requireSuper();
    // Mutate the ORIGINAL array (a tenant-scoped view is a filtered copy),
    // but first verify the record belongs to the active clinic.
    const arr = db[parts[0]];
    const i = arr.findIndex((x) => String(x.id) === parts[1]);
    if (i < 0) throw err(404, 'Not found');
    const t = tid();
    if (t !== null && String(arr[i].tenantId || PUBLIC_TENANT) !== String(t)) {
      throw err(403, 'This record belongs to another clinic.');
    }
    const st = staff();
    const patch = sanitizeBody(body, { allowTenantId: st.staff.role === 'super' });
    if (parts[0] === 'invoices' && patch.amount !== undefined) {
      const amt = Number(patch.amount);
      if (!Number.isFinite(amt) || amt < 0) throw err(400, 'Invalid invoice amount.');
      patch.amount = amt;
    }
    arr[i] = { ...arr[i], ...patch };
    persist();
    return clone(parts[0] === 'staff' ? stripSecrets(arr[i]) : arr[i]);
  }
  throw err(404, 'Not found: ' + path);
}

function routeDel(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 2 && TABLES.includes(parts[0])) {
    staff();
    if (parts[0] === 'staff') requireSuper();
    const full = db[parts[0]];
    const i = full.findIndex((x) => String(x.id) === parts[1]);
    if (i < 0) throw err(404, 'Not found');
    const item = full[i];
    const t = tid();
    if (t !== null && String(item.tenantId || PUBLIC_TENANT) !== String(t)) {
      throw err(403, 'This record belongs to another clinic.');
    }
    full.splice(i, 1);
    persist();
    return { ok: true };
  }
  throw err(404, 'Not found: ' + path);
}

const latency = () => new Promise((r) => setTimeout(r, 120));

export const apiDemo = {
  get: async (path) => { await latency(); return routeGet(path); },
  post: async (path, body) => { await latency(); return routePost(path, body); },
  put: async (path, body) => { await latency(); return routePut(path, body); },
  del: async (path) => { await latency(); return routeDel(path); },
  resetDemo
};
