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
  Avatar,
  EmptyState,
  statusVariant
} from '../../components/ui';
import { formatDate, todayISO } from '../../lib/utils';
import { Plus, Send, Trash2 } from 'lucide-react';

export default function Recall() {
  const [recalls, setRecalls] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [patientId, setPatientId] = useState('');
  const [type, setType] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [channel, setChannel] = useState('WhatsApp');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recData, patData] = await Promise.all([
        api.get('/recall'),
        api.get('/patients')
      ]);
      setRecalls(recData || []);
      setPatients(patData || []);
    } catch (err) {
      console.error('Failed to load recalls:', err);
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
    setType('');
    setDueDate(todayISO());
    setChannel('WhatsApp');
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!patientId || !type || !dueDate) return;

    try {
      await api.post('/recall', {
        patientId: Number(patientId),
        type,
        dueDate,
        channel,
        status: 'Due'
      });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create recall:', err);
    }
  };

  const handleSendReminder = async (id) => {
    try {
      await api.put(`/recall/${id}`, { status: 'Sent' });
      fetchData();
    } catch (err) {
      console.error('Failed to update recall status:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/recall/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete recall:', err);
    }
  };

  const getPatientName = (pId) => {
    const p = patients.find((x) => x.id === Number(pId));
    return p ? p.name : 'Unknown Patient';
  };

  const dueCount = recalls.filter((r) => r.status === 'Due').length;
  const today = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recall"
        subtitle={`${dueCount} due`}
        actions={
          <Button onClick={openModal}>
            <Plus className="h-4 w-4" />
            New Recall
          </Button>
        }
      />

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : recalls.length === 0 ? (
        <EmptyState title="No recall reminders" subtitle="Create a recall reminder for follow-up visits." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">Patient</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Due Date</th>
                  <th className="p-4 font-medium">Channel</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recalls.map((item) => {
                  const patientName = getPatientName(item.patientId);
                  const isOverdue = item.dueDate < today && item.status === 'Due';

                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar name={patientName} className="h-8 w-8 text-xs" />
                          <span>{patientName}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{item.type}</td>
                      <td className="p-4">
                        {isOverdue ? (
                          <Badge variant="destructive">
                            Overdue ({formatDate(item.dueDate)})
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{formatDate(item.dueDate)}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={item.channel === 'WhatsApp' ? 'info' : 'default'}>
                          {item.channel}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={item.status === 'Sent'}
                            onClick={() => handleSendReminder(item.id)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {item.status === 'Sent' ? 'Sent' : 'Send Reminder'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Recall Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Recall Reminder"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save Recall</Button>
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
            <label className="block text-sm font-medium mb-1">Type / Reason</label>
            <Input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. Whitening touch-up, 6-month cleaning"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="WhatsApp">WhatsApp</option>
              <option value="SMS">SMS</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
