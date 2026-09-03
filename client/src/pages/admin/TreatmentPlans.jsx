import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Select,
  Modal,
  PageHeader,
  Avatar,
  EmptyState,
  statusVariant
} from '../../components/ui';
import { formatINR } from '../../lib/utils';
import { Plus, Trash2 } from 'lucide-react';

export default function TreatmentPlans() {
  const [plans, setPlans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [patientId, setPatientId] = useState('');
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState('Proposed');
  const [teethStr, setTeethStr] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, patientsData] = await Promise.all([
        api.get('/treatmentPlans'),
        api.get('/patients')
      ]);
      setPlans(plansData || []);
      setPatients(patientsData || []);
    } catch (err) {
      console.error('Failed to load treatment plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewModal = () => {
    if (patients.length > 0) {
      setPatientId(String(patients[0].id));
    } else {
      setPatientId('');
    }
    setTitle('');
    setCost('');
    setStatus('Proposed');
    setTeethStr('');
    setNotes('');
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !patientId) return;

    const teeth = teethStr
      ? teethStr.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
      : [];

    try {
      await api.post('/treatmentPlans', {
        patientId: Number(patientId),
        title,
        cost: Number(cost) || 0,
        status,
        teeth,
        notes
      });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create treatment plan:', err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/treatmentPlans/${id}`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/treatmentPlans/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete treatment plan:', err);
    }
  };

  const getPatientName = (pId) => {
    const p = patients.find((x) => x.id === Number(pId));
    return p ? p.name : 'Unknown Patient';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treatment Plans"
        subtitle={`${plans.length} plans`}
        actions={
          <Button onClick={openNewModal}>
            <Plus className="h-4 w-4" />
            New Plan
          </Button>
        }
      />

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : plans.length === 0 ? (
        <EmptyState title="No treatment plans" subtitle="Create a new treatment plan to get started." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">Patient</th>
                  <th className="p-4 font-medium">Title</th>
                  <th className="p-4 font-medium">Teeth</th>
                  <th className="p-4 font-medium">Cost</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Notes</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const patientName = getPatientName(plan.patientId);
                  return (
                    <tr key={plan.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar name={patientName} className="h-8 w-8 text-xs" />
                          <span>{patientName}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{plan.title}</td>
                      <td className="p-4">
                        {Array.isArray(plan.teeth) && plan.teeth.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {plan.teeth.map((t) => (
                              <span
                                key={t}
                                className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-semibold text-foreground"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold">{formatINR(plan.cost)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant(plan.status)}>{plan.status}</Badge>
                          <Select
                            className="h-8 w-32 text-xs"
                            value={plan.status}
                            onChange={(e) => handleStatusChange(plan.id, e.target.value)}
                          >
                            <option value="Proposed">Proposed</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </Select>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs truncate text-muted-foreground">
                        {plan.notes || '—'}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(plan.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Treatment Plan"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save Plan</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Patient</label>
            <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Multiple caries requiring fillings"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cost (₹)</label>
            <Input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="6000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Proposed">Proposed</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Teeth (comma-separated)</label>
            <Input
              value={teethStr}
              onChange={(e) => setTeethStr(e.target.value)}
              placeholder="14, 15, 26"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details, sittings, instructions..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
