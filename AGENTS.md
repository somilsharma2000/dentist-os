# AGENTS.md — Dentist OS Agent Handoff

Read this first if you are an AI agent (or human) picking up this project. It contains everything needed to work on it safely and effectively. Detailed specs live in `docs/`.

## What this project is

**Dentist OS ("DentOS")** — a full-stack dental clinic management suite with a public marketing/booking site for **SmileCraft Dental Clinic, Bengaluru**. It is being built as a sellable multi-tenant SaaS product (see the Agency Management module and Phase 11 in `docs/PHASES.md`).

- **Repo:** https://github.com/somilsharma2000/dentist-os
- **Live demo (static build, in-browser API):** https://somilsharma2000.github.io/dentist-os/ — public site at `/`, admin at `/#/admin`, patient portal at `/#/portal`

## Golden rules for any AI working here

1. **Docs first.** Read `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RULES.md`, `docs/PHASES.md` before making changes. Update `docs/PHASES.md` when completing punch-list items or starting a phase. No large-scale changes without a doc update.
2. **AI boundaries (from `docs/RULES.md`):** no autonomous publishing of reviews, no pricing changes, no unscheduled deployments — all require explicit owner approval.
3. **Timezone: IST everywhere.** Dates and times must display in Asia/Calcutta, within clinic hours 09:00–18:00. (A past bug displayed 21:30/23:30 due to UTC conversion — don't regress it.)
4. **Money:** ₹ prefix on money fields only. Counts (patients, treatments, reviews) are plain numbers, never ₹.
5. **Phone numbers are 10-digit Indian mobiles** (e.g. `9876500111`). Seed data was once 11-digit, then accidentally over-stripped to 9-digit — both are bugs; keep everything exactly 10 digits.
6. **Headless testing quirk:** raw CDP/browser fill commands do **not** fire React `onChange`, so a failed headless form submission is usually a *testing artifact, not an app bug*. Use typed keystroke actions (e.g. browser automation "type" actions) or a real browser/device to verify forms.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, recharts, qrcode, react-router (HashRouter) |
| Backend | Express, JSON-file DB (`server/data/`), seeded from `server/seed.js` |
| Demo mode | `client/src/lib/api-demo.js` — in-browser API shim mirroring `server/api.js`; data seeded from `client/src/lib/demoData.json`, persisted in localStorage key `dentos-demo-db-v2` |

Two build modes:
- **Server mode:** `npm run build` + `npm start` → real Express API on :4000, site on :3000. Use for Render/Railway.
- **Demo mode:** `npm run build:demo` (VITE_DEMO=1, base `/dentist-os/`) → static `dist/` served by GitHub Pages. All writes go to localStorage.

## Commands

```bash
npm install
npm run dev          # dev: site :3000, admin /admin, API :4000 (run in tmux — it's long-lived)
npm run build         # production server-mode build
npm run build:demo    # static demo build → dist/
```

**Deploy (demo):** `cd dist && git add -A && git commit && git push --force <remote> HEAD:gh-pages`. There is **no GitHub Actions workflow** — deployment is a direct push to the `gh-pages` branch; GitHub Pages' own build status (repo Pages API `"status": "built"`) is the deploy status. Pages rebuild takes ~1–2 min; wait for it before testing a fresh deploy.

**Deploy (production, Phase 9 — not done yet):** Render/Railway, `npm run build && npm start`, persistent disk for the JSON DB (or migrate to Postgres per Phase 11).

## Demo logins (seed data)

| Role | Credential |
|---|---|
| Patient portal | Phone `9876500111` (Arjun Kapoor), `9876500222` (Sneha Iyer) … `9876500999`; Kavya Menon: `9876501010`; Rohit Verma: `9811002233` |
| Admin | No auth — open at `/#/admin` (auth arrives in Phase 11) |

## Project status (as of 4 Sep 2026 — keep `docs/PHASES.md` as the source of truth)

- Phases 1–7 complete: public site, 6-step booking wizard, patient portal, all admin modules (Dashboard, Patients, Appointments, Dentists, Treatment Plans, Tooth Chart, Invoices, Lead CRM, Social, Reviews, Recall, Tasks, Inventory, Automations, AI Assistant, WhatsApp inbox UI, QR Codes, Settings, Agency Mgmt, Website Mgr).
- Phase 8 (QA) nearly done. **Verified live in a real browser:** booking wizard end-to-end incl. confirmation screen, review submit → moderation → publish round-trip, portal login (Arjun), Tooth Chart click/save/color persist, AI Assistant (correct IST replies), Settings rendering, IST everywhere, ₹ on money only.
- **Remaining:** QR generation spot-check; real-device booking test (native date picker); Phase 9 production deploy (Render/Railway); Phase 10 real integrations (WhatsApp Cloud API, SMS gateway, Razorpay, email); Phase 11 multi-tenant auth + Postgres.

## Skills & tooling for agents

See `docs/SKILLS.md` for the installed skills, relevant MCP servers, and repo links.

## Known fixed bugs — do not regress

- Seed phone normalization (11-digit → 9-digit → correct 10-digit); localStorage key bumped `v1 → v2` so old browsers re-seed automatically. If you change seed data again, **bump the key**.
- IST display fix (times no longer shift to 21:30/23:30).
- Booking wizard date validation (empty date shows an error; quick-pick date chips added).
- Review submission success state + form clear after submit.
