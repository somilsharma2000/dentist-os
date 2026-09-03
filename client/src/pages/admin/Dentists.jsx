import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Modal,
  PageHeader,
  Avatar,
  StarRating,
  EmptyState
} from '../../components/ui';
import { Plus, Clock, Pencil, Trash2 } from 'lucide-react';

export default function Dentists() {
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDentist, setEditingDentist] = useState(null);
  const [form, setForm] = useState({
    name: '',
    specialty: '',
    days: '',
    bio: '',
    rating: 5
  });

  const fetchDentists = async () => {
    try {
      const data = await api.get('/dentists');
      setDentists(data || []);
    } catch (err) {
      console.error('Failed to load dentists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDentists();
  }, []);

  const openAddModal = () => {
    setEditingDentist(null);
    setForm({
      name: '',
      specialty: '',
      days: 'Mon - Fri, 9:00 AM - 5:00 PM',
      bio: '',
      rating: 5
    });
    setModalOpen(true);
  };

  const openEditModal = (dentist) => {
    setEditingDentist(dentist);
    setForm({
      name: dentist.name || '',
      specialty: dentist.specialty || '',
      days: dentist.days || '',
      bio: dentist.bio || '',
      rating: dentist.rating ?? 5
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        specialty: form.specialty,
        days: form.days,
        bio: form.bio,
        rating: Number(form.rating || 5)
      };

      if (editingDentist) {
        await api.put(`/dentists/${editingDentist.id}`, payload);
      } else {
        await api.post('/dentists', payload);
      }

      setModalOpen(false);
      fetchDentists();
    } catch (err) {
      console.error('Failed to save dentist:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this dentist from the roster?')) return;
    try {
      await api.del(`/dentists/${id}`);
      fetchDentists();
    } catch (err) {
      console.error('Failed to delete dentist:', err);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground p-6">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dentists"
        subtitle={`${dentists.length} practitioners`}
        actions={
          <Button variant="primary" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1" /> Add Dentist
          </Button>
        }
      />

      {dentists.length === 0 ? (
        <Card p-6>
          <EmptyState
            title="No dentists listed"
            subtitle="Click 'Add Dentist' to add your first practitioner."
          />
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dentists.map((d) => (
            <Card key={d.id} className="p-6 flex flex-col justify-between relative group hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={d.name} className="h-16 w-16 text-xl" />
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{d.name}</h3>
                      <Badge variant="primary" className="mt-1">
                        {d.specialty}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditModal(d)}
                      title="Edit dentist"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(d.id)}
                      title="Delete dentist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating value={d.rating} />
                  <span className="text-xs text-muted-foreground font-medium">({d.rating})</span>
                </div>

                {d.days && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{d.days}</span>
                  </div>
                )}

                {d.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {d.bio}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dentist Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDentist ? 'Edit Dentist' : 'Add Dentist'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingDentist ? 'Save Changes' : 'Add Practitioner'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Doctor Name *</label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Dr. Rajesh Kumar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Specialty *</label>
            <Input
              required
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="e.g. Endodontist & Root Canal Specialist"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Working Days & Hours</label>
            <Input
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              placeholder="Mon - Fri, 9:00 AM - 5:00 PM"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rating (1 to 5)</label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className="w-24"
              />
              <StarRating
                value={Math.round(form.rating)}
                onChange={(r) => setForm({ ...form, rating: r })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Professional Bio</label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Brief summary of qualifications, experience, and clinical focus…"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
