# SKILLS.md — Agent Skills & Tooling Index

Tools, skills, and linked repos an AI agent should use when working on Dentist OS. Companion to `AGENTS.md`.

## Installed agent skills (Base44 skill store)

### 1. GitHub Issues (`github-issues`)
- **Purpose:** create/update GitHub issues, labels, assignees, milestones, issue types via the GitHub MCP server. Use it to track punch-list items (e.g. "QR generation spot-check", "Phase 9 production deploy") as real issues in the repo.
- **Underlying repo/tool:** https://github.com/github/github-mcp-server (GitHub's official MCP server)
- **Local install location (agent workspace):** `.agents/skills/github--github-issues/`

### 2. PR Review (`pr-review`)
- **Purpose:** structured code-review checklist (quality, coverage, security, backward compatibility). Originally written for PyTorch PRs — apply the checklist portion to this repo's PRs; ignore PyTorch-specific CI bits.
- **Reference repo:** https://github.com/pytorch/pytorch/blob/main/CONTRIBUTING.md
- **Local install location (agent workspace):** `.agents/skills/pytorch--pr-review/`

## Recommended additional skills (not yet installed — suggested for later)

| Skill | Why useful | Install when |
|---|---|---|
| Webapp testing (Playwright) — https://github.com/microsoft/playwright | Reliable form-fill and end-to-end tests; fixes the CDP/React `onChange` artifact problem permanently | Before writing automated E2E tests (Phase 9) |
| Web design reviewer | Visual inspection of running site to catch design issues | Optional, for UI polish passes |

## Core project dependencies (repos)

| Dependency | Repo | Used for |
|---|---|---|
| React | https://github.com/facebook/react | UI framework (v18) |
| Vite | https://github.com/vitejs/vite | bundler/dev server; `build:demo` uses `VITE_DEMO=1` |
| Tailwind CSS | https://github.com/tailwindlabs/tailwindcss | styling (shadcn-style tokens) |
| Recharts | https://github.com/recharts/recharts | dashboard revenue/goal charts |
| qrcode | https://github.com/soldair/node-qrcode | QR code generation (QR module) |
| Express | https://github.com/expressjs/express | server-mode REST API |

## Deployment targets (Phase 9)

| Platform | Link | Notes |
|---|---|---|
| Render | https://render.com | `npm run build && npm start`; add persistent disk for `server/data/` |
| Railway | https://railway.com | same start command; attach a volume for the JSON DB |
| GitHub Pages | https://pages.github.com | **current** demo host; serves `dist/` from `gh-pages` branch |

## Phase 10 integration targets (not started)

- WhatsApp Cloud API — https://github.com/WhatsAppCloud/WhatsApp-Cloud-API-Integration-Examples (Meta docs: https://developers.facebook.com/docs/whatsapp/cloud-api)
- Razorpay (invoice payment links) — https://github.com/razorpay/razorpay-node
- SMS gateway (booking/recall reminders) — e.g. Twilio https://github.com/twilio/twilio-node or MSG91 https://github.com/msg91
 
## Conventions for using these skills

1. Prefer filing GitHub issues for every punch-list item so progress is visible in the repo tracker (via the `github-issues` skill).
2. Run the `pr-review` checklist on every PR before merging.
3. When a new skill is installed for this project, add it to this file with its repo link.
