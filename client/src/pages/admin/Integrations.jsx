import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Modal,
  PageHeader
} from '../../components/ui';
import {
  MessageCircle,
  MessageSquare,
  CreditCard,
  Calendar,
  Mail,
  Star,
  Plug,
  CheckCircle2
} from 'lucide-react';

// Connector catalog — each clinic configures its own credentials.
const CONNECTORS = [
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    icon: MessageCircle,
    description: 'Send appointment confirmations & reminders on WhatsApp.',
    fields: [
      { name: 'phoneNumber', label: 'WhatsApp Business Number', placeholder: '+91 98765 43210' },
      { name: 'apiKey', label: 'API Key (Meta / BSP)', placeholder: 'EAAG…' }
    ]
  },
  {
    key: 'sms',
    name: 'SMS Gateway',
    icon: MessageSquare,
    description: 'Fallback SMS reminders via MSG91 / Twilio.',
    fields: [
      { name: 'senderId', label: 'Sender ID (6 chars)', placeholder: 'SMILEC' },
      { name: 'authKey', label: 'Auth Key', placeholder: '••••••' }
    ]
  },
  {
    key: 'razorpay',
    name: 'Razorpay Payments',
    icon: CreditCard,
    description: 'Collect advance payments & invoice settlements online.',
    fields: [
      { name: 'keyId', label: 'Key ID', placeholder: 'rzp_live_…' },
      { name: 'keySecret', label: 'Key Secret', placeholder: '••••••' }
    ]
  },
  {
    key: 'calendar',
    name: 'Google Calendar',
    icon: Calendar,
    description: 'Two-way sync of appointments with clinic calendars.',
    fields: [
      { name: 'calendarId', label: 'Calendar ID', placeholder: 'clinic@group.calendar.google.com' },
      { name: 'serviceEmail', label: 'Service Account Email', placeholder: 'sync@project.iam.gserviceaccount.com' }
    ]
  },
  {
    key: 'email',
    name: 'Email / SMTP',
    icon: Mail,
    description: 'Invoice PDFs, recall emails & review invites.',
    fields: [
      { name: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
      { name: 'username', label: 'Username', placeholder: 'clinic@example.com' },
      { name: 'password', label: 'Password / App Password', placeholder: '••••••', type: 'password' }
    ]
  },
  {
    key: 'reviews',
    name: 'Google Reviews',
    icon: Star,
    description: 'Pull public Google reviews & auto-respond.',
    fields: [
      { name: 'placeId', label: 'Google Place ID', placeholder: 'ChIJ…' }
    ]
  }
];

export default function Integrations() {
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState([]); // super + "all clinics" view
  const [activeClinicId, setActiveClinicId] = useState(null);
  const [integrations, setIntegrations] = useState({});
  const [clinicName, setClinicName] = useState('');
  const [modal, setModal] = useState(null); // connector def
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // success banner
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/integrations')
      .then((res) => {
        if (Array.isArray(res)) {
          setClinics(res);
          const first = res.find((c) => c.id === activeClinicId) || res[0];
          if (first) {
            setActiveClinicId(first.id);
            setIntegrations(first.integrations || {});
            setClinicName(first.name);
          }
        } else {
          setClinics([]);
          setActiveClinicId(res.id);
          setIntegrations(res.integrations || {});
          setClinicName(res.name);
        }
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line

  const openModal = (def) => {
    const existing = (integrations[def.key] && integrations[def.key].config) || {};
    const initial = {};
    def.fields.forEach((f) => {
      initial[f.name] = existing[f.name] || '';
    });
    setForm(initial);
    setModal(def);
  };

  const save = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await api.put('/integrations', {
        tenantId: activeClinicId,
        key: modal.key,
        config: form
      });
      setModal(null);
      setMsg(`${modal.name} credentials saved for ${clinicName}.`);
      setTimeout(() => setMsg(null), 4000);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async (def) => {
    try {
      await api.put('/integrations', { tenantId: activeClinicId, key: def.key, disconnect: true });
      setModal(null);
      setMsg(`${def.name} disconnected from ${clinicName}.`);
      setTimeout(() => setMsg(null), 4000);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const selectClinic = (id) => {
    setActiveClinicId(id);
    const c = clinics.find((x) => x.id === id);
    if (c) {
      setIntegrations(c.integrations || {});
      setClinicName(c.name);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading integrations…</p>;
  }

  const configuredCount = CONNECTORS.filter((c) => integrations[c.key]).length;

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle={
          clinicName
            ? `Connectors & API credentials · ${clinicName}`
            : 'Connectors & API credentials'
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> {msg}
        </div>
      )}

      {clinics.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Clinic:
          </span>
          {clinics.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectClinic(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                c.id === activeClinicId
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Plug className="h-4 w-4 shrink-0" />
        <span>
          <strong className="text-foreground">{configuredCount}/6 connected</strong> for{' '}
          {clinicName}. Credentials are stored per clinic. Demo mode: live sending activates in
          Phase 10 when the production server runs with these keys.
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CONNECTORS.map((def) => {
          const Icon = def.icon;
          const conf = integrations[def.key];
          return (
            <Card key={def.key} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col">
                <div className="flex items-start justify-between">
                  <span className="rounded-full bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <Badge variant={conf ? 'success' : 'default'}>
                    {conf ? 'Configured' : 'Not configured'}
                  </Badge>
                </div>
                <p className="mt-3 font-semibold">{def.name}</p>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{def.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  {conf && conf.config && conf.config.phoneNumber ? (
                    <span className="text-xs text-muted-foreground">{conf.config.phoneNumber}</span>
                  ) : (
                    <span />
                  )}
                  <Button size="sm" onClick={() => openModal(def)}>
                    {conf ? 'Manage' : 'Connect'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal ? `${modal.name} — ${clinicName}` : ''}
        footer={
          <>
            {integrations[modal?.key] && (
              <Button
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={() => disconnect(modal)}
              >
                Disconnect
              </Button>
            )}
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save credentials'}
            </Button>
          </>
        }
      >
        {modal && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {modal.description} These credentials are saved for {clinicName} only — other clinics
              configure their own.
            </p>
            {modal.fields.map((f) => (
              <div key={f.name}>
                <label className="mb-1 block text-sm font-medium">{f.label}</label>
                <Input
                  type={f.type || 'text'}
                  value={form[f.name] || ''}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
