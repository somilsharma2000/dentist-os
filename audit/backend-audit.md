# Backend Audit — server/ (September 2026)

25 findings from a full read of `server/index.js`, `server/api.js`, `server/db.js`,
`server/seed.js`. `node --check` passes on all files. The timezone bug was verified
empirically with Node across 4 server TZs. Status column reflects the fix pass
that followed (commit `10cf8ad`).

## CRITICAL — all fixed
- `api.js:136` — `db.save()` is not a function (`db` is the data object, not the
  module). PUT `/api/integrations` threw 500 on every call; changes never
  persisted. **Fixed: `save()`.**
- `api.js:164-165` — POST mass-assignment: `...req.body` spread last overrides
  `tenantId` and `id` → staff of clinic A could create records inside clinic B,
  or forge colliding IDs. **Fixed: sanitizeBody().**
- `api.js:184` — PUT mass-assignment: unfiltered merge let staff move their own
  records to another clinic (`{"tenantId":2}`), rewrite `id`/`created_date`, or
  null the tenant. **Fixed.**
- `api.js:53-56, 181, 199` — falsy-`tenantId` records visible/writable/deletable
  by every tenant. **Fixed: default to public tenant.**
- `api.js:348-369` — POST `/bookings` had no conflict check → guaranteed
  double-booking; also accepted past dates, non-whitelist times, invalid or
  other-tenant dentistIds, no phone validation. **Fixed: full validation + 409.**
- `api.js:28-32` — `istToday()` formula wrong: `(getTimezoneOffset()+330)` shift
  only correct on UTC servers; on an IST server it returns UTC's date (wrong
  5.5h daily). Affected dashboard today/dailySummary, review date, register
  lastVisit, trend keys. **Fixed: Intl Asia/Kolkata. Empirically re-verified
  across UTC / America/New_York / Asia/Kolkata.**

## HIGH — all fixed or explicitly documented
- `api.js:388-402` — Portal login phone-only: full profile incl. clinical notes,
  no OTP, no rate limit. **Partially fixed for demo (notes stripped, phone
  normalized); OTP/PIN still required before real deployment.**
- `api.js:72-84` — Staff login: no rate limit/lockout, plaintext compare, plus
  `undefined !== undefined` bypass on passwordless staff + empty login.
  **Fixed: rate limit + empty-password guard.**
- `api.js:68-70, 82` — Tokens from `Math.random()` (predictable), sessions never
  expire, stale staff snapshot (demoted/moved staff keep old role until
  re-login). **Fixed: crypto tokens + 12h expiry. (Session snapshot is inherent
  to in-memory sessions; swap for JWT before production.)**
- `db.js:29-40` — `writeFileSync` non-atomic (crash mid-write corrupts db.json) +
  bare `JSON.parse` at module load → corrupted file means server won't boot.
  **Fixed: tmp+rename atomic write; corrupted file backed up + reseeded.**
- `api.js:338-346` — `/slots` counted Cancelled/No-show appointments as booked
  (slots falsely unavailable); no date validation. **Fixed.**

## MEDIUM — all fixed
- No input validation (negative invoice amounts fed revenue; rating not
  range-checked `api.js:378`; unbounded field sizes). **Fixed per-table.**
- Dashboard 500s on records it lets users create (`a.time.localeCompare` 246,
  `i.date.slice` 280). **Fixed: null-safe.**
- Trend months used 30-day steps → could skip a month (`api.js:274-277`).
  **Fixed: calendar iteration.**
- `weekAgo` UTC vs IST-day inconsistency (286). **Fixed: istDaysAgo(7).**
- Connector secrets stored plaintext and returned via GET `/api/integrations`
  (121-138). **Fixed: masking + round-trip preservation.**
- Portal register `age||null` bug (404-416); phone squatting 409 kept.
  **Fixed.**
- Viewless super silently wrote to tenant 1 (`tid()||PUBLIC_TENANT` 164, 212).
  **Fixed: 400 "Pick a clinic first."**
- Revenue matched exact string `'Paid'` only (250). **Fixed: case-insensitive.**
- `seed.js` requires the client source tree at boot (demoData.json) — accepted:
  single source of truth for demo/server parity.
- Tooth chart global-per-tenant, `NaN` tooth accepted (325-335). **Fixed:
  FDI + state validation.**

## LOW — accepted / noted
- No helmet/CORS (fine same-origin; add helmet when deployed publicly).
- No pagination or central error wrapper.
- `toothChartStates` outside generic CRUD (fine).
- `db.reset()` unlinks the live DB — must never be exposed via a route (it isn't).

## Demo-intentional vs broken
Plaintext seed passwords, in-memory sessions, phone-only portal, JSON-file
storage = demo-intentional (documented in README + AUDIT-FIXES). The
`db.save()` typo, istToday() formula, missing booking conflict check, and
POST/PUT mass-assignment were unambiguously real bugs — all fixed.
