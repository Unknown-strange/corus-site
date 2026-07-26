# Corus Studios Backend — Deployment Guide

Production checklist for deploying the Corus Studios API.

## Environment variables

All settings are loaded from environment variables (or `.env`) via [`app/core/config.py`](../app/core/config.py). Use [`.env.example`](../.env.example) as the template.

| Variable | Required | Dev default | Production guidance |
|----------|----------|-------------|---------------------|
| `DATABASE_URL` | Yes | local Postgres | Managed Postgres connection string with SSL |
| `SECRET_KEY` | Yes | placeholder | Long random string; never commit |
| `DEBUG` | No | `true` | Set `false` |
| `DISABLE_EMAIL_SEND` | No | `true` | Set `false` so OTP/receipts/reminders send |
| `SMTP_HOST` | Prod email | — | Gmail SMTP or transactional provider |
| `SMTP_PORT` | No | `587` | Provider port |
| `SMTP_USER` | Prod email | — | SMTP username |
| `SMTP_PASSWORD` | Prod email | — | App password or API key |
| `EMAIL_FROM` | Prod email | — | Verified sender address |
| `PAYSTACK_SECRET_KEY` | Prod payments | test key | `sk_live_...` from Paystack dashboard |
| `PAYSTACK_PUBLIC_KEY` | Prod payments | test key | `pk_live_...` |
| `PAYSTACK_CALLBACK_URL` | Prod payments | localhost | Frontend callback URL after Paystack redirect |
| `API_BASE_URL` | No | `http://127.0.0.1:8000` | Public API URL, e.g. `https://api.corusstudios.com` |
| `FRONTEND_URL` | No | `http://localhost:3000` | Public frontend origin |
| `IMAGEKIT_PRIVATE_KEY` | Image uploads | — | From ImageKit dashboard |
| `IMAGEKIT_PUBLIC_KEY` | Image uploads | — | Public key |
| `IMAGEKIT_URL_ENDPOINT` | Image uploads | — | e.g. `https://ik.imagekit.io/your_id` |
| `SESSION_DEPOSIT_GHS` | No | `50` | Session booking deposit |
| `RESERVATION_DEPOSIT_GHS` | No | `50` | Studio reservation deposit |
| `ORDER_PAYMENT_MINUTES` | No | `15` | Unpaid order window |
| `BOOKING_REMINDER_HOURS` | No | `24` | Hours before session to send reminder |
| `STUDIO_TIMEZONE` | No | `Africa/Accra` | Used for dashboard “today’s bookings” and finance periods |
| `FINANCE_LOW_PROFIT_THRESHOLD_GHS` | No | — | Alert when monthly profit falls below this |
| `FINANCE_HIGH_EXPENSE_THRESHOLD_GHS` | No | — | Alert when monthly expenses exceed this |
| `ADMIN_ALERT_EMAIL` | No | — | Low-stock and ops alert recipient |
| `ADMIN_EMAIL_COPY` | No | `true` | BCC admin on customer receipts |
| `RATE_LIMIT_ENABLED` | No | `true` | Set `false` only for local testing |
| `RATE_LIMIT_LOGIN` | No | `10/minute` | Login brute-force protection |
| `RATE_LIMIT_AUTH` | No | `5/minute` | Register, OTP, forgot-password |
| `RATE_LIMIT_DEFAULT` | No | `200/minute` | Global fallback limit |

## Deploy on Render + Supabase

Recommended hosting: **Supabase** (PostgreSQL) + **Render** (Web Service).

### Supabase database

1. Create a Supabase project.
2. Copy the **Connection string** (use **Transaction pooler** / Session mode for server apps).
3. Set `DATABASE_URL` on Render. Format example:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
4. Run migrations once (Render shell or local against prod URL):
   ```powershell
   alembic upgrade head
   python scripts/seed_admin.py
   python scripts/backfill_financial_records.py
   ```

### Render Web Service

| Setting | Value |
|---------|--------|
| **Build command** | `pip install -r requirements.txt` |
| **Start command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health check path** | `/health` (includes DB ping) |

**Required Render environment variables:**

- `DATABASE_URL` — from Supabase
- `SECRET_KEY` — long random string
- `DEBUG=false`
- `DISABLE_EMAIL_SEND=false`
- `FRONTEND_URL` — your production frontend (used for CORS when `DEBUG=false`)
- `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_CALLBACK_URL` — live keys
- SMTP vars, ImageKit vars, business rules from `.env.example`

**Paystack webhook URL:**

```
https://<your-render-service>.onrender.com/webhooks/paystack
```

### Render Cron Jobs (or external scheduler)

Use Render Cron Jobs or GitHub Actions to run the four scripts listed in [Scheduled jobs](#scheduled-jobs) on the same schedule.

### Staff passwords

Staff use **`PATCH /auth/password`** (current password required). There is no staff forgot-password OTP flow — admin handles lockouts manually.

## First deploy

```powershell
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_admin.py   # first run only — creates admin user
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use a process manager (systemd, PM2, IIS + wfastcgi, etc.) or reverse proxy (nginx, Caddy) in production.

## Scheduled jobs

Run these scripts on a schedule (cron, Windows Task Scheduler, or your host’s job runner):

| Script | Schedule | Purpose |
|--------|----------|---------|
| `scripts/expire_holds.py` | Every 5 min | Release expired slot holds |
| `scripts/expire_unpaid_orders.py` | Every 5 min | Cancel unpaid orders, restore stock |
| `scripts/expire_reservation_approvals.py` | Hourly | Expire unpaid approved reservations |
| `scripts/send_booking_reminders.py` | Hourly | Send 24h booking reminder emails |

Example (Linux cron):

```cron
*/5 * * * * cd /app/corus-backend && ./venv/bin/python scripts/expire_holds.py
*/5 * * * * cd /app/corus-backend && ./venv/bin/python scripts/expire_unpaid_orders.py
0 * * * * cd /app/corus-backend && ./venv/bin/python scripts/expire_reservation_approvals.py
0 * * * * cd /app/corus-backend && ./venv/bin/python scripts/send_booking_reminders.py
```

## Paystack webhook

Point Paystack’s webhook URL to:

```
POST {API_BASE_URL}/webhooks/paystack
```

**Security (Phase 8):**

- Requests are verified with HMAC-SHA512 using `PAYSTACK_SECRET_KEY` (`x-paystack-signature` header).
- Duplicate events are deduplicated via the `webhook_events` table (returns `200` with `already_processed`).
- Payment confirmation is idempotent: successful payments short-circuit on replay; ledger sync uses unique `payment_id`.

If `DEBUG=false` and `PAYSTACK_SECRET_KEY` is missing, webhooks return **503** (misconfiguration).

## ImageKit folders

Upload routes store images under:

- `/corus/products` — shop product images
- `/corus/gallery` — CMS/gallery content
- `/corus/rentals` — rent equipment images

Configure ImageKit keys in `.env` before using admin upload endpoints.

## Email

For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) with 2FA enabled. Set `DISABLE_EMAIL_SEND=false` in production.

Required for: registration OTP, password reset, payment receipts, booking reminders, low-stock alerts.

## Security reminders

- Use a strong, unique `SECRET_KEY`
- Set `DEBUG=false` in production
- Never commit `.env` or live API keys
- Restrict admin/staff credentials; use staff permissions instead of sharing the admin account
- Rate limiting is enabled on auth routes by default (`RATE_LIMIT_*` env vars)
- API errors return a consistent JSON shape: `{ "error": { "code", "message", "details" } }`
- Run tests before deploy: `pip install -r requirements-dev.txt && pytest -q`

## Admin API reference (Phase 7)

| Endpoint | Permission | Description |
|----------|------------|-------------|
| `GET /admin/dashboard/summary` | `dashboard.view` | Ops metrics |
| `GET /admin/dashboard/activity` | `dashboard.view` | Merged activity feed |
| `GET /admin/payments` | `payments.view` | Paginated payments |
| `GET /admin/payments/{id}` | Admin only | Full Paystack JSON |
| `GET /admin/customers` | `customers.view` | Customer list |
| `GET /admin/customers/{id}` | `customers.view` | Customer detail |
| `GET /admin/audit-logs` | Admin only | Audit trail |
| `POST /admin/staff` | Admin only | Create staff + permissions |
| `PATCH /admin/staff/{id}/permissions` | Admin only | Update permissions |
| `GET /admin/finance/summary` | `finance.view` | Income, expenses, profit |
| `GET /admin/finance/records` | `finance.view` | Paginated ledger |
| `POST /admin/finance/records` | `finance.manage` | Manual income/expense entry |
| `GET /admin/finance/export.csv` | `finance.view` | CSV download |
| `GET /admin/finance/export.pdf` | `finance.view` | PDF download |

Interactive docs: `{API_BASE_URL}/docs`
