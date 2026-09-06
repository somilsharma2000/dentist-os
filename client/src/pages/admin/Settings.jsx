import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  PageHeader
} from '../../components/ui';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [settings, setSettings] = useState({
    clinicName: '',
    tagline: '',
    heroTitle: '',
    heroSubtitle: '',
    address: '',
    phone: '',
    email: '',
    hours: '',
    daysOpen: '',
    services: [],
    goals: {
      revenue: 500000,
      newPatients: 25,
      treatments: 60,
      reviews: 15
    },
    monthly: {
      revenue: 0,
      newPatients: 0,
      treatments: 0,
      reviews: 0
    }
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await api.get('/settings/mine');
        if (data) {
          setSettings({
            clinicName: data.clinicName || '',
            tagline: data.tagline || '',
            heroTitle: data.heroTitle || '',
            heroSubtitle: data.heroSubtitle || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            hours: data.hours || '',
            daysOpen: data.daysOpen || '',
            services: Array.isArray(data.services) ? data.services : [],
            goals: {
              revenue: data.goals?.revenue ?? 500000,
              newPatients: data.goals?.newPatients ?? 25,
              treatments: data.goals?.treatments ?? 60,
              reviews: data.goals?.reviews ?? 15
            },
            monthly: data.monthly || { revenue: 0, newPatients: 0, treatments: 0, reviews: 0 },
            ...data,
            billingProfile: {
              gstRegistered: false, gstin: '', legalName: '', tradeName: '', registeredAddress: '',
              state: '', stateCode: '', placeOfSupplyState: '', defaultTaxRate: 0, invoicePrefix: 'INV',
              invoiceNotes: '', supportEmail: '', supportPhone: '',
              ...(data.billingProfile || {})
            }
          });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaveError('');
      const billing = settings.billingProfile || {};
      const gstin = String(billing.gstin || '').trim().toUpperCase();
      if (billing.gstRegistered && !gstin) throw new Error('Enter the clinic GSTIN or mark GST registration as not applicable.');
      if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) throw new Error('Enter a valid 15-character GSTIN.');
      setSaving(true);
      await api.put('/settings', { ...settings, billingProfile: { ...billing, gstin } });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Could not save settings.');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleGoalChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      goals: {
        ...prev.goals,
        [key]: Number(value) || 0
      }
    }));
  };

  const handleServiceChange = (index, field, value) => {
    setSettings((prev) => {
      const updatedServices = [...(prev.services || [])];
      updatedServices[index] = {
        ...updatedServices[index],
        [field]: field === 'price' ? Number(value) || 0 : value
      };
      return { ...prev, services: updatedServices };
    });
  };

  const handleAddService = () => {
    setSettings((prev) => ({
      ...prev,
      services: [...(prev.services || []), { name: '', price: 0, desc: '' }]
    }));
  };

  const handleRemoveService = (index) => {
    setSettings((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading clinic settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12">
      <PageHeader
        title="Settings"
        subtitle="Manage clinic profile, operating hours, target goals, and services"
        actions={
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      {showSuccess && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Saved successfully.</p>
        </div>
      )}

      {saveError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-destructive text-sm font-medium">
          {saveError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clinic Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Clinic Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Clinic Name
              </label>
              <Input
                value={settings.clinicName}
                onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                placeholder="SmileCraft Dental Clinic"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tagline
              </label>
              <Input
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                placeholder="Advanced Dental Care in Bengaluru"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Hero Title
              </label>
              <Input
                value={settings.heroTitle}
                onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                placeholder="Your Smile, Our Priority"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Hero Subtitle
              </label>
              <Textarea
                value={settings.heroSubtitle}
                onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                placeholder="Comprehensive dentistry with state-of-the-art care..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Address
              </label>
              <Input
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Indiranagar, Bengaluru, KA 560038"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Phone Number
              </label>
              <Input
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="hello@smilecraft.in"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax and legal billing profile */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Legal & GST Billing Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Keep the clinic’s legal identity here for invoices, patient notices, and tax records. This is clinic information—not Dentist OS tax advice. Confirm rates and invoice requirements with your CA.
            </p>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={settings.billingProfile?.gstRegistered === true}
                onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, gstRegistered: e.target.checked } })}
                className="h-4 w-4 rounded border-input"
              />
              Clinic is GST registered
            </label>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">GSTIN</label>
                <Input
                  value={settings.billingProfile?.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, gstin: e.target.value.toUpperCase() } })}
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Legal entity name</label>
                <Input
                  value={settings.billingProfile?.legalName || ''}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, legalName: e.target.value } })}
                  placeholder="SmileCraft Healthcare Pvt Ltd"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Trade / clinic name</label>
                <Input
                  value={settings.billingProfile?.tradeName || ''}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, tradeName: e.target.value } })}
                  placeholder="SmileCraft Dental Clinic"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">State</label>
                <Input
                  value={settings.billingProfile?.state || ''}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, state: e.target.value } })}
                  placeholder="Karnataka"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">GST state code</label>
                <Input
                  value={settings.billingProfile?.stateCode || ''}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, stateCode: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) } })}
                  placeholder="29"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Default tax rate (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.billingProfile?.defaultTaxRate ?? 0}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, defaultTaxRate: e.target.value } })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice prefix</label>
                <Input
                  value={settings.billingProfile?.invoicePrefix || 'INV'}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, invoicePrefix: e.target.value.toUpperCase() } })}
                  placeholder="INV"
                  maxLength={12}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Registered billing address</label>
                <Input
                  value={settings.billingProfile?.registeredAddress || ''}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, registeredAddress: e.target.value } })}
                  placeholder="Full registered address used on invoices"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Billing support email</label>
                <Input
                  type="email"
                  value={settings.billingProfile?.supportEmail || ''}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, supportEmail: e.target.value } })}
                  placeholder="billing@clinic.in"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Billing support phone</label>
                <Input
                  value={settings.billingProfile?.supportPhone || ''}
                  onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, supportPhone: e.target.value } })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice note / terms</label>
              <Textarea
                value={settings.billingProfile?.invoiceNotes || ''}
                onChange={(e) => setSettings({ ...settings, billingProfile: { ...settings.billingProfile, invoiceNotes: e.target.value } })}
                placeholder="Payment terms, refund instructions, or CA-approved invoice text"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Hours
              </label>
              <Input
                value={settings.hours}
                onChange={(e) => setSettings({ ...settings, hours: e.target.value })}
                placeholder="09:00 - 18:00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Days Open
              </label>
              <Input
                value={settings.daysOpen}
                onChange={(e) => setSettings({ ...settings, daysOpen: e.target.value })}
                placeholder="Mon – Sat"
              />
            </div>
          </CardContent>
        </Card>

        {/* Target Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Practice Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Revenue Goal (₹)
                </label>
                <Input
                  type="number"
                  value={settings.goals?.revenue ?? ''}
                  onChange={(e) => handleGoalChange('revenue', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  New Patients Target
                </label>
                <Input
                  type="number"
                  value={settings.goals?.newPatients ?? ''}
                  onChange={(e) => handleGoalChange('newPatients', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Treatments Goal
                </label>
                <Input
                  type="number"
                  value={settings.goals?.treatments ?? ''}
                  onChange={(e) => handleGoalChange('treatments', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Reviews Target
                </label>
                <Input
                  type="number"
                  value={settings.goals?.reviews ?? ''}
                  onChange={(e) => handleGoalChange('reviews', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Card (Full Width) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Services & Pricing Catalog</CardTitle>
            <Button type="button" variant="ghost" onClick={handleAddService}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Service
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.services?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No services added yet. Click "Add Service" to build your catalog.
              </p>
            ) : (
              settings.services.map((svc, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="flex-1 min-w-[180px]">
                    <Input
                      value={svc.name}
                      onChange={(e) => handleServiceChange(idx, 'name', e.target.value)}
                      placeholder="Service Name"
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      value={svc.price}
                      onChange={(e) => handleServiceChange(idx, 'price', e.target.value)}
                      placeholder="Price (₹)"
                    />
                  </div>
                  <div className="flex-[2] min-w-[220px]">
                    <Input
                      value={svc.desc}
                      onChange={(e) => handleServiceChange(idx, 'desc', e.target.value)}
                      placeholder="Short Description"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveService(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
