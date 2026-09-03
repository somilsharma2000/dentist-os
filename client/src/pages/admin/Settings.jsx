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
        const data = await api.get('/settings');
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
            ...data
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
      setSaving(true);
      await api.put('/settings', settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
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
