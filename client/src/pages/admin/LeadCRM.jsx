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
  statusVariant
} from '../../components/ui';
import { Plus } from 'lucide-react';

export default function LeadCRM() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('website');
  const [score, setScore] = useState('80');
  const [status, setStatus] = useState('New');
  const [notes, setNotes] = useState('');

  const columns = ['New', 'Contacted', 'Converted', 'Lost'];

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await api.get('/leads');
      setLeads(data || []);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const openModal = () => {
    setName('');
    setPhone('');
    setSource('website');
    setScore('80');
    setStatus('New');
    setNotes('');
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      await api.post('/leads', {
        name,
        phone,
        source,
        score: Number(score) || 0,
        status,
        notes
      });
      setModalOpen(false);
      fetchLeads();
    } catch (err) {
      console.error('Failed to create lead:', err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/leads/${id}`, { status: newStatus });
      fetchLeads();
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const conversionRate = leads.length
    ? Math.round((leads.filter((l) => l.status === 'Converted').length / leads.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead CRM"
        subtitle={`${leads.length} leads • ${conversionRate}% conversion`}
        actions={
          <Button onClick={openModal}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        }
      />

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {columns.map((colStatus) => {
            const colLeads = leads.filter((l) => l.status === colStatus);
            return (
              <div key={colStatus} className="bg-muted/30 p-3 rounded-lg flex flex-col gap-3 min-h-[300px]">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-sm">{colStatus}</h3>
                  <Badge variant={statusVariant(colStatus)}>{colLeads.length}</Badge>
                </div>

                {colLeads.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-4 border border-dashed rounded-md text-xs text-muted-foreground">
                    No {colStatus.toLowerCase()} leads
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <Card key={lead.id} className="p-4 space-y-3 shadow-sm bg-card">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={lead.name} className="h-8 w-8 text-xs shrink-0" />
                          <span className="font-medium text-sm truncate">{lead.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                          {lead.source}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                          <span>Lead Score</span>
                          <span>{lead.score || 0}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, lead.score || 0))}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {lead.phone && <p>📞 {lead.phone}</p>}
                        {lead.notes && <p className="line-clamp-2 italic">{lead.notes}</p>}
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between gap-2">
                        <label className="text-[10px] font-medium text-muted-foreground">Status:</label>
                        <Select
                          className="h-7 text-xs w-28 py-0"
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Converted">Converted</option>
                          <option value="Lost">Lost</option>
                        </Select>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Lead"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save Lead</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="website">Website</option>
              <option value="google-ads">Google Ads</option>
              <option value="instagram">Instagram</option>
              <option value="referral">Referral</option>
              <option value="walk-in">Walk-in</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Score (0-100)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="80"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Inquired about teeth whitening or dental implants..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
