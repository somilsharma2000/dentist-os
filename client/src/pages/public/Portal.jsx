import React, { useState } from 'react';
import { api } from '../../lib/api';
import { formatDate, formatINR } from '../../lib/utils';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  statusVariant,
  Input,
  Select,
  Avatar,
  EmptyState
} from '../../components/ui';
import { LogOut, Calendar, FileText, Receipt, User } from 'lucide-react';

export default function Portal() {
  const [phone, setPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Portal session data
  const [portalData, setPortalData] = useState(null);

  // Registration state
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male'
  });
  const [regError, setRegError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!phone.trim()) {
      setLoginError('Please enter your phone number.');
      return;
    }

    try {
      setLoading(true);
      const data = await api.post('/portal/login', { phone: phone.trim() });
      setPortalData(data);
    } catch (err) {
      const msg = err.message || 'Failed to login.';
      setLoginError(msg);
      if (msg.toLowerCase().includes('register') || msg.toLowerCase().includes('no account')) {
        setRegForm((prev) => ({ ...prev, phone: phone.trim() }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    if (!regForm.name.trim() || !regForm.phone.trim()) {
      setRegError('Name and Phone number are required.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/portal/register', {
        name: regForm.name.trim(),
        phone: regForm.phone.trim(),
        email: regForm.email.trim() || undefined,
        age: regForm.age ? Number(regForm.age) : undefined,
        gender: regForm.gender
      });

      // Auto login after registration
      const data = await api.post('/portal/login', { phone: regForm.phone.trim() });
      setPortalData(data);
      setShowRegister(false);
    } catch (err) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setPortalData(null);
    setPhone('');
    setLoginError('');
    setShowRegister(false);
  };

  // LOGGED IN VIEW
  if (portalData) {
    const { patient, appointments = [], treatmentPlans = [], invoices = [] } = portalData;

    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar name={patient?.name || 'Patient'} className="h-12 w-12 text-lg" />
            <div>
              <h1 className="text-xl font-bold">{patient?.name}</h1>
              <p className="text-sm text-muted-foreground">{patient?.phone} {patient?.email ? `• ${patient.email}` : ''}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Section 1: My Appointments */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">My Appointments</h2>
          </div>

          {appointments.length === 0 ? (
            <EmptyState title="No appointments found" subtitle="Book your first appointment online." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {appointments.map((apt, idx) => (
                <Card key={idx} className="p-4 flex flex-col justify-between space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-base">{apt.procedure}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Dentist: {apt.dentistName || 'SmileCraft Clinic'}</p>
                    </div>
                    <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground pt-2 border-t border-border/60">
                    {formatDate(apt.date)} • {apt.time}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: My Treatment Plans */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">My Treatment Plans</h2>
          </div>

          {treatmentPlans.length === 0 ? (
            <EmptyState title="No active treatment plans" subtitle="Your doctor will add plans during consultation." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {treatmentPlans.map((tp, idx) => (
                <Card key={idx} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-base">{tp.title}</p>
                    <p className="text-sm font-bold text-primary">{formatINR(tp.cost)}</p>
                  </div>
                  <Badge variant={statusVariant(tp.status)}>{tp.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: My Invoices */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">My Invoices</h2>
          </div>

          {invoices.length === 0 ? (
            <EmptyState title="No invoices available" subtitle="Your billing records will show up here." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {invoices.map((inv, idx) => (
                <Card key={idx} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Invoice #{inv.number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inv.date)}</p>
                    <p className="text-sm font-bold">{formatINR(inv.amount)}</p>
                  </div>
                  <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // LOGIN / REGISTRATION VIEW
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6 md:p-8 space-y-6">
        {!showRegister ? (
          /* LOGIN FORM */
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">Patient Portal</h1>
              <p className="text-xs text-muted-foreground">
                Enter your registered phone number to access your appointments and records.
              </p>
            </div>

            {loginError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600 space-y-2">
                <p>{loginError}</p>
                {(loginError.toLowerCase().includes('register') || loginError.toLowerCase().includes('no account')) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegister(true);
                      setRegError('');
                    }}
                    className="text-xs font-bold underline hover:text-red-800"
                  >
                    New patient? Register here →
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setLoginError('');
                  }}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Checking...' : 'Continue'}
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                First time visiting?{' '}
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className="font-semibold text-primary hover:underline"
                >
                  Register as a new patient
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">Patient Registration</h1>
              <p className="text-xs text-muted-foreground">Create your patient profile with SmileCraft.</p>
            </div>

            {regError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Phone Number *</label>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Email Address (Optional)</label>
                <Input
                  type="email"
                  placeholder="rahul@example.com"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Age</label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={regForm.age}
                    onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Gender</label>
                  <Select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Registering...' : 'Register & Log In'}
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
