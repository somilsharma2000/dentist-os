# Field Research — Dental Practice Management Software (September 2026)

Research basis: PRD/ARCHITECTURE docs + web research across market sizing,
competitors, feature sets, compliance, and pricing.

## 1. Market
- Global dental practice-management software ≈ USD 2.0–2.9B (2024–25 est.),
  ~10% CAGR → USD 5–6B by 2031–32.
- No credible India-only figure exists; India is fragmented, price-sensitive,
  with no dominant leader and mostly paper-based clinics — an opportunity for a
  modern, low-cost entrant.

## 2. Clone source & branding
- "DentOS" maps to **Yuktii DentalOS** (Indian multi-specialty clinic
  platform) — Dentist OS is cloning an Indian entrant, not a US product.
- Brand-collision risk: three competing names in the repo (SmileCraft /
  Dentist OS / DentOS) and "DentOS" collides with Yuktii's "DentalOS".
  Clean up naming and verify clone-source licensing before commercializing.

## 3. Competitors
- **Global:** Dentrix/Ascend, Eaglesoft, Curve ($200–500/mo), tab32 (from
  $125/mo), Denticon, Oryx, CareStack, Open Dental.
- **India:** Practo Ray (₹12k–48k/yr + revenue share), Pappyjoe, DentSoft,
  **Dentospire** (AI X-ray, voice-to-SOAP, DPDPA/India-residency stance),
  **Yuktii** (free tier), **CuraVerto** (₹24,999/yr flat, FDI odontogram +
  perio, WhatsApp booking bot), Clinicea (₹2,999/doctor/mo),
  KiviHealth (~₹10–12k/yr).

## 4. Pricing benchmark
- India: **₹10k–40k/yr per clinic** or **₹1–3k/doctor/mo**. Free tiers are a
  competitive weapon. Recommended target for Dentist OS: ₹1,500–3,000/mo/clinic.

## 5. Table-stakes gaps in Dentist OS v1
- e-prescriptions ❌ · SOAP/case-sheet notes ⚠️ · perio charting ❌ ·
  imaging/X-ray ❌ (out of scope) · lab case tracking ❌ · GST invoicing ❌ ·
  UPI/online payments ⚠️

## 6. Biggest functional gap
WhatsApp/reminder sending is UI-only — but WhatsApp automation is the #1 selling
point of every serious Indian rival. The recall module can't send anything, so
the PRD's own stated problem #4 ("no recall system") is unsolved by v1.

## 7. DPDP Act 2023 compliance gaps
- No consent capture at booking (health data!), no consent entity in the data
  model, no age gate for minors (pediatric dentistry), no patient rights
  (export/erasure) flows, no breach-notification readiness, weak portal auth
  (phone-number login = guessable), no data-residency plan (Render/Railway =
  US/EU regions).

## 8. Other compliance
- NMC 3-year record retention + release-on-request: patient deletion can
  destroy legally required records — needs a retention policy.
- GST fields missing on invoices.

## 9. Architecture contradiction
"Public routes always serve tenant 1" — agency client clinic #2 gets an
isolated admin but no public website/booking/reviews, contradicting the
white-label multi-client SaaS vision.

## 10. Stack risk for a health-data SaaS
JSON-file DB, in-memory sessions, localStorage demo — Postgres/JWT/encryption
should be Phase 1, not Phase 10.

## 11. Right calls to keep
FDI tooth numbering (correct for India; Universal/ADA is the US convention),
review moderation, Lead CRM, QR, inventory, agency MRR tracking — genuine
differentiators vs Indian rivals.

## 12. Positioning watch-outs
Clean up the three competing brand names; verify clone-source licensing before
commercializing; decide on an India-residency stance (Dentospire uses it as a
selling point).
