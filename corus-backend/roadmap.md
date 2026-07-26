# Corus Studios — Backend API

FastAPI backend for **Corus Studios**, a studio and equipment business platform. Customers can browse publicly, book sessions, buy equipment, rent gear, and reserve studio space. Admins and staff manage approvals, inventory, slots, orders, and site content from a single dashboard.

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Business rules](#business-rules)
- [Customer flows](#customer-flows)
- [Roles & permissions](#roles--permissions)
- [Tech stack](#tech-stack)
- [Planned project structure](#planned-project-structure)
- [Database domains](#database-domains)
- [Development phases](#development-phases)
- [API modules (planned)](#api-modules-planned)
- [Notifications](#notifications)
- [Environment variables](#environment-variables)
- [Getting started](#getting-started)
- [Open decisions](#open-decisions)

---

## Overview

Corus Studios is not a simple e-commerce site. It combines:

| Domain | Description |
|--------|-------------|
| **Public site** | Homepage, gallery, rental info, shop catalog (no login) |
| **Shop (buy)** | Purchase equipment — pay immediately in app, pickup at studio |
| **Sessions** | Book studio time — pay **50 GHS deposit** online, balance at studio |
| **Rentals** | Rent equipment — admin approval first, then pay in app |
| **Reservations** | Reserve studio space — admin approval first, then pay in app |
| **Admin dashboard** | Single panel for orders, bookings, approvals, inventory, slots, CMS |

**Currency:** GHS (Ghana Cedis)  
**Payments:** Paystack  
**Notifications:** Email only (MVP)

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│ Customer Portal │────▶│           FastAPI Backend            │
│  (React / web)  │     │  Auth · Bookings · Shop · Requests   │
└─────────────────┘     │  Payments · Receipts · Notifications │
                        └──────────┬─────────────┬─────────────┘
┌─────────────────┐                │             │
│ Admin Dashboard │────────────────┘             │
└─────────────────┘                              │
                                                 ▼
                        ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
                        │  PostgreSQL  │  │  Paystack   │  │ Email gateway│
                        └──────────────┘  └─────────────┘  └──────────────┘
```

### Backend services (logical modules)

| Module | Responsibility |
|--------|----------------|
| **Auth service** | Register, login, JWT, roles (customer / staff / admin) |
| **Booking / rental engine** | Session slots, holds, bookings, rental lifecycle |
| **Purchase / request service** | Shop orders, rental requests, studio reservations |
| **Payment service** | Paystack init, webhooks, atomic transactions |
| **Receipt service** | Generate, store, email, customer download |
| **Notification trigger** | Email on key lifecycle events |
| **CMS** | Homepage, gallery, and other admin-managed content |

---

## Business rules

### Payments

- **Session booking:** 50 GHS is a **partial deposit** after selecting a slot. The slot is confirmed only after successful payment. Remaining balance is paid **in person** at the studio.
- **Buy equipment:** No admin approval before payment. Customer pays in app, then picks up (or admin contacts them).
- **Rent / reserve studio:** Admin **approves first**, then customer **pays in app**.
- **Gateway:** Paystack, currency GHS.
- **Transactions:** Each payment attempt is **atomic** — create a new transaction record per attempt (do not reuse failed payments).

### Fulfillment

- **No shipping.** Customers pick up at the studio or admin hands over equipment.
- **Order status flow:** `Pending` → `Processing` → `In-route` → `Delivered` (admin marks on system).
- **In-route** means ready / handed off for pickup (not postal shipping).

### Inventory & slots

- **Separate tables** for equipment for sale vs equipment for rent.
- **Buy stock:** Reduced when an order/request is made. Alert admin and hide/disable add-to-cart when out of stock.
- **Rent stock:** Reduced when a rental request is submitted; restored if admin rejects.
- **Session slots:** Admin can create and block slots manually.
- **Slot holds:** During checkout, a slot is **held** until payment succeeds, fails, or the user abandons checkout (hold expires).

### Sessions

- Predefined session types plus an **“Others”** option for custom types.
- Custom types require admin approval; admin sets or changes the price after approval.

### Rentals

- Admin sets **start and end dates**.
- Admin marks equipment **returned**; stock becomes available again.

### Access

- Login/account **required** for book, rent, buy, and reserve.
- Public browsing does not require login.

### Content

- Homepage, gallery, and related content served via **API**.
- Admin can **create and manage** that content.

---

## Customer flows

### Flow A — Buy equipment (instant payment)

```
Browse shop → Add to cart → Check stock → Checkout → Pay (Paystack)
  → Receipt → Admin: Processing → In-route → Delivered (pickup confirmed)
```

### Flow B — Book session (deposit)

```
Select session type + slot → Hold slot → Pay 50 GHS deposit
  → Slot confirmed → Receipt → Reminder email → Balance paid at studio
```

### Flow C — Rent equipment (approval first)

```
Submit rental request → Stock reserved → Pending admin approval
  → Approved → Pay in app → Receipt → Admin sets dates → Admin marks returned
  → Rejected → Stock restored → Customer notified
```

### Flow D — Reserve studio (approval first)

```
Submit reservation → Pending admin approval
  → Approved → Pay in app → Receipt → Fulfillment status updates
  → Rejected → Customer notified
```

### Flow E — Approval + notification (shared pattern)

```
Customer submits request → API saves (Pending Approval)
  → Admin reviews in dashboard → Approve or Reject
  → Update status (+ inventory / availability on approve)
  → Email customer → If approved, customer completes payment in app
```

### Flow F — Receipt generation (all paid actions)

```
Payment completed → Paystack webhook / verify success
  → Generate receipt (ID, items, amount, datetime)
  → Save to DB, link to transaction
  → Email customer + notify admin
  → Customer can view/download from account
  → Log on admin dashboard
```

---

## Roles & permissions

| Role | Capabilities |
|------|----------------|
| **Customer** | Register, login, browse (public), book, buy, rent, reserve, view receipts |
| **Staff** | Admin-created username/password; may change **password only**; admin can remove anytime |
| **Admin** | Full access: staff management, approvals, inventory, slots, CMS, order status, pricing |

> **Note:** Exact staff permissions (approve only vs mark delivered vs manage catalog) to be defined before Phase 4 RBAC hardening.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | FastAPI |
| Server | Uvicorn |
| ORM | SQLAlchemy 2.x |
| Migrations | Alembic |
| Validation / settings | Pydantic, pydantic-settings |
| Database | PostgreSQL |
| Auth | JWT (python-jose, passlib) |
| Payments | Paystack |
| Email | TBD (e.g. Resend, SendGrid) |
| Config | python-dotenv |

---

## Planned project structure

```
corus-backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── deps.py
│   ├── db/
│   │   ├── base.py
│   │   └── session.py
│   ├── models/
│   ├── schemas/
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── catalog.py
│   │       ├── cart.py
│   │       ├── orders.py
│   │       ├── sessions.py
│   │       ├── rentals.py
│   │       ├── reservations.py
│   │       ├── payments.py
│   │       ├── receipts.py
│   │       ├── webhooks.py
│   │       └── admin/
│   ├── services/
│   └── tasks/          # reminders, hold expiry cleanup
├── alembic/
├── tests/
├── .env.example
├── requirements.txt
└── README.md
```

---

## Database domains

### Core

- `users` — customer, staff, admin roles
- `staff_profiles` — admin-provisioned staff accounts

### Shop (buy)

- `product_categories`
- `products_for_sale` — price, stock, visibility
- `carts`, `cart_items`
- `orders`, `order_items` — status lifecycle
- `payments`, `receipts`

### Rent

- `equipment_for_rent`
- `rental_requests`
- `rental_returns` / return tracking fields

### Studio

- `session_types` — predefined + custom (“Others”) with approval state
- `studio_slots` — availability, manual blocks
- `slot_holds` — temporary locks during checkout
- `bookings` — deposit paid, balance due at studio
- `studio_reservations`

### Shared

- `notifications` / `notification_logs`
- `site_content` / CMS entries
- `audit_log` (recommended)

---

## Development phases

### Phase 1 — Foundation & auth *(MVP start)* — **Completed (2026-07-26)**

**Goal:** Runnable API with users, roles, and database baseline.

- [x] FastAPI app scaffold (`main.py`, CORS, health check)
- [x] PostgreSQL connection + SQLAlchemy session
- [x] Alembic initialized and first migration
- [x] `User` model with roles: `customer`, `staff`, `admin`
- [x] Customer registration and login (JWT)
- [x] Email OTP verification on registration (branded HTML emails)
- [x] Forgot password + reset password (OTP via email, returns JWT on success)
- [x] Admin: create staff (username/password), remove staff
- [x] Staff: login, change own password only
- [x] Role-based route dependencies
- [x] `.env.example` and config via pydantic-settings

**Deliverable:** Authenticated API; admin can provision staff.

---

### Phase 2 — Public catalog & CMS *(MVP)* — **Completed (2026-07-26)**

**Goal:** Public content and product browsing without login.

- [x] `products_for_sale` + categories (separate from rent table)
- [x] Public endpoints: list products, categories, product detail
- [x] Stock field; out-of-stock products hidden or not addable
- [x] CMS / `site_content`: homepage, gallery, rental info sections
- [x] Admin CRUD for products and site content
- [x] Low-stock threshold + admin alert (email or dashboard flag)
- [x] ImageKit cloud uploads for product and gallery images

**Deliverable:** Frontend can render shop and marketing pages from API.

---

### Phase 3 — Session booking & deposit *(MVP)* — **Completed (2026-07-26)**

**Goal:** End-to-end session booking with slot holds and deposit payment.

- [x] `session_types` (predefined types — photoshoot, podcast, video)
- [x] Admin: CRUD session types, set/change price
- [x] `studio_slots` + admin manual block/unblock
- [x] Availability API (exclude blocked + booked + held slots)
- [x] `slot_holds` with TTL (15 min during checkout)
- [x] Hold expiry on-read + `scripts/expire_holds.py`
- [x] `bookings` model — deposit amount (admin-adjustable, default 50 GHS), balance due at studio
- [x] Paystack: initialize payment, webhook handler (idempotent)
- [x] On success: confirm booking, hold → converted, generate receipt
- [x] Email: payment success, receipt ready
- [x] Custom "Others" deferred to Phase 4 (rent only)

**Deliverable:** Customer can book a session and pay deposit online.

---

### Phase 4 — Rent (instant pay) & studio reserve (approval) *(MVP)* ✅

**Goal:** Instant equipment rental checkout and approval-gated studio reservations.

- [x] `equipment_for_rent` + `rental_requests` (stock ↓ on payment success; restored on return)
- [x] `studio_reservations` with admin approval + fixed deposit
- [x] Customer `/rentals` instant checkout (daily rate × days, no approval)
- [x] Customer `/reservations` submit + post-approval deposit checkout
- [x] Admin rent equipment CRUD, mark returned
- [x] Admin reservation approve/reject; pending queue (reservations only)
- [x] Unified payment confirmation (session deposit, rental, reservation deposit)
- [x] Emails: rental paid; reservation submitted/approved/rejected/deposit paid/expired
- [x] `DISABLE_EMAIL_SEND` for dev; `RESERVATION_DEPOSIT_GHS`; 48h approval payment window
- [x] Seed: `scripts/seed_rentals.py`; expiry: `scripts/expire_reservation_approvals.py`

**Deliverable:** Rent equipment with instant Paystack payment; reserve studio with admin approval + deposit.

---

### Phase 5 — Shop checkout (buy flow) ✅

**Goal:** Full e-commerce purchase path with instant Paystack payment.

- [x] Cart + cart items (authenticated)
- [x] Checkout: stock check, create order, reduce stock at checkout submit
- [x] Paystack payment + webhook via unified `payment_confirmation`
- [x] Order status: `pending` → `processing` → `in_route` → `delivered`
- [x] Admin/staff mark status transitions (`StaffOrAdminUser`)
- [x] Receipt + admin notification on purchase
- [x] Customer order history
- [x] Unpaid order expiry restores stock (`ORDER_PAYMENT_MINUTES`, `scripts/expire_unpaid_orders.py`)

**Deliverable:** Buy equipment online with pickup lifecycle (no shipping).

---

### Phase 6 — Receipts, notifications & reminders ✅

**Goal:** Unified branded HTML + PDF receipts, notification logging, booking reminders.

- [x] Unified receipt service (sessions, orders, rentals, reservations)
- [x] Receipt PDF download + HTML email (WeasyPrint; on-demand generation)
- [x] Deposit vs balance due on session and reservation receipts
- [x] `notification_logs` table + `notification_service`
- [x] Booking reminder emails (`BOOKING_REMINDER_HOURS`, `scripts/send_booking_reminders.py`)
- [x] Admin copy on receipt emails (`ADMIN_EMAIL_COPY`)
- [x] Customer `/receipts/me`, `/receipts/{id}`, `/receipts/{id}/download`
- [x] Preview script: `scripts/preview_receipt_emails.py`

**Deliverable:** Consistent branded receipts across all paid flows.

---

### Phase 7 — Admin dashboard completeness — **Completed (2026-07-26)**

**Goal:** One dashboard for all operations.

- [x] Summary metrics: pending approvals, low stock, today’s bookings
- [x] Orders, bookings, rentals, reservations in one UI API (paginated admin lists)
- [x] Transaction and receipt listing (+ receipt detail/PDF download)
- [x] User management (customers view; staff CRUD for admin)
- [x] Audit log for sensitive admin/staff actions
- [x] Staff permission matrix (finalize RBAC)

**Deliverable:** Operations team can run the business from one backend.

**Staff permissions (assignable by admin at staff creation):**

| Permission | Scope |
|------------|--------|
| `dashboard.view` | Dashboard summary + activity feed |
| `orders.view` / `orders.manage` | Order list/detail; status updates |
| `bookings.view` | All session bookings |
| `reservations.view` / `reservations.approve` | Reservations; approve/reject |
| `rentals.view` / `rentals.manage` | Rentals + rent-equipment CRUD |
| `receipts.view` | Receipt list, detail, PDF download |
| `payments.view` | Payment list (detail Paystack JSON: admin only) |
| `customers.view` | Customer list + profile |
| `products.view` / `products.manage` | Products, categories, product uploads |
| `cms.manage` | Site content / gallery, gallery uploads |
| `finance.view` / `finance.manage` | Finance ledger, summary, export |
| `sessions.manage` | Session types, slots, booking settings |

**Admin-only (never assignable):** staff CRUD, audit logs, full payment Paystack JSON.

---

### Phase 9 — Admin financial system — **Completed (2026-07-26)**

**Goal:** Full financial ledger matching the admin whiteboard — synced Paystack income, manual entries, profit summary, CSV/PDF export.

- [x] `financial_records` ledger synced from successful payments (idempotent)
- [x] Manual income/expense CRUD with category validation
- [x] Edit rules: payment-synced rows lock amount/date; manual rows fully editable
- [x] `GET /admin/finance/summary` — income, expenses, profit for date range
- [x] `GET /admin/finance/records` — paginated ledger with filters
- [x] `GET /admin/finance/export.csv` and `/export.pdf` — printable full finance report
- [x] Dashboard `financial_summary` block (current month)
- [x] Optional profit/expense alert thresholds
- [x] Backfill script for historical payments

**Staff permissions:**

| Permission | Scope |
|------------|--------|
| `finance.view` | Summary, ledger list, alerts, CSV/PDF export |
| `finance.manage` | Manual record create/edit/delete |

---

### Phase 8 — Hardening & production — **Completed (2026-07-26)**

**Goal:** Safe to deploy on Render + Supabase.

- [x] Paystack webhook signature verification (HMAC-SHA512) + production misconfiguration guard
- [x] Idempotent payment processing (payment status gate + `webhook_events` dedup table)
- [x] Rate limiting on auth endpoints (`slowapi`, configurable via `RATE_LIMIT_*`)
- [x] Consistent JSON error responses (global exception handlers)
- [x] Test suite (pytest + TestClient) — health, webhook, RBAC, finance, rate limits
- [x] Render + Supabase deployment docs (no Docker)
- [x] Staff password: change-only via `PATCH /auth/password` (customer OTP reset unchanged)

**Deliverable:** Production-ready API.

---

## API modules (planned)

| Prefix | Purpose |
|--------|---------|
| `/auth` | Register, login, refresh, staff password change |
| `/catalog` | Public products, categories, content |
| `/cart` | Cart CRUD |
| `/orders` | Checkout, order history, status |
| `/sessions` | Types, availability, holds, bookings |
| `/rentals` | Submit, list, admin actions, returns |
| `/reservations` | Studio reserve, approve, pay |
| `/payments` | Init Paystack transaction |
| `/receipts` | List, download |
| `/webhooks/paystack` | Payment confirmation |
| `/admin/dashboard/*` | Summary metrics, activity feed |
| `/admin/payments` | Payment list and detail |
| `/admin/customers` | Customer list and profile |
| `/admin/audit-logs` | Admin audit trail |
| `/admin/finance/*` | Ledger, summary, CSV/PDF export |
| `/admin/*` | Staff, inventory, slots, CMS, approvals (permission-gated) |

Interactive docs: `/docs` (Swagger), `/redoc` (ReDoc).

---

## Notifications

Email-only events:

| Event | Recipient |
|-------|-----------|
| Request submitted | Customer (+ optional admin) |
| Request approved | Customer |
| Request rejected | Customer |
| Payment success | Customer |
| Receipt ready | Customer |
| Booking reminder | Customer |
| Low stock | Admin |
| New order / booking | Admin |

---

## Environment variables

See [`.env.example`](.env.example) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full variable list, dev vs production values, and scheduled jobs.

---

## Getting started

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

Copy [`.env.example`](.env.example) to `.env` and fill in values. See [README.md](README.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (includes **Render + Supabase** guide).

Run tests: `pip install -r requirements-dev.txt && pytest -q`

Run development server (after Phase 1 scaffold):

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  

---

## Open decisions

Resolve before or during the relevant phase:

| Topic | Status |
|-------|--------|
| Staff RBAC | **Resolved (Phase 7)** — permission matrix in Phase 7 section; admin-only staff/audit |
| Session deposit | Configurable via booking settings + `SESSION_DEPOSIT_GHS` default |
| Slot hold TTL | `SLOT_HOLD_MINUTES` (default 15) |
| Post-approval pay window | `POST_APPROVAL_PAYMENT_HOURS` (default 48) |
| Booking reminder | `BOOKING_REMINDER_HOURS` (default 24) |
| Receipt format | **Resolved (Phase 6)** — HTML email + PDF attachment (ReportLab) |
| Email provider | SMTP (Gmail app password or transactional SMTP) |
| Custom session “Others” | After approval, customer rebooks (existing flow) |

---

## Design reference

System flows and architecture were defined in the project whiteboard:

- [Corus backend design (tldraw)](https://www.tldraw.com/p/8U-k-ioj9IWpCTCQIjMYs)

---

## License

Private — Corus Studios.
