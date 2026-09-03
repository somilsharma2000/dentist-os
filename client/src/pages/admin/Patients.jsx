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
import { formatDate, todayISO } from '../../lib/utils';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male',
    status: 'Active',
    notes: ''
  });

  const fetchPatients = async () => {
    try {
      const data = await api.get('/patients');
      setPatients(data || []);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const openAddModal = () => {
    setEditingPatient(null);
    setForm({
      name: '',
      phone: '',
      email: '',
      age: '',
      gender: 'Male',
      status: 'Active',
      notes: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (patient) => {
    setEditingPatient(patient);
    setForm({
      name: patient.name || '',
      phone: patient.phone || '',
      email: patient.email || '',
      age: patient.age ?? '',
      gender: patient.gender || 'Male',
      status: patient.status || 'Active',
      notes: patient.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        status: form.status,
        notes: form.notes
      };

      if (editingPatient) {
        await api.put(`/patients/${editingPatient.id}`, payload);
      } else {
        await api.post('/patients', {
          ...payload,
          lastVisit: todayISO()
        });
      }

      setModalOpen(false);
      fetchPatients();
    } catch (err) {
      console.error('Failed to save patient:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;
    try {
      await api.del(`/patients/${id}`);
      fetchPatients();
    } catch (err) {
      console.error('Failed to delete patient:', err);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="text-muted-foreground p-6">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} total`}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone…"
                className="w-64 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="primary" onClick={openAddModal}>
              <Plus className="h-4 w-4 mr-1" /> Add Patient
            </Button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex border-b">
        {['All', 'Active', 'Inactive'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Patients Table */}
      <Card>
        {filteredPatients.length === 0 ? (
          <EmptyState
            title="No patients found"
            subtitle={search ? 'Try adjusting your search criteria' : 'Click "Add Patient" to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 font-medium">Patient</th>
                  <th className="py-3 px-4 font-medium">Phone</th>
                  <th className="py-3 px-4 font-medium">Age</th>
                  <th className="py-3 px-4 font-medium">Last Visit</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <div>
                          <div className="font-semibold text-foreground">{p.name}</div>
                          {p.email && <div className="text-xs text-muted-foreground">{p.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{p.phone}</td>
                    <td className="py-3 px-4">{p.age ?? '—'}</td>
                    <td className="py-3 px-4">{formatDate(p.lastVisit)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(p)}
                          title="Edit patient"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(p.id)}
                          title="Delete patient"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Patient Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPatient ? 'Edit Patient' : 'Add Patient'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingPatient ? 'Save Changes' : 'Create Patient'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number *</label>
            <Input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="rahul@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Age</label>
              <Input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="28"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <Select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Medical Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Allergies, medical history, special instructions…"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
