# Rules — Dentist OS

**Last updated:** 2026-09-04
This document binds all future work on this repo — human or AI. Read before writing any code.

---

## 1. Do

- **IST everywhere.** All user-facing dates/times in Asia/Calcutta. Use helpers in `client/src/lib/utils.js` (`formatDate`, `todayISO`, `next7Days`). Never render raw UTC.
- **Local-time strings for storage.** Dates as `YYYY-MM-DD`, times as `HH:mm` (24-hr IST). No `toISOString()` on local values, no `new Date()` parsing that shifts timezone.
- **INR formatting.** All money via `formatINR()` → `₹` + `en-IN` grouping. Money fields are integers (rupees). Never show ₹ on counts/quantities.
- **Validate every form** before submit, with inline red errors. Never allow blank submits (the original app's #1 bug).
- **Silent failure is a bug.** Every user action ends in visible feedback: success banner, updated list, or error message.
- **Mobile-first** for public pages; test booking flow at 360px width.
- **New admin module = one file** in `client/src/pages/admin/` + route in `App.jsx` + sidebar entry in `AdminLayout.jsx`. Reuse `ui.jsx` components.
- **Keep demo parity.** Any new API route must be mirrored in `api-demo.js` or demo mode silently breaks.
- **Slots derive from settings.** Working hours and slot cadence come from Settings, not hardcoded.
- **Commit conventions:** small commits, present-tense imperative messages ("Add recall due filter").

## 2. Avoid

- ❌ No new heavy dependencies without need — current stack (React, Tailwind, recharts, lucide, qrcode) covers everything. Anything new requires justification in the PR/commit.
- ❌ No moment/date-fns — native `Date` + our IST helpers only.
- ❌ No `alert()`/`confirm()` — use the `Modal` component.
- ❌ No hardcoded API base URLs — always through `lib/api.js`.
- ❌ No UTC `toISOString()` for **local** datetimes (it shifts by +5:30).
- ❌ No emoji as UI icons; use lucide icons.
- ❌ No patient data in `console.log`, error messages, or analytics.
- ❌ No direct DOM manipulation in React components.
- ❌ Don't auto-publish reviews — every public submission goes to the moderation queue first.
- ❌ Don't add ₹-symbols to non-money numbers (the original app showed "₹18 patients").

## 3. Error handling

1. **Client forms:** validate inline (required, phone = exactly 10 digits, email format). Show field-level error text; never submit invalid data.
2. **API calls:** every call in `api.js`/`api-demo.js` wrapped; non-2xx → throw `Error(server message)`. UI catches and shows the message — never swallow.
3. **Server:** every route validates input and returns `{ error: "human message" }` with 4xx status. Never return stack traces.
4. **Loading states:** every async list shows loading text/skeleton; empty states say what to do ("No appointments yet — book the first one").
5. **Optimistic updates only** where safe (settings toggle); everything else waits for the server response.

## 4. AI boundaries (for AI-assisted work on this repo)

The AI assistant may:
- Write/modify code, run builds, write tests, edit docs
- Propose data-model changes and draft new modules

The AI assistant must **not**:
- Send WhatsApp/SMS/email to real patients without explicit owner approval of the exact content and recipient
- Publish or reply to public reviews autonomously — drafts only, human approves
- Change pricing, clinic hours, or settings values without owner confirmation
- Delete or rewrite seed data without explicit instruction
- Introduce a new dependency, deployment target, or auth system without discussion
- Commit secrets, tokens, or patient-identifying data to the repo

When unsure between two implementations: pick the one that is simpler to undo.

## 5. Testing gates

Before marking any feature done:
1. `npm run build` passes clean
2. Demo build (`npm run build:demo`) passes
3. Click-through in a real browser (not just code review) for any flow change
4. IST correctness check: render a date/time and confirm it matches IST clock
