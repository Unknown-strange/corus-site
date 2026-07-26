# Corus Studios Backend

FastAPI backend for **Corus Studios** — session booking, equipment rental, studio reservations, shop checkout, Paystack payments, and branded HTML/PDF receipts.

## Features

- Customer auth (register, OTP verification, login)
- Public catalog (products, categories, CMS/gallery content)
- Session booking with slot holds and deposit payments
- Instant equipment rental checkout
- Approval-gated studio reservations
- Shop cart and order fulfillment
- Paystack payment initialization and webhooks
- Admin dashboard, staff RBAC, audit log, ops APIs, and financial ledger (CSV/PDF export)

## Quick start (development)

### Prerequisites

- Python 3.11+
- PostgreSQL

### Setup

```powershell
cd corus-backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy [`.env.example`](.env.example) to `.env` and configure at minimum `DATABASE_URL` and `SECRET_KEY`.

```powershell
alembic upgrade head
python scripts/seed_admin.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **API docs:** http://127.0.0.1:8000/docs
- **Production deploy:** see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Render + Supabase)
- **Tests:** `pip install -r requirements-dev.txt && pytest -q`
- **Roadmap / phase status:** [roadmap.md](roadmap.md)

## Admin access

1. Log in at `POST /auth/login` with the seeded admin credentials.
2. Use the bearer token on `/admin/*` routes.
3. Create staff via `POST /admin/staff` with a permission list (admin bypasses all permission checks).

## Scheduled jobs

Background scripts under `scripts/` should run on a schedule in production — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## License

Private — Corus Studios.
