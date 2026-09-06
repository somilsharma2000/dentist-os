# Dentist OS — Self-hosting and operations

Dentist OS is a standalone React/Vite + Express application. It runs on standard Node.js infrastructure. It can run behind Nginx, on a VPS, or on a Node-compatible host.

## Runtime

- Node.js 18+
- One long-lived Node process for the JSON storage mode
- HTTPS termination at the reverse proxy
- A persistent writable directory for the database
- A scheduler calling `POST /api/jobs/run`

Install and build:

```bash
npm ci
npm run build
NODE_ENV=production DENTOS_DB_PATH=/var/lib/dentist-os/db.json npm start
```

The server serves the built frontend and API from the same port. Put it behind HTTPS; do not expose the Node port directly to the internet.

## Required production settings

Copy `.env.example` to the host environment and set:

- `NODE_ENV=production`
- `DENTOS_DB_PATH` to a persistent disk path
- `CRON_SECRET` to a randomly generated secret
- `OTP_PEPPER` to a separate randomly generated secret
- `PORT` if the host supplies one

Never commit `.env`, `server/db.json`, provider credentials, OTP values, or production database backups.

## Provider setup

Configure these per clinic in Admin → Integrations:

1. **WhatsApp Cloud API** — phone number ID, access token, app secret, webhook verification token. Meta webhook URL: `/api/webhooks/whatsapp`.
2. **MSG91 SMS** — auth key, sender ID, and DLT-approved OTP template ID. Real portal login remains unavailable until these are configured.
3. Approved WhatsApp utility/marketing templates must exist in Meta Business Manager before the scheduler can send outside the 24-hour conversation window.

Provider secrets are masked in API responses. Use HTTPS and restrict admin access.

## Scheduler

Run once daily during the clinic’s preferred morning window:

```bash
curl -fsS -X POST https://dentist.example.com/api/jobs/run \
  -H "x-cron-secret: $CRON_SECRET" \
  -H 'content-type: application/json' \
  -d '{"type":"all","days":1,"limit":50}'
```

Use `{"dryRun":true}` for the first staging run. The job is consent-aware, deduplicates sends, skips unconfigured providers, and records failures without claiming delivery.

## Backups and recovery

The current storage engine is an atomic JSON file, suitable for a small single-instance clinic deployment. Back up the persistent `db.json` at least daily, encrypt backups, and test restoration. Do not run multiple application instances against the same JSON file. For multi-clinic scale or multiple replicas, migrate the data layer to SQLite/Postgres before enabling horizontal scaling.

## Monitoring checklist

Monitor:

- Process uptime and restart count
- Disk space and write permissions
- HTTP 5xx responses
- Scheduler response and `failed` totals
- WhatsApp delivery-status webhooks
- MSG91 delivery failures
- Backup freshness

Do not log access tokens, app secrets, OTP codes, or complete patient clinical notes.

## Handoff checklist

- [ ] DNS and HTTPS configured
- [ ] Persistent database path mounted
- [ ] Production seed/demo credentials removed or rotated
- [ ] Clinic staff accounts replaced with unique passwords
- [ ] Meta webhook points to the production URL
- [ ] Meta templates approved
- [ ] MSG91 DLT OTP template approved
- [ ] Scheduler configured with `CRON_SECRET`
- [ ] Staging booking, consent, reminder, OTP, and opt-out tests completed
- [ ] Backup restore tested
