// In-browser demo API — mirrors server/api.js exactly (used for the GitHub Pages
// static deployment, where there is no backend). Data persists in localStorage.
import dbSeed from './demoData.json';

const LS_KEY = 'dentos-demo-db-v1';

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

const TABLES = [
  'patients', 'dentists', 'appointments', 'treatmentPlans', 'invoices', 'leads', 'reviews',
  'tasks', 'inventory', 'automations', 'recall', 'socialPosts', 'clients', 'whatsappChats', 'qrCodes'
];

function pName(id) {
  const p = db.patients.find((x) => x.id === Number(id));
  return p ? p.name : 'Unknown';
}

function dName(id) {
  const d = db.dentists.find((x) => x.id === Number(id));
  return d ? d.name : '—';
}

function getDashboard() {
  const today = todayISO();
  const month = today.slice(0, 7);

  const appointmentsToday = db.appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((a) => ({ ...a, patientName: pName(a.patientId), dentistName: dName(a.dentistId) }));

  const revenueThisMonth = db.invoices
    .filter((i) => i.status === 'Paid' && String(i.date).startsWith(month))
    .reduce((s, i) => s + (i.amount || 0), 0);

  const pendingInvoices = db.invoices.filter((i) => i.status === 'Pending');

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
  db.invoices
    .filter((i) => i.status === 'Paid')
    .forEach((i) => {
      if (trend[i.date.slice(0, 7)] !== undefined) trend[i.date.slice(0, 7)] += i.amount || 0;
    });
  const revenueTrend = Object.entries(trend).map(([m, total]) => ({
    month: new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' }),
    total
  }));

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const newLeads = db.leads.filter((l) => (l.created_date || '') >= weekAgo);
  const converted = db.leads.filter((l) => l.status === 'Converted').length;

  return {
    today,
    appointmentsToday,
    todayCount: appointmentsToday.length,
    revenueThisMonth,
    activePatients: db.patients.filter((p) => p.status === 'Active').length,
    totalPatients: db.patients.length,
    pendingInvoicesCount: pendingInvoices.length,
    pendingInvoicesAmount: pendingInvoices.reduce((s, i) => s + (i.amount || 0), 0),
    dailySummary: {
      date: today,
      revenueToday: db.invoices
        .filter((i) => i.status === 'Paid' && i.date === today)
        .reduce((s, i) => s + (i.amount || 0), 0),
      completedVisits: appointmentsToday.filter((a) => a.status === 'Completed').length,
      appointmentsToday: appointmentsToday.length
    },
    goals,
    leadPipeline: {
      newThisWeek: newLeads.length,
      conversionRate: db.leads.length ? Math.round((converted / db.leads.length) * 100) : 0,
      top: [...db.leads].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)
    },
    tasks: db.tasks.filter((t) => t.status === 'pending'),
    revenueTrend,
    recentPatients: [...db.patients]
      .sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''))
      .slice(0, 5),
    pendingTreatmentPlans: db.treatmentPlans
      .filter((tp) => tp.status !== 'Completed')
      .map((tp) => ({ ...tp, patientName: pName(tp.patientId) })),
    lowStock: db.inventory.filter((i) => i.quantity <= i.minStock)
  };
}

function getSlots(params) {
  const date = params.get('date');
  const dentistId = params.get('dentistId');
  const booked = db.appointments
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
  let patient = db.patients.find((p) => p.phone === String(phone).trim());
  const isNew = !patient;
  if (!patient) {
    patient = {
      id: nextId(), name, phone: String(phone).trim(), email: email || '', age: null,
      gender: '', lastVisit: date, status: 'Active', notes: notes || ''
    };
    db.patients.push(patient);
  }
  const appt = {
    id: nextId(), patientId: patient.id, dentistId: dentistId ? Number(dentistId) : null,
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
    id: nextId(), name, phone: phone || '', rating: Number(rating), text,
    source: 'Website', status: 'pending', date: todayISO(), response: '',
    created_date: new Date().toISOString()
  };
  db.reviews.push(review);
  persist();
  return { ok: true, review: clone(review) };
}

function portalLogin(body) {
  const patient = db.patients.find((p) => p.phone === String((body || {}).phone || '').trim());
  if (!patient) throw err(404, 'No account found with this phone number. Please register.');
  return {
    patient: clone(patient),
    appointments: db.appointments
      .filter((a) => a.patientId === patient.id)
      .map((a) => ({ ...a, dentistName: dName(a.dentistId) })),
    treatmentPlans: clone(db.treatmentPlans.filter((tp) => tp.patientId === patient.id)),
    invoices: clone(db.invoices.filter((i) => i.patientId === patient.id))
  };
}

function portalRegister(body) {
  const { name, phone, email, age, gender } = body;
  if (!name || !phone) throw err(400, 'Name and phone are required.');
  if (db.patients.find((p) => p.phone === String(phone).trim())) {
    throw err(409, 'An account already exists with this phone number. Please log in.');
  }
  const patient = {
    id: nextId(), name, phone: String(phone).trim(), email: email || '', age: age || null,
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

  if (p === '/dashboard') return clone(getDashboard());
  if (p === '/settings') return clone(db.settings);
  if (p === '/tooth-chart') return clone(db.toothChartStates || []);
  if (p === '/slots') return getSlots(params);

  if (parts.length === 1 && TABLES.includes(parts[0])) return clone(db[parts[0]]);
  if (parts.length === 2 && TABLES.includes(parts[0])) {
    const item = db[parts[0]].find((x) => String(x.id) === parts[1]);
    if (!item) throw err(404, 'Not found');
    return clone(item);
  }
  throw err(404, 'Not found: ' + p);
}

function routePost(path, body) {
  if (path === '/bookings') return createBooking(body);
  if (path === '/reviews/public') return publicReview(body);
  if (path === '/portal/login') return portalLogin(body);
  if (path === '/portal/register') return portalRegister(body);

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 1 && TABLES.includes(parts[0])) {
    const item = { id: nextId(), created_date: new Date().toISOString(), ...(body || {}) };
    db[parts[0]].push(item);
    persist();
    return clone(item);
  }
  throw err(404, 'Not found: ' + path);
}

function routePut(path, body) {
  const parts = path.split('/').filter(Boolean);

  if (path === '/settings') {
    db.settings = { ...db.settings, ...(body || {}) };
    persist();
    return clone(db.settings);
  }
  if (parts.length === 2 && parts[0] === 'tooth-chart') {
    db.toothChartStates = db.toothChartStates || [];
    const i = db.toothChartStates.findIndex((t) => t.tooth === Number(parts[1]));
    if (i >= 0) db.toothChartStates[i].state = (body || {}).state;
    else db.toothChartStates.push({ tooth: Number(parts[1]), state: (body || {}).state });
    persist();
    return clone(db.toothChartStates);
  }
  if (parts.length === 2 && TABLES.includes(parts[0])) {
    const arr = db[parts[0]];
    const i = arr.findIndex((x) => String(x.id) === parts[1]);
    if (i < 0) throw err(404, 'Not found');
    arr[i] = { ...arr[i], ...(body || {}) };
    persist();
    return clone(arr[i]);
  }
  throw err(404, 'Not found: ' + path);
}

function routeDel(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 2 && TABLES.includes(parts[0])) {
    const arr = db[parts[0]];
    const i = arr.findIndex((x) => String(x.id) === parts[1]);
    if (i < 0) throw err(404, 'Not found');
    arr.splice(i, 1);
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
