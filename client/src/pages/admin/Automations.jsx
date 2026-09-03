import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Modal,
  PageHeader,
  EmptyState
} from '../../components/ui';
import { formatDate } from '../../lib/utils';
import { Zap, Plus, Trash2 } from 'lucide-react';

export default function Automations() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // New automation state
  const [formData, setFormData] = useState({
    name: '',
    trigger: '',
    action: '',
    active: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const data = await api.get('/automations');
      setAutomations(data || []);
    } catch (err) {
      console.error('Error fetching automations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const activeCount = automations.filter((a) => a.active).length;
  const totalCount = automations.length;

  const handleToggleActive = async (item) => {
    try {
      const updated = { ...item, active: !item.active };
      await api.put(`/automations/${item.id}`, updated);
      setAutomations((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, active: !a.active } : a))
      );
    } catch (err) {
      console.error('Error toggling automation:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/automations', {
        ...formData,
        executions: 0,
        lastRun: 'Never'
      });
      setOpenModal(false);
      setFormData({ name: '', trigger: '', action: '', active: true });
      fetchAutomations();
    } catch (err) {
      console.error('Error creating automation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this automation rule?')) return;
    try {
      await api.del(`/automations/${id}`);
      fetchAutomations();
    } catch (err) {
      console.error('Error deleting automation:', err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        subtitle={`${totalCount} rules • ${activeCount} active`}
        actions={
          <Button onClick={() => setOpenModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Automation
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading automations...</div>
          ) : automations.length === 0 ? (
            <EmptyState title="No automations configured" subtitle="Add rules to automate SMS, WhatsApp, and reminders." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/30">
                    <th className="p-4">Rule Name</th>
                    <th className="p-4">Trigger</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Executions</th>
                    <th className="p-4">Last Run</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {automations.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="font-semibold text-foreground">{item.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{item.trigger}</td>
                      <td className="p-4 text-muted-foreground">{item.action}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            item.active
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {item.active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="p-4 font-semibold">
                        {(item.executions || 0).toLocaleString('en-IN')} runs
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {formatDate(item.lastRun)}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Automation Modal */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Add Automation Rule"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Automation'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Rule Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Appointment Reminder (SMS)"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Trigger Event
            </label>
            <Input
              value={formData.trigger}
              onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
              placeholder="e.g. 24 hours before appointment"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Action
            </label>
            <Input
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              placeholder="e.g. Send SMS reminder"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Initial Status
            </label>
            <Select
              value={formData.active ? 'true' : 'false'}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.value === 'true' })
              }
            >
              <option value="true">Active</option>
              <option value="false">Paused</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
