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

### Phase 1 — Foundation & auth *(MVP start)*

**Goal:** Runnable API with users, roles, and database baseline.

- [ ] FastAPI app scaffold (`main.py`, CORS, health check)
- [ ] PostgreSQL connection + SQLAlchemy session
- [ ] Alembic initialized and first migration
- [ ] `User` model with roles: `customer`, `staff`, `admin`
- [ ] Customer registration and login (JWT)
- [ ] Admin: create staff (username/password), remove staff
- [ ] Staff: login, change own password only
- [ ] Role-based route dependencies
- [ ] `.env.example` and config via pydantic-settings

**Deliverable:** Authenticated API; admin can provision staff.

---

### Phase 2 — Public catalog & CMS *(MVP)*

**Goal:** Public content and product browsing without login.

- [ ] `products_for_sale` + categories (separate from rent table)
- [ ] Public endpoints: list products, categories, product detail
- [ ] Stock field; out-of-stock products hidden or not addable
- [ ] CMS / `site_content`: homepage, gallery, rental info sections
- [ ] Admin CRUD for products and site content
- [ ] Low-stock threshold + admin alert (email or dashboard flag)

**Deliverable:** Frontend can render shop and marketing pages from API.

---

### Phase 3 — Session booking & deposit *(MVP)*

**Goal:** End-to-end session booking with slot holds and deposit payment.

- [ ] `session_types` (fixed list + “Others” with pending approval)
- [ ] Admin: approve custom types, set/change price
- [ ] `studio_slots` + admin manual block/unblock
- [ ] Availability API (exclude blocked + booked + held slots)
- [ ] `slot_holds` with TTL (e.g. 10–15 min during checkout)
- [ ] Background/cron: expire abandoned holds
- [ ] `bookings` model — deposit amount (50 GHS), balance due at studio
- [ ] Paystack: initialize payment, webhook handler (idempotent)
- [ ] On success: confirm booking, release hold → booked, generate receipt
- [ ] Email: payment success, receipt ready

**Deliverable:** Customer can book a session and pay deposit online.

---

### Phase 4 — Admin approval: rent & reserve *(MVP)*

**Goal:** Approval-first workflows with post-approval payment.

- [ ] `equipment_for_rent` + `rental_requests` (stock ↓ on submit)
- [ ] `studio_reservations`
- [ ] Customer submit endpoints (auth required)
- [ ] Single admin dashboard API: pending queue
- [ ] Approve / reject with stock restore on reject
- [ ] Post-approval: Paystack payment in app
- [ ] Emails: request submitted, approved, rejected
- [ ] Rental: admin set start/end dates, mark returned

**Deliverable:** Rent and reserve flows work with admin gate + in-app payment.

---

### Phase 5 — Shop checkout (buy flow)

**Goal:** Full e-commerce purchase path.

- [ ] Cart + cart items (authenticated)
- [ ] Checkout: stock check, create order, reduce stock
- [ ] Paystack payment + webhook
- [ ] Order status: `Pending` → `Processing` → `In-route` → `Delivered`
- [ ] Admin/staff mark status transitions
- [ ] Receipt + admin notification on purchase
- [ ] Customer order history

**Deliverable:** Buy equipment online with pickup lifecycle.

---

### Phase 6 — Receipts, notifications & reminders

**Goal:** Polish shared payment and comms layer.

- [ ] Unified receipt service (sessions, orders, rentals, reservations)
- [ ] Receipt PDF or structured download (TBD)
- [ ] Deposit vs balance due on session receipts
- [ ] Notification log table
- [ ] Booking reminder emails (scheduled job; timing TBD)
- [ ] Admin copy on all transactional emails

**Deliverable:** Consistent receipts and email coverage across all flows.

---

### Phase 7 — Admin dashboard completeness

**Goal:** One dashboard for all operations.

- [ ] Summary metrics: pending approvals, low stock, today’s bookings
- [ ] Orders, bookings, rentals, reservations in one UI API
- [ ] Transaction and receipt listing
- [ ] User management (customers view; staff CRUD for admin)
- [ ] Audit log for sensitive admin/staff actions
- [ ] Staff permission matrix (finalize RBAC)

**Deliverable:** Operations team can run the business from one backend.

---

### Phase 8 — Hardening & production

**Goal:** Safe to deploy.

- [ ] Paystack webhook signature verification
- [ ] Idempotent payment processing
- [ ] Rate limiting on auth and public endpoints
- [ ] Input validation and error responses
- [ ] Test suite (pytest + httpx)
- [ ] Docker / deployment docs
- [ ] Password reset for customers and staff (if in scope)

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
| `/admin/*` | Dashboard, staff, inventory, slots, CMS, approvals |

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

```env
# App
APP_NAME=Corus Studios API
DEBUG=true
SECRET_KEY=change-me

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/corus

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Paystack
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=

# Email
EMAIL_PROVIDER=
EMAIL_FROM=
EMAIL_API_KEY=

# Business
SESSION_DEPOSIT_GHS=50
SLOT_HOLD_MINUTES=15
POST_APPROVAL_PAYMENT_HOURS=48
```

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

Copy `.env.example` to `.env` and fill in values (`.env.example` to be added in Phase 1).

Run development server (after Phase 1 scaffold):

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  

---

## Open decisions

Resolve before or during the relevant phase:

| Topic | Question |
|-------|----------|
| Staff RBAC | What can staff do vs admin only? |
| Session deposit | Fixed 50 GHS for all types or configurable per type? |
| Slot hold TTL | Default minutes (suggest 15)? |
| Post-approval pay window | Hours before hold/stock released (suggest 48)? |
| Booking reminder | 24h before, 2h before, or configurable? |
| Receipt format | PDF, HTML email, or both? |
| Email provider | Resend, SendGrid, etc. |
| Custom session “Others” | After approval, auto-link to booking or customer rebooks? |

---

## Design reference

System flows and architecture were defined in the project whiteboard:

- [Corus backend design (tldraw)](https://www.tldraw.com/p/8U-k-ioj9IWpCTCQIjMYs)

---

## License

Private — Corus Studios.
