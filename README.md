# Bill & Subscription Reminder

A full-stack web app to track recurring bills and subscriptions (Netflix, rent,
insurance, gym, …) and surface renewals **before** they auto-charge. Everyone
forgets a renewal; this app makes the next charge and the monthly burn visible
at a glance, and flags anything falling inside a per-subscription reminder
window.

## Features

- Add subscriptions with amount, billing cycle (weekly / monthly / quarterly /
  yearly), start date, and a per-item "remind me N days before" window.
- Automatic **next-renewal** computation that rolls the start date forward by
  whole billing cycles to the next future date.
- A dashboard that highlights subscriptions **due soon** and shows an estimated
  **monthly spend** normalized across cycles.
- A daily reminder **scan** on the backend that builds ONE consolidated
  digest across all subscriptions and emails it (see "The digest" below).
- REST API with input validation and a centralized error handler.
- Unit tests for the date/reminder engine and integration tests for the API.

## The digest — why this isn't "just another reminder"

Every platform already emails you 2-3 days before it charges. So a per-service
"Netflix renews in 3 days" ping is not the value here. This app's differentiator
is a **single consolidated digest**:

- **One place for everything.** Netflix, rent, insurance, a domain, a gym — all
  in one email, including the ones no platform reminds you about at all.
- **Spend awareness.** It shows the **total** about to be charged this window and
  your **estimated monthly subscription spend** — turning a date reminder into a
  spend-control tool.

Example digest:

```
Subject: 3 renewals coming up — ₹19,849 due soon

Upcoming renewals:
  • Rent — ₹18,000 (in 1d, 2026-09-27)
  • Netflix — ₹649 (in 2d, 2026-09-28)
  • Domain — ₹1,200 (in 4d, 2026-09-30)

Total due soon:            ₹19,849
Estimated monthly spend:   ₹18,749
```

### Email configuration (AWS SES)

Delivery uses AWS SES. Set these environment variables to send real email:

```bash
export SES_FROM="verified-sender@yourdomain.com"   # a verified SES identity
export REMINDER_TO="you@example.com"
export AWS_REGION="us-east-1"                        # your SES region
```

If they are not set, the digest is **logged to the console** instead of sent —
so the app runs out of the box for anyone cloning it, with no AWS account
required. Trigger a digest on demand with `POST /api/digest/send`.

## Tech stack

| Layer     | Tech                                             |
|-----------|--------------------------------------------------|
| Frontend  | React 18, TypeScript, Vite                       |
| Backend   | Node, TypeScript, Express, Knex                  |
| Database  | SQLite (Postgres-compatible via Knex)            |
| Email     | AWS SES (falls back to console logging)          |
| Tests     | Jest, ts-jest, Supertest                         |

## Architecture

```
frontend (React/Vite)  ──HTTP──▶  backend (Express)
                                    ├─ routes/       REST endpoints + validation
                                    ├─ services/     reminder engine (pure logic)
                                    └─ db/           Knex repository + schema
                                          │
                                          ▼
                                    SQLite (data.sqlite)
```

The **reminder engine** (`backend/src/services/reminder.ts`) is deliberately
pure and dependency-free — no database, no HTTP — so the core business logic
(next renewal date, days-until, "is a reminder due") is trivially unit-testable
and independent of infrastructure.

## Getting started

Prerequisites: Node 18+.

### Backend

```bash
cd backend
npm install
npm test        # run the test suite
npm run dev     # start API on http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev     # start UI on http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173.

## API

| Method | Path                     | Description                                   |
|--------|--------------------------|-----------------------------------------------|
| GET    | `/health`                | Health check                                  |
| GET    | `/api/subscriptions`     | List all (annotated with nextRenewal/daysUntil)|
| POST   | `/api/subscriptions`     | Create (validated)                            |
| PUT    | `/api/subscriptions/:id` | Update                                        |
| DELETE | `/api/subscriptions/:id` | Delete                                        |
| GET    | `/api/reminders`         | Subscriptions with a reminder due now         |
| GET    | `/api/summary`           | Active count + estimated monthly spend        |
| GET    | `/api/digest`            | Preview the consolidated digest (JSON)        |
| POST   | `/api/digest/send`       | Build the digest and email it now             |

### Example

```bash
curl -X POST http://localhost:4000/api/subscriptions \
  -H 'Content-Type: application/json' \
  -d '{"name":"Netflix","amount":649,"cycle":"monthly","startDate":"2026-01-15","reminderDays":3}'
```

## Design notes

- **Date math** normalizes to midnight UTC so day counts are not skewed by
  time-of-day, and cycle addition uses `Date` month/year setters to handle
  rollover (e.g. Jan 31 + 1 month) rather than fixed day arithmetic.
- **Monthly spend** normalizes each cycle to a monthly figure (yearly ÷ 12,
  quarterly ÷ 3, weekly × 52/12) so mixed-cycle subscriptions sum sensibly.
- **Validation** lives in one place (`db/subscriptions.ts#validate`) and throws
  a typed `ValidationError` the routes translate into `400`s.

## License

MIT
