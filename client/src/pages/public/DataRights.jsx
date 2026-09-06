import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button, Card, CardContent, Input, PageHeader, Select, Textarea } from '../../components/ui';

export default function DataRights() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: 'access', details: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try {
      const result = await api.post('/privacy/requests', form);
      setMessage(`${result.message} Reference: ${result.requestId}`);
      setForm({ name: '', email: '', phone: '', type: 'access', details: '' });
    } catch (err) { setError(err.message || 'Could not submit the request.'); }
    finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-3xl px-4 py-12">
    <PageHeader title="Data Rights Request" subtitle="Request access, correction, consent withdrawal, deletion, or raise a privacy grievance." />
    <Card className="mt-8"><CardContent className="p-6">
      <p className="mb-6 text-sm text-muted-foreground">The clinic may verify your identity before acting. Deletion may be limited where clinical, tax, safety, or legal retention duties apply. Read the <Link className="text-primary underline" to="/privacy">Privacy Notice</Link> first.</p>
      {message && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Your name</label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div><label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Request type</label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="access">Access / copy of my data</option><option value="correction">Correct my information</option><option value="withdraw-consent">Withdraw consent</option><option value="deletion">Request deletion</option><option value="grievance">Privacy grievance</option></Select></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Details</label><Textarea rows={5} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Tell the clinic what you need. Do not include passwords or OTPs." /></div>
        <Button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit request'}</Button>
      </form>
    </CardContent></Card>
  </div>;
}
