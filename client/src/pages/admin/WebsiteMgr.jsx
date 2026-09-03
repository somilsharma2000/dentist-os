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
import { CheckCircle2, Globe, Sparkles } from 'lucide-react';

export default function WebsiteMgr() {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [settings, setSettings] = useState({
    heroTitle: 'Advanced Dental Care for Your Perfect Smile',
    heroSubtitle: 'Expert dentistry in Bengaluru with state-of-the-art technology and compassionate care.',
    tagline: 'SmileCraft Dental Clinic — Indiranagar, Bengaluru',
    showServices: true,
    showTeam: true,
    showTestimonials: true,
    showContact: true
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await api.get('/settings');
        if (data) {
          setSettings({
            heroTitle: data.heroTitle || 'Advanced Dental Care for Your Perfect Smile',
            heroSubtitle: data.heroSubtitle || 'Expert dentistry in Bengaluru with state-of-the-art technology and compassionate care.',
            tagline: data.tagline || 'SmileCraft Dental Clinic — Indiranagar, Bengaluru',
            showServices: data.showServices ?? true,
            showTeam: data.showTeam ?? true,
            showTestimonials: data.showTestimonials ?? true,
            showContact: data.showContact ?? true,
            ...data
          });
        }
      } catch (err) {
        console.error('Error loading settings for website manager:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handlePublish = async (e) => {
    e?.preventDefault();
    try {
      setPublishing(true);
      await api.put('/settings', settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error publishing website settings:', err);
    } finally {
      setPublishing(false);
    }
  };

  const toggleSection = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading website content...</div>;
  }

  return (
    <form onSubmit={handlePublish} className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Website Mgr"
        subtitle="Edit your public site content"
        actions={
          <Button type="submit" disabled={publishing}>
            <Globe className="h-4 w-4 mr-2" />
            {publishing ? 'Publishing...' : 'Publish Changes'}
          </Button>
        }
      />

      {showSuccess && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Website updated.</p>
        </div>
      )}

      {/* Hero Section Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Hero Title
              </label>
              <Input
                value={settings.heroTitle}
                onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                placeholder="Main headline on public homepage"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Hero Subtitle
              </label>
              <Textarea
                value={settings.heroSubtitle}
                onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                placeholder="Supporting description under the main headline"
                rows={3}
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="rounded-lg border bg-gradient-to-br from-primary/5 via-background to-muted p-6 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Live Banner Preview</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {settings.heroTitle || 'Your Hero Title'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {settings.heroSubtitle || 'Your hero subtitle description will render here on the landing page.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tagline Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tagline & Branding</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Clinic Tagline
            </label>
            <Input
              value={settings.tagline}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              placeholder="e.g. Premium Dental Care in Bengaluru"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section Visibility Toggles Card */}
      <Card>
        <CardHeader>
          <CardTitle>Public Page Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: 'showServices', label: 'Services & Pricing' },
              { key: 'showTeam', label: 'Our Dental Team' },
              { key: 'showTestimonials', label: 'Patient Testimonials' },
              { key: 'showContact', label: 'Contact & Location' }
            ].map(({ key, label }) => {
              const isEnabled = settings[key] !== false;
              return (
                <div
                  key={key}
                  onClick={() => toggleSection(key)}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                    isEnabled ? 'bg-primary/5 border-primary/30' : 'bg-card hover:bg-muted'
                  }`}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <button
                    type="button"
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      isEnabled
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isEnabled ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={publishing}>
          <Globe className="h-4 w-4 mr-2" />
          {publishing ? 'Publishing...' : 'Publish Changes'}
        </Button>
      </div>
    </form>
  );
}
