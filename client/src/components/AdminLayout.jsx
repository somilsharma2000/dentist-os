import { NavLink, Outlet, Link } from 'react-router-dom';
import { HeartPulse, Search, Bell } from 'lucide-react';

const groups = [
  { label: null, items: [{ to: '/admin', label: 'Dashboard', end: true }] },
  {
    label: 'CLINICAL',
    items: [
      { to: '/admin/patients', label: 'Patients' },
      { to: '/admin/appointments', label: 'Appointments' },
      { to: '/admin/treatment-plans', label: 'Treatment Plans' },
      { to: '/admin/tooth-chart', label: 'Tooth Chart' },
      { to: '/admin/dentists', label: 'Dentists' }
    ]
  },
  { label: 'FINANCIAL', items: [{ to: '/admin/invoices', label: 'Invoices' }] },
  {
    label: 'MARKETING',
    items: [
      { to: '/admin/leads', label: 'Lead CRM' },
      { to: '/admin/social', label: 'Social Media' },
      { to: '/admin/reviews', label: 'Reviews' },
      { to: '/admin/recall', label: 'Recall' }
    ]
  },
  {
    label: 'AUTOMATION',
    items: [
      { to: '/admin/automations', label: 'Automations' },
      { to: '/admin/ai-assistant', label: 'AI Assistant' },
      { to: '/admin/tasks', label: 'Tasks' }
    ]
  },
  {
    label: 'COMMUNICATION',
    items: [
      { to: '/admin/whatsapp', label: 'WhatsApp' },
      { to: '/admin/qr-codes', label: 'QR Codes' }
    ]
  },
  {
    label: 'MANAGEMENT',
    items: [
      { to: '/admin/inventory', label: 'Inventory' },
      { to: '/admin/settings', label: 'Settings' }
    ]
  },
  {
    label: 'SUPER ADMIN',
    items: [
      { to: '/admin/agency', label: 'Agency Mgmt' },
      { to: '/admin/website', label: 'Website Mgr' }
    ]
  }
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-y-auto border-r bg-card">
        <Link to="/admin" className="flex items-center gap-2 border-b px-5 py-4">
          <span className="rounded-full bg-primary/10 p-2">
            <HeartPulse className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="font-bold leading-tight">DentOS</p>
            <p className="text-xs text-muted-foreground">Dental Practice OS</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.label && (
                <p className="mb-1 mt-4 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground">
                  {g.label}
                </p>
              )}
              {g.items.map((item) => (
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
          ))}
        </nav>
      </aside>

      <div className="ml-60 flex min-h-screen flex-1 flex-col bg-muted/30">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Search…</span>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                A
              </span>
              <span className="text-sm font-medium">Admin</span>
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
