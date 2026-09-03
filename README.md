# Dentist OS

A complete, self-hostable dental practice management platform — public clinic website + 20-module admin OS (DentOS). Faithful rebuild of the SmileCraft Dental Clinic app.
**Live demo:** https://somilsharma2000.github.io/dentist-os/ — fully working in-browser demo (data persists in your browser localStorage; admin at `/#/admin`)


**No proprietary platform needed** — plain React + Express, runs anywhere Node runs.

## Quick start

```bash
npm install
npm run dev
```

- Public site: http://localhost:3000
- Admin panel: http://localhost:3000/admin
- API server: http://localhost:4000 (proxied automatically)

The database (`server/db.json`) is seeded automatically on first run with realistic clinic data (patients, appointments, invoices, reviews, leads, inventory, automations…).

## Production

```bash
npm run build     # builds the frontend into dist/
npm start         # serves API + frontend on one port
```

Deploy anywhere that runs Node 18+ (Render, Railway, Fly.io, a VPS). Set `PORT` if needed. Data persists in `server/db.json` — swap in SQLite/Postgres later if you like.

## What's inside

### Public-facing site (`/`)
- Landing page (hero, services, testimonials)
- Services with pricing
- Our Team (dentist profiles)
- **Reviews** — moderated: submissions land as `pending` in admin, with a visible success confirmation
- Contact page
- **6-step booking wizard** — service → dentist → date (validated, IST) → time slot (conflict-checked) → details → confirm
- **Patient portal** — phone-number login (auto-registration for new patients), showing appointments, treatment plans, and invoices

### Admin — DentOS (`/admin`)
| Area | Modules |
|---|---|
| Overview | **Dashboard** — today's schedule, revenue, goals tracking, lead pipeline, tasks, revenue trend chart, low-stock alerts |
| Clinical | Patients · Appointments · Treatment Plans · **Interactive Tooth Chart** (FDI, 6 states) · Dentists |
| Financial | Invoices (paid/pending/overdue, mark-paid) |
| Marketing | Lead CRM (pipeline by status + score) · Social Media · Reviews (moderation + responses) · Recall |
| Automation | Automations (10 rules with toggles + run stats) · AI Assistant (practice Q&A) · Tasks |
| Communication | WhatsApp inbox (demo, 2-pane chat) · QR Codes (generated client-side, download PNG) |
| Management | Inventory (low-stock tracking + restock) · Settings (clinic profile, services, goals) |
| Super Admin | Agency Mgmt (multi-clinic MRR) · Website Mgr (hero/tagline editing) |

### API
REST endpoints under `/api` — generic CRUD for every table, plus:
- `GET /api/dashboard` — aggregated stats (IST-correct dates)
- `POST /api/bookings` — creates/finds patient + appointment
- `POST /api/reviews/public` — public review → moderation queue
- `POST /api/portal/login` / `register` — phone-based portal auth
- `GET /api/slots?date=&dentistId=` — availability with conflict checks

## Notable fixes vs. the original build

- **Dates & times are IST everywhere** — no UTC drift in daily summaries or schedules
- **Booking wizard date validation** — empty date blocks continue with a visible error
- **Review submission feedback** — success message after submit (original was silent)
- Indian number/date formatting (`₹5,00,000`, `3 Sept 2026`)

## Tech stack

React 18 · Vite · Tailwind CSS (shadcn-style tokens) · lucide-react · recharts · qrcode — Express · JSON-file storage (zero native deps)

## Project structure

```
client/src/
  components/   ui kit + public/admin layouts
  lib/          api client + formatters
  pages/public/ Home, Services, Team, Reviews, Contact, Book, Portal
  pages/admin/  20 modules
server/
  index.js      Express app (API + static serving)
  api.js        REST routes + dashboard aggregation
  seed.js       Realistic seed data (mirrors the original app)
  db.js         JSON-file persistence
```
