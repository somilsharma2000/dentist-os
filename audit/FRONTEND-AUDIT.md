# Dentist OS — Full Audit & Fixes (September 2026)

Field, backend, and frontend audit of the entire codebase, followed by fixes.
All backend fixes were verified empirically against a running server, and both
builds (`npm run build`, `npm run build:demo`) pass after every change.

Related reports: `audit/backend-audit.md` (25 findings), `audit/field-research.md`
(market/competitors/compliance), `docs/AUDIT-FIXES.md` (user-facing change log).

---

## Fixed — Critical

| # | Bug | Where | Fix |
|---|-----|-------|-----|
| 1 | **Double-booking** — `POST /bookings` had no conflict check; two patients could book the same dentist+date+time | `server/api.js`, `client/src/lib/api-demo.js` | Conflict check on submit (`isSlotStillOpen`), returns 409 with a clear message. Cancelled/No-show appointments no longer block slots. Verified: second identical booking now rejected. |
| 2 | **Mass-assignment (POST)** — request body spread last, so clients could set `id` (colliding IDs) and `tenantId` (inject records into ANOTHER clinic) | both API layers | `sanitizeBody()` strips `id`, `created_date`, `tenantId`; tenant always stamped from the session. Super admins may still assign `tenantId` (needed to create staff). |
| 3 | **Mass-assignment (PUT)** — could move records across tenants (`{"tenantId":2}`), rewrite `id`/`created_date` | both API layers | Same stripping + tenant ownership check on every update. Verified: tenant-hop attempt leaves `tenantId` untouched; cross-tenant write → 403. |
| 4 | **Falsy-tenantId leak** — records without `tenantId` were visible/writable/deletable by EVERY tenant | `sc()` and PUT/DELETE checks in both API layers | Records without `tenantId` now default to the public tenant (1) and are owned like any other. |
| 5 | **`db.save()` typo** — `db` is the data object, not the module → PUT `/integrations` threw 500 every time and never persisted | `server/api.js` | Calls `save()`; verified 200 + persistence. |
| 6 | **IST date helper was wrong on non-UTC servers** — `(getTimezoneOffset()+330)` arithmetic returns UTC's date when the server runs IST (or any non-UTC/non-IST zone), corrupting daily summaries, trends, review dates and `lastVisit` | `server/api.js` (`istToday`), `client/src/lib/utils.js` (`todayISO`, `next7Days`), `api-demo.js` | Replaced with `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })`. Verified identical IST date across UTC / America/New_York / Asia/Kolkata server TZs at 23:28 UTC (04:58 IST next day). |
| 7 | **No booking validation** — API accepted past dates ("2020-01-01"), invalid times ("25:99"), invalid phones ("12345"), other-tenant dentist IDs | `server/api.js`, `api-demo.js` | Full validation: ISO date ≥ today (IST), whitelist of 11 real slots, 10-digit Indian mobile (formats like `+91 98765 00111` normalized), dentist must belong to the public clinic. |
| 8 | **Demo POST lacked super-role check** — any clinic admin could create tenants/staff records in demo mode | `api-demo.js` `routePost` | `requireSuper()` on super tables, matching the server. |

## Fixed — High

| # | Bug | Where | Fix |
|---|-----|-------|-----|
| 9 | **Staff login bypass** — `undefined !== undefined`: empty password against a passwordless staff record authenticated | both API layers | Reject empty/missing password. Verified 401. |
| 10 | **Predictable, never-expiring tokens** — `Math.random()` tokens, sessions live forever, stale staff snapshot survives demotion | `server/api.js` | `crypto.randomBytes` tokens, 12h expiry enforced on every request, rate limiting (10 attempts/min per email+IP), suspended clinics can't log in. |
| 11 | **Non-atomic DB writes** — crash mid-`writeFileSync` corrupts `db.json`; corrupted file crashed the server on boot | `server/db.js` | Atomic write via temp file + rename; corrupted file is backed up (`.corrupt`) and reseeded with a logged error instead of a boot crash. |
| 12 | **Connector secrets returned in plaintext** — GET `/integrations` handed API keys back to the client | `server/api.js` | Secret-like config keys (apiKey/token/secret/password) are masked (`••••••••`); masked values round-trip without overwriting the stored secret. Verified preserved. |
| 13 | **Portal exposed clinical notes** — phone-only portal login returned the internal `notes` field | both API layers | `notes` stripped from portal responses (portal UI doesn't use it). |

## Fixed — Medium

| # | Bug | Where | Fix |
|---|-----|-------|-----|
| 14 | Dashboard 500s on records the API itself allows: `a.time.localeCompare` on null time, `i.date.slice` on missing date | `server/api.js`, `api-demo.js` | Null-safe sorts/slices. |
| 15 | Revenue matched exact string `'Paid'` only; pending matched `'Pending'` only | dashboard, both layers | Case-insensitive status comparison. |
| 16 | 6-month trend used 30-day steps — could skip or duplicate calendar months | both layers | Proper `lastMonths(6)` calendar-month iteration. |
| 17 | `weekAgo` used UTC while everything else used IST | both layers | `istDaysAgo(7)`. |
| 18 | Invoice numbers collided — `INV-<year>-<count+1>` reuses numbers after deletions and collides across tenants | `client/src/pages/admin/Invoices.jsx` | Derive from max existing sequence for the year. |
| 19 | Responding to a published review flipped status to `'responded'` — silently UNPUBLISHING it from the public site | `client/src/pages/admin/ReviewsAdmin.jsx` | Response keeps the publication status. |
| 20 | Portal "today" used UTC date — on IST machines 00:00–05:29, tomorrow's appointment showed as past | `client/src/pages/public/Portal.jsx` | Uses IST `todayISO()`. |
| 21 | Review rating not range-checked (99 stars accepted); unbounded field lengths | both layers | Rating integer 1–5; name/text/phone length caps. |
| 22 | `age: age || null` turned age 0 into null | portal register, both layers | Proper null/empty handling. |
| 23 | Tooth chart accepted invalid tooth numbers (e.g. 999) and arbitrary states | both layers | FDI validation (quadrant 1–8, tooth 1–8) + 6-state whitelist. |
| 24 | Negative/NaN invoice amounts fed straight into revenue totals | both layers | Amount must be a finite number ≥ 0. |
| 25 | Super admin without a picked clinic silently wrote into tenant 1 | both layers | 400 "Pick a clinic first." |

## Flagged — accepted demo behavior (documented, needs hardening before real use)

- **Phone-only portal auth.** Anyone with a patient's phone number sees their
  appointments, treatment plans, and invoices. Fine for a demo; **must** become
  OTP or PIN before real deployment (DPDP Act exposure for health data).
- Plaintext seed passwords, in-memory sessions, JSON-file storage — demo-grade
  by design. Swap for hashed passwords + JWT + Postgres before production.
- No SMS/WhatsApp actually sends — recall automation is UI-only today.

## Field research highlights (full detail in `audit/field-research.md`)

- Market: global dental PMS ≈ USD 2.0–2.9B (2024–25), ~10% CAGR. India is
  fragmented and price-sensitive with no dominant leader.
- Indian competitors: Practo Ray, Dentospire (AI X-ray, DPDPA stance), CuraVerto
  (₹24,999/yr), Pappyjoe, DentSoft, Clinicea, KiviHealth, Yuktii. Benchmark
  pricing: ₹1,000–3,000/clinic/month.
- Table-stakes gaps in Dentist OS v1: e-prescriptions, SOAP notes, perio
  charting, GST invoicing, lab case tracking, real WhatsApp sending.
- Compliance gaps: no consent capture (DPDP Act), no age gate for minors,
  NMC 3-year record retention vs patient deletion, no data-residency plan.
- Architecture contradiction: only tenant 1 gets the public site, but the
  product pitch is white-label websites for every agency client.
