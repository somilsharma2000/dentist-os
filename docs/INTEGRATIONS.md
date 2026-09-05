# INTEGRATIONS HUB — Schema & Field Mapping

> Per-clinic connector configuration for the Integrations module (`/admin/integrations`).
> Super admin (Agency Owner) configures any clinic; clinic admins configure only their own clinic.
> Demo build persists to browser localStorage per tenant; production server persists to `server/db.json`.

## 1. Data Model

Config is stored **per tenant** on the clinic record:

```
tenants[i] = {
  id: 1,
  name: "SmileCraft Dental Clinic",
  ...
  integrations: {
    [connectorKey]: {
      status: "configured",          // "configured" only; absence of key = not configured
      config: { ...fieldValues },    // per-connector fields (see catalog below)
      connectedAt: "2026-09-06"      // IST date of last save
    }
  }
}
```

- Removing the key (Disconnect) deletes the entry entirely → badge reverts to "Not configured".
- Credentials are never shared between clinics — each tenant owns its own `integrations` object.

## 2. API Contract

| Method | Path            | Who                              | Behaviour |
|--------|-----------------|----------------------------------|-----------|
| GET    | `/integrations` | Any signed-in staff              | Super viewing "All clinics" → array `[{id, name, integrations}]` for every clinic. Otherwise → `{id, name, integrations}` of the active clinic. |
| PUT    | `/integrations` | Super (any clinic) or clinic admin (own clinic only) | Body: `{tenantId, key, config}` to save, or `{tenantId, key, disconnect: true}` to disconnect. Non-super targeting another clinic → 403. |

## 3. Connector Catalog (field mapping)

### `whatsapp` — WhatsApp Business
| Field | Type | Purpose | Consumed by |
|-------|------|---------|-------------|
| `phoneNumber` | string | WhatsApp Business number (E.164, e.g. `+919000011111`) | Appointment confirmations, reminders, WhatsApp inbox |
| `apiKey` | string | Meta Cloud API / BSP key | Message sending (Phase 10) |

### `sms` — SMS Gateway (MSG91 / Twilio)
| Field | Type | Purpose | Consumed by |
|-------|------|---------|-------------|
| `senderId` | string | 6-char DLT sender ID | SMS fallback reminders |
| `authKey` | string | Gateway auth key | Message sending (Phase 10) |

### `razorpay` — Razorpay Payments
| Field | Type | Purpose | Consumed by |
|-------|------|---------|-------------|
| `keyId` | string | `rzp_live_…` public key | Checkout for advance payments / invoice settlement |
| `keySecret` | string | Secret key | Server-side payment verification (Phase 10) |

### `calendar` — Google Calendar
| Field | Type | Purpose | Consumed by |
|-------|------|---------|-------------|
| `calendarId` | string | Clinic calendar ID | Two-way appointment sync |
| `serviceEmail` | string | Service-account email | OAuth for sync (Phase 10) |

### `email` — Email / SMTP
| Field | Type | Purpose | Consumed by |
|-------|------|---------|-------------|
| `smtpHost` | string | SMTP host (e.g. `smtp.gmail.com`) | Invoice PDFs, recall emails, review invites |
| `username` | string | Sending account | Auth |
| `password` | string | App password | Auth |

### `reviews` — Google Reviews
| Field | Type | Purpose | Consumed by |
|-------|------|---------|-------------|
| `placeId` | string | Google Place ID | Pull public reviews & auto-respond |

## 4. Adding a New Connector

1. Add a definition to `CONNECTORS` in `client/src/pages/admin/Integrations.jsx` — `key`, `name`, `icon`, `description`, `fields[]`.
2. No server change needed: the API stores any `key` + `config` shape generically.
3. Document the field mapping in this file (Section 3).
4. Phase 10: wire the consuming feature to read `tenant.integrations[<key>].config`.

## 5. Demo vs Production

- **Now (GitHub Pages demo):** credentials save and persist per clinic — fully testable UX. Live *sending* is intentionally inert (honest demo, no fake "sent" states).
- **Phase 10 (server on Render/Railway):** server reads each clinic's stored keys and performs real WhatsApp/SMS/Razorpay/Calendar/SMTP calls. Keys move to encrypted storage at that point.
