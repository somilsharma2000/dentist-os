# Audit & Hardening Changelog — September 2026

Full-stack audit of Dentist OS (backend, frontend, demo mode, field research)
followed by fixes. Detailed findings: `../audit/FRONTEND-AUDIT.md`,
`../audit/backend-audit.md`, `../audit/field-research.md`.

## Security fixes (both `server/` and the in-browser demo mode)

- **Booking conflicts:** `POST /bookings` now rejects double-booked slots (409)
  and no longer counts Cancelled/No-show appointments as booked.
- **Mass-assignment closed:** clients can no longer set `id`, `created_date`, or
  `tenantId` on generic CRUD routes. Records are always stamped with the staff
  session's clinic. Cross-tenant reads/writes/deletes are 403. Records without
  a `tenantId` now belong to the public clinic instead of being world-readable.
- **Auth hardening:** crypto-random 12h session tokens, login rate limiting,
  suspended-clinic lockout, empty-password bypass fixed, super-only guards on
  tenants/staff in demo mode too.
- **Connector secrets** are masked in API responses and survive round-trips.

## Correctness fixes

- **IST everywhere, correctly.** All "today"/week/month calculations (server
  dashboard, demo dashboard, portal, booking) now use
  `Intl.DateTimeFormat(..., { timeZone: 'Asia/Kolkata' })`. The previous
  offset-arithmetic was wrong on any non-UTC server and in IST browsers
  between 00:00–05:29.
- **Trend chart** iterates real calendar months (no skipped months).
- **Invoice numbers** derive from the max existing sequence — no reuse after
  deletion, no cross-tenant collisions.
- **Review responses** no longer unpublish published reviews.
- **Portal "today"** uses IST, so early-morning IST visitors see upcoming
  appointments correctly.
- Validated: booking dates/times/phones/dentists, review ratings (1–5),
  tooth-chart FDI numbers and states, invoice amounts (≥ 0).
- **Atomic DB writes** + corrupted-file recovery instead of boot crashes.
- Portal login no longer returns internal clinical notes; accepts
  `+91`-formatted phone input.

## Known demo limitations (by design, must harden before production)

- Portal login is phone-number-only (needs OTP/PIN before real patients use it).
- Plaintext seed passwords, in-memory sessions, JSON-file storage.
- Recall/WhatsApp automations don't actually send anything yet.

## Field research summary

Market ≈ USD 2.0–2.9B globally, ~10% CAGR; India fragmented with no leader.
Competitive benchmark: ₹1,000–3,000/clinic/month (Practo Ray, Dentospire,
CuraVerto, Pappyjoe, KiviHealth…). Priority roadmap gaps: e-prescriptions,
SOAP notes, perio charting, GST invoicing, real WhatsApp sending, DPDP consent
capture + age gate, NMC record retention. See `../audit/field-research.md`.
