import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { HeartPulse, Search, Bell, LogOut, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import { getSession, clearSession, updateSession, applyTenantTheme, ROLE_LABELS } from '../lib/auth';

// Role keys: super (agency owner), admin (clinic admin), dentist, front (receptionist)
const ALL = ['super', 'admin', 'dentist', 'front'];
const groups = [
  { label: null, items: [{ to: '/admin', label: 'Dashboard', end: true, roles: ALL }] },
  {
    label: 'CLINICAL',
    items: [
      { to: '/admin/patients', label: 'Patients', roles: ['admin', 'front', 'dentist'] },
      { to: '/admin/appointments', label: 'Appointments', roles: ['admin', 'front', 'dentist'] },
      { to: '/admin/treatment-plans', label: 'Treatment Plans', roles: ['admin', 'dentist'] },
      { to: '/admin/tooth-chart', label: 'Tooth Chart', roles: ['admin', 'dentist'] },
      { to: '/admin/dentists', label: 'Dentists', roles: ['admin'] }
    ]
  },
  { label: 'FINANCIAL', items: [{ to: '/admin/invoices', label: 'Invoices', roles: ['admin', 'front'] }] },
  {
    label: 'MARKETING',
    items: [
      { to: '/admin/leads', label: 'Lead CRM', roles: ['admin', 'front'] },
      { to: '/admin/social', label: 'Social Media', roles: ['admin'] },
      { to: '/admin/reviews', label: 'Reviews', roles: ['admin', 'front'] },
      { to: '/admin/recall', label: 'Recall', roles: ['admin', 'front'] }
    ]
  },
  {
    label: 'AUTOMATION',
    items: [
      { to: '/admin/automations', label: 'Automations', roles: ['admin'] },
      { to: '/admin/ai-assistant', label: 'AI Assistant', roles: ['admin', 'dentist'] },
      { to: '/admin/tasks', label: 'Tasks', roles: ['admin', 'front', 'dentist'] }
    ]
  },
  {
    label: 'CHANNELS',
    items: [
      { to: '/admin/whatsapp', label: 'WhatsApp', roles: ['admin', 'front'] },
      { to: '/admin/qr-codes', label: 'QR Codes', roles: ['admin', 'front'] }
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/admin/inventory', label: 'Inventory', roles: ['admin', 'dentist'] },
      { to: '/admin/settings', label: 'Settings', roles: ['admin'] }
    ]
  },
  {
    label: 'AGENCY',
    items: [
      { to: '/admin/agency', label: 'Agency Mgmt', roles: ['super'] },
      { to: '/admin/website', label: 'Website Mgr', roles: ['super', 'admin'] }
    ]
  }
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(getSession());
  const [tenants, setTenants] = useState([]);

  const isSuper = session?.staff?.role === 'super';
  const role = session?.staff?.role || 'admin';

  useEffect(() => {
    // White-label theming: use the switched tenant's brand color, else the staff member's clinic
    let t = session?.tenant || null;
    if (isSuper && session?.viewTenantId) {
      t = tenants.find((x) => x.id === session.viewTenantId) || null;
    }
    applyTenantTheme(isSuper && !session?.viewTenantId ? null : t);
  }, [session?.viewTenantId, tenants, isSuper, session?.tenant]);

  useEffect(() => {
    if (isSuper) {
      api
        .get('/tenants')
        .then(setTenants)
        .catch(() => {});
    }
  }, [isSuper]);

  const logout = () => {
    clearSession();
    applyTenantTheme(null);
    navigate('/admin-login');
  };

  const switchTenant = (e) => {
    const id = e.target.value ? Number(e.target.value) : null;
    updateSession({ viewTenantId: id });
    setSessionState(getSession());
    // Reload so every module re-fetches with the new tenant scope
    window.location.reload();
  };

  const activeTenant = isSuper
    ? session?.viewTenantId
      ? tenants.find((x) => x.id === session.viewTenantId)?.name || '…'
      : 'All clinics'
    : session?.tenant?.name || 'Dental Clinic';

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-y-auto border-r bg-card">
        <Link to="/admin" className="flex items-center gap-2 border-b px-5 py-4">
          <span className="rounded-full bg-primary/10 p-2">
            <HeartPulse className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="font-bold leading-tight">DentOS</p>
            <p className="text-xs text-muted-foreground">{session?.tenant?.name || 'Dental Practice OS'}</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {groups.map((g, gi) => {
            const items = g.items.filter((item) => !item.roles || item.roles.includes(role));
            if (!items.length) return null;
            return (
              <div key={gi}>
                {g.label && (
                  <p className="mb-1 mt-4 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground">
                    {g.label}
                  </p>
                )}
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      'block rounded-md px-3 py-2 text-sm font-medium transition-colors ' +
                      (isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="ml-60 flex min-h-screen flex-1 flex-col bg-muted/30">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Search…</span>
          </div>
          <div className="flex items-center gap-4">
            {isSuper && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                <select
                  value={session?.viewTenantId || ''}
                  onChange={switchTenant}
                  className="bg-transparent text-sm font-medium outline-none"
                >
                  <option value="">All clinics</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(session?.staff?.name || 'A').slice(0, 1)}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium">{session?.staff?.name || 'Staff'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {ROLE_LABELS[role] || role} · {activeTenant}
                </p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="ml-2 rounded-md border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
