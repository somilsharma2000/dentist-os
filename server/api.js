const express = require('express');
const { load, save, get } = require('./db');
const { seed } = require('./seed');

load(seed);

const router = express.Router();
const db = get();

const TABLES = [
  'patients', 'dentists', 'appointments', 'treatmentPlans', 'invoices', 'leads', 'reviews',
  'tasks', 'inventory', 'automations', 'recall', 'socialPosts', 'clients', 'whatsappChats', 'qrCodes'
];

function nextId() {
  db.nextId = (db.nextId || 1000) + 1;
  return db.nextId;
}

function istToday() {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  return ist.toISOString().slice(0, 10);
}

// ---- Generic CRUD ----
TABLES.forEach((t) => {
  router.get('/' + t, (req, res) => res.json(db[t]));
  router.post('/' + t, (req, res) => {
    const item = { id: nextId(), created_date: new Date().toISOString(), ...req.body };
    db[t].push(item);
    save();
    res.json(item);
  });
  router.put('/' + t + '/:id', (req, res) => {
    const i = db[t].findIndex((x) => String(x.id) === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Not found' });
    db[t][i] = { ...db[t][i], ...req.body };
    save();
    res.json(db[t][i]);
  });
  router.delete('/' + t + '/:id', (req, res) => {
    const i = db[t].findIndex((x) => String(x.id) === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Not found' });
    db[t].splice(i, 1);
    save();
    res.json({ ok: true });
  });
});

// ---- Settings ----
router.get('/settings', (req, res) => res.json(db.settings));
router.put('/settings', (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  save();
  res.json(db.settings);
});

// ---- Dashboard ----
router.get('/dashboard', (req, res) => {
  const today = istToday();
  const month = today.slice(0, 7);
  const pName = (id) => { const p = db.patients.find((x) => x.id === Number(id)); return p ? p.name : 'Unknown'; };
  const dName = (id) => { const d = db.dentists.find((x) => x.id === Number(id)); return d ? d.name : '—'; };

  const appointmentsToday = db.appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((a) => ({ ...a, patientName: pName(a.patientId), dentistName: dName(a.dentistId) }));

  const revenueThisMonth = db.invoices
    .filter((i) => i.status === 'Paid' && String(i.date).startsWith(month))
    .reduce((s, i) => s + (i.amount || 0), 0);

  const pendingInvoices = db.invoices.filter((i) => i.status === 'Pending');
  const pendingInvoicesAmount = pendingInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  const dailySummary = {
    date: today,
    revenueToday: db.invoices
      .filter((i) => i.status === 'Paid' && i.date === today)
      .reduce((s, i) => s + (i.amount || 0), 0),
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
  db.invoices
    .filter((i) => i.status === 'Paid')
    .forEach((i) => { if (trend[i.date.slice(0, 7)] !== undefined) trend[i.date.slice(0, 7)] += i.amount || 0; });
  const revenueTrend = Object.entries(trend).map(([m, total]) => ({
    month: new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' }),
    total
  }));

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const newLeads = db.leads.filter((l) => (l.created_date || '') >= weekAgo);
  const converted = db.leads.filter((l) => l.status === 'Converted').length;

  res.json({
    today,
    appointmentsToday,
    todayCount: appointmentsToday.length,
    revenueThisMonth,
    activePatients: db.patients.filter((p) => p.status === 'Active').length,
    totalPatients: db.patients.length,
    pendingInvoicesCount: pendingInvoices.length,
    pendingInvoicesAmount,
    dailySummary,
    goals,
    leadPipeline: {
      newThisWeek: newLeads.length,
      conversionRate: db.leads.length ? Math.round((converted / db.leads.length) * 100) : 0,
      top: [...db.leads].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)
    },
    tasks: db.tasks.filter((t) => t.status === 'pending'),
    revenueTrend,
    recentPatients: [...db.patients].sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || '')).slice(0, 5),
    pendingTreatmentPlans: db.treatmentPlans
      .filter((tp) => tp.status !== 'Completed')
      .map((tp) => ({ ...tp, patientName: pName(tp.patientId) })),
    lowStock: db.inventory.filter((i) => i.quantity <= i.minStock)
  });
});

// ---- Public: booking wizard ----
router.post('/bookings', (req, res) => {
  const { service, dentistId, date, time, name, phone, email, notes } = req.body;
  if (!name || !phone || !date || !time || !service) {
    return res.status(400).json({ error: 'Missing required booking details.' });
  }
  let patient = db.patients.find((p) => p.phone === String(phone).trim());
  const isNew = !patient;
  if (!patient) {
    patient = { id: nextId(), name, phone: String(phone).trim(), email: email || '', age: null, gender: '', lastVisit: date, status: 'Active', notes: notes || '' };
    db.patients.push(patient);
  }
  const appt = {
    id: nextId(), patientId: patient.id, dentistId: dentistId ? Number(dentistId) : null,
    date, time, type: 'checkup', procedure: service, fee: 0, status: 'Scheduled'
  };
  db.appointments.push(appt);
  save();
  res.json({ appointment: appt, patient, isNewPatient: isNew });
});

// ---- Public: review submit (goes to moderation) ----
router.post('/reviews/public', (req, res) => {
  const { name, phone, rating, text } = req.body;
  if (!name || !rating || !text) {
    return res.status(400).json({ error: 'Name, rating and review text are required.' });
  }
  const review = {
    id: nextId(), name, phone: phone || '', rating: Number(rating), text,
    source: 'Website', status: 'pending', date: istToday(), response: '', created_date: new Date().toISOString()
  };
  db.reviews.push(review);
  save();
  res.json({ ok: true, review });
});

// ---- Patient portal (phone login) ----
router.post('/portal/login', (req, res) => {
  const { phone } = req.body;
  const patient = db.patients.find((p) => p.phone === String(phone || '').trim());
  if (!patient) return res.status(404).json({ error: 'No account found with this phone number. Please register.' });
  const appointments = db.appointments
    .filter((a) => a.patientId === patient.id)
    .map((a) => ({ ...a, dentistName: dNameSafe(a.dentistId) }));
  const plans = db.treatmentPlans.filter((tp) => tp.patientId === patient.id);
  const invoices = db.invoices.filter((i) => i.patientId === patient.id);
  res.json({ patient, appointments, treatmentPlans: plans, invoices });
});

router.post('/portal/register', (req, res) => {
  const { name, phone, email, age, gender } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });
  if (db.patients.find((p) => p.phone === String(phone).trim())) {
    return res.status(409).json({ error: 'An account already exists with this phone number. Please log in.' });
  }
  const patient = {
    id: nextId(), name, phone: String(phone).trim(), email: email || '', age: age || null,
    gender: gender || '', lastVisit: istToday(), status: 'Active', notes: ''
  };
  db.patients.push(patient);
  save();
  res.json({ patient });
});

function dNameSafe(id) {
  const d = db.dentists.find((x) => x.id === Number(id));
  return d ? d.name : '—';
}

// ---- Tooth chart states ----
router.get('/tooth-chart', (req, res) => res.json(db.toothChartStates || []));
router.put('/tooth-chart/:tooth', (req, res) => {
  db.toothChartStates = db.toothChartStates || [];
  const i = db.toothChartStates.findIndex((t) => t.tooth === Number(req.params.tooth));
  if (i >= 0) db.toothChartStates[i].state = req.body.state;
  else db.toothChartStates.push({ tooth: Number(req.params.tooth), state: req.body.state });
  save();
  res.json(db.toothChartStates);
});

// ---- Slot availability ----
router.get('/slots', (req, res) => {
  const { date, dentistId } = req.query;
  const booked = db.appointments
    .filter((a) => a.date === date && (!dentistId || String(a.dentistId) === String(dentistId)))
    .map((a) => a.time);
  const all = ['09:00', '09:45', '10:30', '11:15', '12:00', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45'];
  res.json(all.map((t) => ({ time: t, available: !booked.includes(t) })));
});

module.exports = { router };
