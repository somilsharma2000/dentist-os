# PRD — Dentist OS

**Product:** Dentist OS (public brand: **SmileCraft Dental Clinic**)
**Version:** 1.0 (rebuild)
**Last updated:** 2026-09-04

---

## 1. Vision

Dentist OS is a complete, cloud-based **dental clinic operating system** — a public patient-facing website plus a full clinic-admin platform ("DentOS"). It is built to be **white-label and sellable**: a single codebase that an agency can deploy per-client clinic (multi-client SaaS model).

## 2. Problem

Indian dental clinics run on paper or fragmented tools:
- No online booking → phone-only scheduling, no-shows
- No patient records history → treatment decisions from memory
- No review management → Google/WhatsApp reviews go unanswered
- No recall system → 6-month cleaning patients are never re-invited
- Manual billing → lost revenue and unpaid balances

## 3. Target users (Actors)

| Actor | Description |
|---|---|
| **Patient** | Books appointments, logs into portal, reads/writes reviews |
| **Receptionist** | Manages appointments, patients, billing, recalls daily |
| **Dentist** | Treatment plans, tooth chart, clinical notes |
| **Clinic Owner / Admin** | Dashboard, revenue goals, settings, team |
| **Agency Owner** | Multi-client management, MRR tracking (Agency module) |

## 4. Feature requirements

### 4.1 Public site (patient-facing)
1. **Landing page** — hero, services overview, testimonials, clinic info (address, hours, phone)
2. **Services page** — 9 services with prices (₹, INR formatting), descriptions
3. **Our Team page** — dentist profiles with specialties and working days
4. **Reviews page** — published reviews, average rating, star distribution; "Leave a Review" → moderation queue (not auto-published)
5. **Contact page** — address, phone, email, hours, embedded map
6. **Booking wizard (6 steps)** — Service → Dentist (incl. "No Preference") → Date (quick-pick chips + calendar, past dates blocked) → Time slot (45-min slots, 9:00–18:00 IST, lunch break, booked slots disabled) → Patient details (validated name + 10-digit phone) → Confirm → success screen
7. **Patient portal** — phone-number login → appointment history, upcoming visits, invoices

### 4.2 Admin platform — DentOS (20 modules)

| # | Module | Core requirement |
|---|---|---|
| 1 | Dashboard | Today's appointments, pending payments, revenue chart, goal metrics |
| 2 | Patients | CRUD, history, portal-linked records |
| 3 | Appointments | Calendar/list, statuses (Scheduled/Confirmed/Completed/Cancelled), new appointment modal with date+time |
| 4 | Treatment Plans | Multi-step plans with per-step fees |
| 5 | Tooth Chart | Interactive FDI tooth grid, click → condition, procedures per tooth |
| 6 | Dentists | Profiles, specialties, working days |
| 7 | Invoices | Create, mark paid, track pending balances |
| 8 | Lead CRM | Pipeline stages, lead sources |
| 9 | Social Media | Post calendar / channel management |
| 10 | Reviews (admin) | Moderation queue: approve/publish/reject + reply |
| 11 | Recall | 6-month cleaning reminders, due lists |
| 12 | Tasks | Internal to-dos, assignee, due dates |
| 13 | Automations | Trigger→action rules (e.g. post-visit review request), execution stats |
| 14 | Inventory | Items with stock levels, low-stock alerts |
| 15 | AI Assistant | Patient-chat drafts + clinical Q&A suggestions |
| 16 | WhatsApp Inbox | Conversation threads, reply drafting |
| 17 | QR Codes | Generate QR for reviews/booking links |
| 18 | Settings | Clinic profile, services list, hours, goals |
| 19 | Agency Management | Multi-client clinics, plan, MRR |
| 20 | Website Manager | Public site content editing |

### 4.3 Non-functional requirements
- **All dates/times IST** (Asia/Calcutta). Local times stored as IST strings — never UTC-converted.
- **Currency:** ₹ with Indian digit grouping (`en-IN`), only on money fields.
- **Mobile-first** public site; admin usable on tablet and up.
- **Demo mode:** static build runs fully in-browser (localStorage) for sales demos without a server.

## 5. Out of scope (v1)
- Real WhatsApp Cloud API / SMS sending (UI + drafting only)
- Online payments / payment gateway
- X-ray image storage, DICOM
- Multi-language UI
- Actual multi-tenant auth (single clinic instance; agency model tracked in Agency module only)

## 6. Success metrics
- Zero blank-date or invalid bookings (validation on every wizard step)
- Review response time < 24h (via moderation queue + automations)
- Booking → confirmation visible in admin Appointments within 1 refresh
- Clinic can run a full day (book → treat → invoice → recall) inside the product

## 7. Open items (production blockers)
- Deploy server build to Render/Railway (static Pages demo is live)
- Real-device test of booking wizard (native date picker + chips)
- Wire review/booking notifications to real SMS/WhatsApp providers


## Multi-tenant SaaS features (Phase 11)

As an agency, I can onboard client clinics so each gets an isolated workspace:
- Clinic staff sign in with email/password; their data (patients, appointments, invoices, leads, reviews, tasks, inventory, QR codes, WhatsApp threads) is visible only to their clinic.
- Role-based access: Receptionists manage front-desk modules; Dentists see clinical modules; Clinic Admins manage everything; the Agency Owner oversees all clinics with a tenant switcher and Agency Mgmt (plans, MRR, renewals).
- White-label: each clinic's brand color themes their admin workspace.
