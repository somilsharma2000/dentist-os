import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input, Textarea } from '../../components/ui';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function Contact() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.get('/settings')
      .then((data) => {
        if (isMounted && data) setSettings(data);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const address = settings?.address || '12 MG Road, Bengaluru, Karnataka 560001';
  const phone = settings?.phone || '+91 98765 43210';
  const email = settings?.email || 'contact@smilecraft.com';
  const hours = settings?.hours || '09:00 - 18:00';
  const daysOpen = settings?.daysOpen || 'Mon – Sat';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.name.trim() && form.phone.trim()) {
      setSubmitted(true);
      setForm({ name: '', phone: '', message: '' });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Contact Us</h1>
        <p className="text-sm text-muted-foreground">
          Have questions or need assistance? Reach out to us or visit our clinic.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Card: Contact Information */}
        <Card className="p-6 space-y-6">
          <h2 className="text-xl font-bold">Clinic Details</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Address</p>
                <p className="text-sm font-semibold">{address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Phone</p>
                <p className="text-sm font-semibold">{phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-semibold">{email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Working Hours</p>
                <p className="text-sm font-semibold">{hours} ({daysOpen})</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Card: Simple Contact Form */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Send Us a Message</h2>

          {submitted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800 space-y-2">
              <p className="font-semibold text-base">Thanks! We will call you back shortly.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                onClick={() => setSubmitted(false)}
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Phone Number *</label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Message (Optional)</label>
                <Textarea
                  placeholder="How can we help you?"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                Submit
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
