import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse, LogIn, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { setSession, applyTenantTheme } from '../../lib/auth';

const DEMO_LOGINS = [
  { label: 'Agency Owner (all clinics)', email: 'agency@dentos.app', password: 'agency123' },
  { label: 'SmileCraft — Clinic Admin', email: 'admin@smilecraft.com', password: 'admin123' },
  { label: 'SmileCraft — Receptionist', email: 'front@smilecraft.com', password: 'front123' },
  { label: 'SmileCraft — Dentist', email: 'dr.rao@smilecraft.com', password: 'dentist123' },
  { label: 'CityDent — Clinic Admin', email: 'admin@citydent.com', password: 'admin123' },
  { label: 'WhiteField — Clinic Admin', email: 'admin@whitefield.com', password: 'admin123' }
];

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      setSession({ staff: res.staff, tenant: res.tenant, token: res.token || null, viewTenantId: null });
      applyTenantTheme(res.tenant);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const quick = async (e, p) => {
    setEmail(e);
    setPassword(p);
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email: e, password: p });
      setSession({ staff: res.staff, tenant: res.tenant, token: res.token || null, viewTenantId: null });
      applyTenantTheme(res.tenant);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-lg border bg-card shadow-sm md:grid md:grid-cols-2">
        <div className="p-8">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 p-2">
              <HeartPulse className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-bold leading-tight">DentOS</p>
              <p className="text-xs text-muted-foreground">Dental Practice OS</p>
            </div>
          </Link>
          <h1 className="text-2xl font-bold">Staff sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your clinic workspace.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign in
            </button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Patient? <Link to="/portal" className="text-primary underline-offset-2 hover:underline">Go to the patient portal</Link>
          </p>
        </div>

        <div className="border-t bg-muted/40 p-8 md:border-l md:border-t-0">
          <p className="text-sm font-semibold">Demo accounts</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click any account to sign in instantly. Clinic staff only see their own clinic's data.
          </p>
          <div className="mt-4 space-y-2">
            {DEMO_LOGINS.map((d) => (
              <button
                key={d.email}
                onClick={() => quick(d.email, d.password)}
                disabled={busy}
                className="w-full rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-60"
              >
                <span className="font-medium">{d.label}</span>
                <span className="block text-xs text-muted-foreground">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
