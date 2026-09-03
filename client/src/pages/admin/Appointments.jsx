import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  Select,
  Modal,
  PageHeader,
  Avatar,
  EmptyState,
  statusVariant
} from '../../components/ui';
import { formatDate, formatINR, todayISO } from '../../lib/utils';
import { Plus, Calendar, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = ['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No-Show'];
const TIME_SLOTS = ['09:00', '09:45', '10:30', '11:15', '12:00', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45'];

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    dentistId: '',
    date: todayISO(),
    time: '09:00',
    type: 'checkup',
    procedure: 'Root Canal',
    fee: 5000,
    status: 'Scheduled'
  });

  const fetchData = async () => {
    try {
      const [apptsData, ptsData, dentsData] = await Promise.all([
        api.get('/appointments'),
        api.get('/patients'),
        api.get('/dentists')
      ]);
      setAppointments(apptsData || []);
      setPatients(ptsData || []);
      setDentists(dentsData || []);

      if (ptsData && ptsData.length > 0 && !form.patientId) {
        setForm((f) => ({ ...f, patientId: String(ptsData[0].id) }));
      }
      if (dentsData && dentsData.length > 0 && !form.dentistId) {
        setForm((f) => ({ ...f, dentistId: String(dentsData[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load appointments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewModal = () => {
    setForm({
      patientId: patients.length > 0 ? String(patients[0].id) : '',
      dentistId: dentists.length > 0 ? String(dentists[0].id) : '',
      date: todayISO(),
      time: '09:00',
      type: 'checkup',
      procedure: '',
      fee: 2000,
      status: 'Scheduled'
    });
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/appointments', {
        patientId: Number(form.patientId),
        dentistId: form.dentistId ? Number(form.dentistId) : null,
        date: form.date,
        time: form.time,
        type: form.type || 'checkup',
        procedure: form.procedure || 'Consultation',
        fee: Number(form.fee || 0),
        status: form.status
      });

      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create appointment:', err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/appointments/${id}`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel and delete this appointment?')) return;
    try {
      await api.del(`/appointments/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete appointment:', err);
    }
  };

  // Helper lookups
  const getPatient = (pId) => patients.find((p) => p.id === Number(pId));
  const getDentistName = (dId) => {
    const d = dentists.find((x) => x.id === Number(dId));
    return d ? d.name : '—';
  };

  // Group appointments by date (sorted desc)
  const groupedByDate = appointments.reduce((acc, appt) => {
    const d = appt.date || 'Unscheduled';
    if (!acc[d]) acc[d] = [];
    acc[d].push(appt);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return <div className="text-muted-foreground p-6">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle={`${appointments.length} appointments • ${formatDate(todayISO())}`}
        actions={
          <Button variant="primary" onClick={openNewModal}>
            <Plus className="h-4 w-4 mr-1" /> New Appointment
          </Button>
        }
      />

      {sortedDates.length === 0 ? (
        <Card p-6>
          <EmptyState
            title="No appointments found"
            subtitle="Click 'New Appointment' to schedule one."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const groupAppts = groupedByDate[dateStr].sort((a, b) =>
              (a.time || '').localeCompare(b.time || '')
            );

            return (
              <Card key={dateStr}>
                <CardHeader className="bg-muted/30 border-b py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {formatDate(dateStr)} — {groupAppts.length} appointment
                    {groupAppts.length > 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {groupAppts.map((a) => {
                      const patient = getPatient(a.patientId);
                      const patientName = a.patientName || (patient ? patient.name : `Patient #${a.patientId}`);
                      const dentistName = a.dentistName || getDentistName(a.dentistId);

                      return (
                        <div
                          key={a.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-4">
                            <span className="w-16 font-bold text-base text-foreground shrink-0 pt-1 sm:pt-0">
                              {a.time}
                            </span>
                            <div className="flex items-center gap-3">
                              <Avatar name={patientName} />
                              <div>
                                <div className="font-semibold text-sm text-foreground">
                                  {patientName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {dentistName} • {a.type || 'checkup'} • {a.procedure}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 pl-20 sm:pl-0">
                            <span className="font-semibold text-sm text-foreground shrink-0">
                              {formatINR(a.fee)}
                            </span>
                            <div className="w-36">
                              <Select
                                value={a.status}
                                onChange={(e) => handleStatusChange(a.id, e.target.value)}
                                className="h-8 text-xs"
                              >
                                {STATUS_OPTIONS.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                              onClick={() => handleDelete(a.id)}
                              title="Delete appointment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Appointment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule New Appointment"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Book Appointment
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Patient *</label>
            <Select
              required
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dentist *</label>
            <Select
              required
              value={form.dentistId}
              onChange={(e) => setForm({ ...form, dentistId: e.target.value })}
            >
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialty}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <Input
                type="date"
                min={todayISO()}
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time Slot *</label>
              <Select
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Appointment Type</label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="checkup">Checkup</option>
                <option value="cleaning">Cleaning</option>
                <option value="treatment">Treatment</option>
                <option value="consultation">Consultation</option>
                <option value="surgery">Surgery</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Procedure Name *</label>
              <Input
                required
                value={form.procedure}
                onChange={(e) => setForm({ ...form, procedure: e.target.value })}
                placeholder="e.g. Scaling & Polishing"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fee (₹)</label>
              <Input
                type="number"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                placeholder="2000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Initial Status</label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
