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

function todayISO() {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  return ist.toISOString().slice(0, 10);
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
  return arr.filter((x) => !x.tenantId || String(x.tenantId) === String(active));
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
  if (!user || user.password !== password) throw err(401, 'Invalid email or password.');
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
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((a) => ({ ...a, patientName: pName(a.patientId, t), dentistName: dName(a.dentistId, t) }));

  const revenueThisMonth = S(db.invoices)
    .filter((i) => i.status === 'Paid' && String(i.date).startsWith(month))
    .reduce((s, i) => s + (i.amount || 0), 0);

  const pendingInvoices = S(db.invoices).filter((i) => i.status === 'Pending');

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
    .forEach((i) => {
      if (trend[i.date.slice(0, 7)] !== undefined) trend[i.date.slice(0, 7)] += i.amount || 0;
    });
  const revenueTrend = Object.entries(trend).map(([m, total]) => ({
    month: new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' }),
    total
  }));

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
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
        .filter((i) => i.status === 'Paid' && i.date === today)
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
  const booked = sc(db.appointments, PUBLIC_TENANT)
    .filter((a) => a.date === date && (!dentistId || String(a.dentistId) === String(dentistId)))
    .map((a) => a.time);
  const all = ['09:00', '09:45', '10:30', '11:15', '12:00', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45'];
  return all.map((t) => ({ time: t, available: !booked.includes(t) }));
}

function createBooking(body) {
  const { service, dentistId, date, time, name, phone, email, notes } = body;
  if (!name || !phone || !date || !time || !service) {
    throw err(400, 'Missing required booking details.');
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
  persist();
  return { appointment: clone(appt), patient: clone(patient), isNewPatient: isNew };
}

function publicReview(body) {
  const { name, phone, rating, text } = body;
  if (!name || !rating || !text) {
    throw err(400, 'Name, rating and review text are required.');
  }
  const review = {
    id: nextId(), tenantId: PUBLIC_TENANT, name, phone: phone || '', rating: Number(rating), text,
    source: 'Website', status: 'pending', date: todayISO(), response: '',
    created_date: new Date().toISOString()
  };
  db.reviews.push(review);
  persist();
  return { ok: true, review: clone(review) };
}

function portalLogin(body) {
  const patient = sc(db.patients, PUBLIC_TENANT)
    .find((p) => p.phone === String((body || {}).phone || '').trim());
  if (!patient) throw err(404, 'No account found with this phone number. Please register.');
  return {
    patient: clone(patient),
    appointments: sc(db.appointments, PUBLIC_TENANT)
      .filter((a) => a.patientId === patient.id)
      .map((a) => ({ ...a, dentistName: dName(a.dentistId, PUBLIC_TENANT) })),
    treatmentPlans: clone(sc(db.treatmentPlans, PUBLIC_TENANT).filter((tp) => tp.patientId === patient.id)),
    invoices: clone(sc(db.invoices, PUBLIC_TENANT).filter((i) => i.patientId === patient.id))
  };
}

function portalRegister(body) {
  const { name, phone, email, age, gender } = body;
  if (!name || !phone) throw err(400, 'Name and phone are required.');
  if (sc(db.patients, PUBLIC_TENANT).find((p) => p.phone === String(phone).trim())) {
    throw err(409, 'An account already exists with this phone number. Please log in.');
  }
  const patient = {
    id: nextId(), tenantId: PUBLIC_TENANT, name, phone: String(phone).trim(), email: email || '',
    age: age || null, gender: gender || '', lastVisit: todayISO(), status: 'Active', notes: ''
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
  if (p === '/settings') return clone(db.settings); // public site content (tenant 1)
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

function routePost(path, body) {
  if (path === '/auth/login') return login(body);
  if (path === '/auth/logout') return { ok: true };
  if (path === '/bookings') return createBooking(body);
  if (path === '/reviews/public') return publicReview(body);
  if (path === '/portal/login') return portalLogin(body);
  if (path === '/portal/register') return portalRegister(body);

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 1 && TABLES.includes(parts[0])) {
    staff();
    const item = {
      id: nextId(), created_date: new Date().toISOString(),
      ...(TENANT_TABLES.has(parts[0]) && tid() ? { tenantId: tid() } : {}),
      ...(tid() === null && TENANT_TABLES.has(parts[0]) ? { tenantId: PUBLIC_TENANT } : {}),
      ...(body || {})
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
    db.settings = { ...db.settings, ...(body || {}) };
    persist();
    return clone(db.settings);
  }
  if (parts.length === 2 && parts[0] === 'tooth-chart') {
    staff();
    db.toothChartStates = db.toothChartStates || [];
    const scoped = sc(db.toothChartStates);
    const existing = scoped.find((t) => t.tooth === Number(parts[1]));
    if (existing) existing.state = (body || {}).state;
    else db.toothChartStates.push({ tenantId: tid() || PUBLIC_TENANT, tooth: Number(parts[1]), state: (body || {}).state });
    persist();
    return clone(sc(db.toothChartStates));
  }
  if (parts.length === 2 && TABLES.includes(parts[0])) {
    staff();
    if (parts[0] === 'staff') requireSuper();
    const arr = parts[0] === 'tenants' ? db.tenants : sc(db[parts[0]]);
    const i = arr.findIndex((x) => String(x.id) === parts[1]);
    if (i < 0) throw err(404, 'Not found');
    arr[i] = { ...arr[i], ...(body || {}) };
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
    if (t !== null && item.tenantId && String(item.tenantId) !== String(t)) {
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
