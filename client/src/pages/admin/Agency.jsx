import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Select,
  Modal,
  PageHeader,
  StatCard,
  EmptyState,
  statusVariant
} from '../../components/ui';
import { formatDate, formatINR, todayISO } from '../../lib/utils';
import { Building2, TrendingUp, Plus, Trash2 } from 'lucide-react';

export default function Agency() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    plan: 'Growth',
    mrr: 25000,
    status: 'Active',
    since: todayISO(),
    renewal: todayISO()
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await api.get('/clients');
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Stats
  const totalMRR = clients.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  const activeCount = clients.filter((c) => c.status === 'Active').length;
  const trialCount = clients.filter((c) => c.status === 'Trial').length;
  const totalClients = clients.length;

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/clients', {
        ...formData,
        mrr: Number(formData.mrr) || 0
      });
      setOpenModal(false);
      setFormData({
        name: '',
        plan: 'Growth',
        mrr: 25000,
        status: 'Active',
        since: todayISO(),
        renewal: todayISO()
      });
      fetchClients();
    } catch (err) {
      console.error('Error creating client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client clinic?')) return;
    try {
      await api.del(`/clients/${id}`);
      fetchClients();
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agency Mgmt"
        subtitle="Manage your client clinics"
        actions={
          <Button onClick={() => setOpenModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        }
      />

      {/* StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total MRR" value={formatINR(totalMRR)} icon={TrendingUp} />
        <StatCard label="Active Clinics" value={activeCount} />
        <StatCard label="Trial Clinics" value={trialCount} />
        <StatCard label="Total Clinics" value={totalClients} icon={Building2} />
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading clients...</div>
          ) : clients.length === 0 ? (
            <EmptyState title="No client clinics" subtitle="Add your partner clinics to manage subscriptions and MRR." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/30">
                    <th className="p-4">Clinic</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">MRR</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Client Since</th>
                    <th className="p-4">Next Renewal</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-foreground">{client.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={client.plan === 'Growth' ? 'primary' : 'default'}>
                          {client.plan}
                        </Badge>
                      </td>
                      <td className="p-4 font-semibold text-foreground">
                        {formatINR(client.mrr)}
                      </td>
                      <td className="p-4">
                        <Badge variant={statusVariant(client.status)}>{client.status}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {formatDate(client.since)}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {formatDate(client.renewal)}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(client.id)}
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

      {/* Add Client Modal */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Add Client Clinic"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClient} disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Client'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Clinic Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. SmileCraft Dental Clinic (MG Road)"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Plan
              </label>
              <Select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              >
                <option value="Starter">Starter</option>
                <option value="Growth">Growth</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                MRR (₹)
              </label>
              <Input
                type="number"
                value={formData.mrr}
                onChange={(e) => setFormData({ ...formData, mrr: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Trial">Trial</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Client Since
              </label>
              <Input
                type="date"
                value={formData.since}
                onChange={(e) => setFormData({ ...formData, since: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Next Renewal
              </label>
              <Input
                type="date"
                value={formData.renewal}
                onChange={(e) => setFormData({ ...formData, renewal: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
