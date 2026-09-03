import { NavLink, Outlet, Link } from 'react-router-dom';
import { HeartPulse, Phone, Mail, Clock, MapPin } from 'lucide-react';

const nav = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/team', label: 'Our Team' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/contact', label: 'Contact' }
];

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 p-2">
              <HeartPulse className="h-5 w-5 text-primary" />
            </span>
            <span className="text-lg font-bold">SmileCraft Dental Clinic</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  'text-sm font-medium transition-colors hover:text-primary ' +
                  (isActive ? 'text-primary' : 'text-muted-foreground')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/portal"
              className="hidden rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted sm:block"
            >
              Patient Portal
            </Link>
            <Link
              to="/book"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Book Now
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <HeartPulse className="h-5 w-5 text-primary" /> SmileCraft Dental Clinic
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> 12 MG Road, Bengaluru, Karnataka 560001
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" /> +91 98765 43210
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> contact@smilecraftdental.com
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> 09:00 - 18:00, Mon – Sat
            </p>
          </div>
          <div>
            <p className="font-semibold">Quick Links</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-primary" to="/services">Services</Link></li>
              <li><Link className="hover:text-primary" to="/team">Our Team</Link></li>
              <li><Link className="hover:text-primary" to="/book">Book Appointment</Link></li>
              <li><Link className="hover:text-primary" to="/reviews">Reviews</Link></li>
              <li><Link className="hover:text-primary" to="/portal">Patient Portal</Link></li>
              <li><Link className="hover:text-primary" to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">Follow Us</p>
            <p className="mt-3 text-sm text-muted-foreground">@smilecraftdental</p>
            <p className="mt-6 text-xs text-muted-foreground">
              © 2026 SmileCraft Dental Clinic. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
