# Phases — Dentist OS Roadmap

**Last updated:** 2026-09-04
The full product is too large for one pass, so it is delivered in phases. Status legend: ✅ done · 🔶 in progress · ⬜ not started

---

## Phase 0 — Documentation 🔶
PRD, Architecture, Rules, Phases (this folder). **PRD ✅ · Architecture ✅ · Rules ✅ · Phases ✅**

## Phase 1 — Public site ✅
Landing, Services, Team, Reviews, Contact, footer/header, mobile layout.

## Phase 2 — Booking wizard ✅
6-step wizard, slot engine (45-min, lunch break, booked-slot lockout), validation on every step, quick-pick date chips, IST dates.
*Remaining punch-list: confirm-screen service row check, seed phones → 10-digit consistency (see Phase 8).*

## Phase 3 — Patient portal ✅
Phone login, appointment history, invoices scoped to patient.

## Phase 4 — Admin core ✅
Dashboard (today's appts, pending ₹, revenue chart, goals), Patients, Appointments, Dentists CRUD.

## Phase 5 — Clinical suite ✅
Treatment Plans, interactive Tooth Chart (FDI numbering), Invoices with payment status.

## Phase 6 — Growth suite ✅
Lead CRM, Social Media, Reviews moderation, Recall, QR Codes.

## Phase 7 — Operations suite ✅
Tasks, Inventory, Automations (rule engine UI), AI Assistant, WhatsApp inbox UI, Settings, Agency Management, Website Manager.

## Phase 8 — QA & audit 🔶 (current)
- ✅ Home + dashboard verified in real browser (correct data, IST)
- ✅ Wizard steps 1–4, date validation, date chips live-tested
- ✅ Slot engine verified (9:00–17:45, lunch gap, no double-booking)
- ✅ IST times everywhere (15:30 stays 15:30 — original app's 21:30 bug fixed)
- ✅ ₹ on money fields only
- ✅ Full booking → confirm screen end-to-end (Test Patient, 5 Sept 09:00 → synced to admin Appointments)
- ✅ Review submit → moderation queue → publish → public round-trip (4.8★/4 consistent)
- ✅ Seed patient phones fixed to true 10-digit (9876500111–0999; earlier sed had over-stripped to 9 digits); demo LS key bumped to v2 for auto re-seed
- ✅ Portal login live-tested (Arjun Kapoor, 9876500111 → dashboard with appts 15:30 IST, plans, invoices)
- ✅ Admin spot-checks: Tooth Chart (16 → Root Canal, color persists), AI Assistant (Today's schedule reply, IST), Settings (all sections render)
- ✅ QR generation spot-check (New QR → label + URL → Generate → scannable image renders, persists)
- ⬜ Real-device test of booking wizard (native date picker)

## Phase 9 — Production deployment ⬜
- Provision Render/Railway service, `npm run build && npm start`
- Environment variables for port; persistent disk for JSON DB (or managed Postgres)
- Custom domain + HTTPS
- Move live demo link to production URL in README

## Phase 10 — Real integrations ⬜
- WhatsApp Cloud API (send/receive real messages; portal notifications)
- SMS gateway (booking confirmations, recall reminders)
- Payment gateway (invoice payment links — Razorpay)
- Email service (review requests, no-show follow-ups)

## Phase 11 — Multi-tenant SaaS ⬜
- Real auth: clinic staff login + roles (admin/receptionist/dentist)
- Per-clinic data isolation (tenant_id on every record)
- Agency dashboard: onboard client, per-client billing, MRR reporting
- White-label theming per client (brand color, logo, name)
- Postgres migration for production DB

---

**Next action:** finish Phase 8 punch-list, then Phase 9.
