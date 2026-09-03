# Architecture — Dentist OS

**Last updated:** 2026-09-04

---

## 1. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| UI | React 18 + Vite | SPA, two routers in one app (`HashRouter` for the static demo) |
| Styling | Tailwind CSS | shadcn-style tokens (`card`, `muted`, `primary`), teal brand |
| Charts | recharts | Admin dashboard revenue chart |
| QR | qrcode | Client-side QR generation |
| Icons | lucide-react | No emoji as UI icons |
| Server | Express (Node) | REST API, JSON-file DB (`server/db.js`) |
| Data (dev) | JSON file store | Swap-ready for PostgreSQL/Mongo in Phase 10 |
| Demo | In-browser shim | `api-demo.js` — localStorage DB, no server needed |

**Two build modes:**
- `npm run build` + `npm start` → full-stack (client + Express API), for Render/Railway
- `npm run build:demo` (`VITE_DEMO=1`) → static bundle using `api-demo.js`, deployed to GitHub Pages

## 2. Actors and flows

### 2.1 Booking flow
```
Patient → /book → Service → Dentist (or "No Preference")
       → Date (quick-pick chips / calendar, min = today IST)
       → GET /api/slots?dentistId&date → 45-min grid, booked slots disabled
       → Details (name*, 10-digit phone*, email, notes)
       → Confirm → POST /api/bookings → Status: Scheduled
       → Admin Appointments + Dashboard (same day)
```

### 2.2 Review moderation flow
```
Patient → Reviews page → "Leave a Review" → modal → POST /api/reviews/public (status: pending)
Admin → Reviews module → approve/publish → visible on public Reviews page
        → optional clinic reply (shown with the review)
```

### 2.3 Patient portal flow
```
Patient → /portal → phone-number login (matches Patients record)
       → upcoming appointments + history + invoices (scoped to that patient)
```

### 2.4 Billing flow
```
Appointment (Completed) → Invoice (fee from treatment/service) → mark Paid / Pending
Dashboard aggregates: pending ₹, monthly revenue, goal metrics
```

### 2.5 Recall flow
```
Last visit + 6 months → Recall due list → send reminder (WhatsApp/SMS in v2)
```

## 3. Data model (server/seed.js)

`settings` (clinic profile, services, hours, goals) · `dentists` · `patients` · `appointments` · `treatmentPlans` · `invoices` · `leads` · `reviews` · `recalls` · `tasks` · `automations` · `inventory` · `whatsappThreads` · `agencyClients`

Key conventions:
- **Dates:** `YYYY-MM-DD` IST strings. **Times:** `HH:mm` 24-h IST strings. No Date objects persisted, no UTC.
- **Money:** integer rupees. Display via `formatINR()`.
- Every record: `id` (int), auto fields `created_date`/`updated_date` where applicable.

## 4. Folder structure

```
dentist-os/
├── client/src/
│   ├── App.jsx                  # Routes (public + /admin/*)
│   ├── main.jsx
│   ├── index.css                # Tailwind + token vars
│   ├── components/
│   │   ├── PublicLayout.jsx    # Public header/nav/footer
│   │   ├── AdminLayout.jsx     # DentOS sidebar (20 modules)
│   │   └── ui.jsx              # Button, Card, Modal, Input, Badge, Avatar, StarRating, Table
│   ├── lib/
│   │   ├── api.js              # REST client → Express API
│   │   ├── api-demo.js         # localStorage shim, mirrors api.js surface
│   │   ├── demoData.json       # Seed snapshot for demo mode
│   │   └── utils.js            # formatINR, formatDate (IST), todayISO, next7Days
│   └── pages/
│       ├── public/             # Home, Services, Team, Reviews, Contact, Book, Portal
│       └── admin/              # 20 DentOS modules (one file per module)
├── server/
│   ├── index.js                # Express bootstrap, serves built client in prod
│   ├── api.js                  # All REST routes
│   ├── db.js                   # JSON-file store (read/write/persist)
│   └── seed.js                 # Seed data (IST dates, realistic clinic)
├── docs/                       # PRD, ARCHITECTURE, RULES, PHASES (this folder)
├── index.html · vite.config.js · tailwind.config.js · package.json
```

## 5. API surface (summary)

`GET/PUT /api/settings` · `GET /api/dentists` · `GET/POST/PUT/DELETE /api/patients` · `GET/POST/PUT /api/appointments` · `GET /api/slots?dentistId&date` · `POST /api/bookings` · `GET/POST/PUT /api/invoices` · `GET /api/reviews` · `POST /api/reviews/public` · `GET/PUT /api/reviews/:id/moderate` · plus module endpoints for leads, recalls, tasks, automations, inventory, whatsapp, agency.

All mutations validate input server-side and return `{ error }` with proper status codes.

## 6. Environments

| Environment | URL | Notes |
|---|---|---|
| Live static demo | https://somilsharma2000.github.io/dentist-os/ | localStorage data, resets on refresh seed |
| Admin demo | /#/admin (same URL) | Full DentOS |
| Dev | `npm run dev` | Vite :3000, API :4000 |
| Production (Phase 9) | Render/Railway | `npm run build && npm start` |

## 7. Deployment pipeline

```
main push → build:demo → dist/ → force-push to gh-pages branch
```
Server deployment target: Render/Railway with `start` script; JSON DB on persistent disk (or managed Postgres in Phase 10).
