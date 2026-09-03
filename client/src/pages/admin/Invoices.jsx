import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
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
import { Plus, Trash2, Wallet, AlertTriangle } from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState('Pending');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invData, patData] = await Promise.all([
        api.get('/invoices'),
        api.get('/patients')
      ]);
      setInvoices(invData || []);
      setPatients(patData || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    if (patients.length > 0) {
      setPatientId(String(patients[0].id));
    } else {
      setPatientId('');
    }
    setItems('');
    setAmount('');
    setDate(todayISO());
    setStatus('Pending');
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!patientId || !items || !amount) return;

    const invNumber = `INV-${new Date().getFullYear()}-${String(
      invoices.length + 1
    ).padStart(3, '0')}`;

    try {
      await api.post('/invoices', {
        number: invNumber,
        patientId: Number(patientId),
        items,
        amount: Number(amount) || 0,
        date,
        status
      });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create invoice:', err);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.put(`/invoices/${id}`, { status: 'Paid' });
      fetchData();
    } catch (err) {
      console.error('Failed to mark invoice as paid:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/invoices/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  const getPatientName = (pId) => {
    const p = patients.find((x) => x.id === Number(pId));
    return p ? p.name : 'Unknown Patient';
  };

  // Calculations
  const totalCollected = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const pendingInvoices = invoices.filter((i) => i.status === 'Pending');
  const pendingSum = pendingInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const overdueInvoices = invoices.filter((i) => i.status === 'Overdue');
  const overdueSum = overdueInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'All') return true;
    return inv.status === filter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices generated`}
        actions={
          <Button onClick={openModal}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        }
      />

      {/* 3 StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Collected"
          value={formatINR(totalCollected)}
          sub="Paid in full"
          icon={Wallet}
        />
        <StatCard
          label="Pending"
          value={formatINR(pendingSum)}
          sub={`${pendingInvoices.length} invoices pending`}
          icon={AlertTriangle}
        />
        <StatCard
          label="Overdue"
          value={`${overdueInvoices.length} overdue`}
          sub={`Total overdue: ${formatINR(overdueSum)}`}
          icon={AlertTriangle}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b pb-3">
        {['All', 'Paid', 'Pending', 'Overdue'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filter === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : filteredInvoices.length === 0 ? (
        <EmptyState title="No invoices found" subtitle="No invoices match the selected filter." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">Invoice #</th>
                  <th className="p-4 font-medium">Patient</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{inv.number || `INV-${inv.id}`}</td>
                    <td className="p-4 font-medium">{getPatientName(inv.patientId)}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(inv.date)}</td>
                    <td className="p-4 text-muted-foreground">{inv.items}</td>
                    <td className="p-4 font-semibold">{formatINR(inv.amount)}</td>
                    <td className="p-4">
                      <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status !== 'Paid' && (
                          <Button size="sm" onClick={() => handleMarkPaid(inv.id)}>
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(inv.id)}
                          className="text-destructive hover:text-destructive"
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
        </Card>
      )}

      {/* New Invoice Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Invoice"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save Invoice</Button>
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
            <label className="block text-sm font-medium mb-1">Items / Description</label>
            <Input
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="e.g. Fillings (2) + consultation"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2940"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
