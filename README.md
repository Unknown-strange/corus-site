# 📸 Corus Studios

> **The modern, all-in-one management platform for photography studios, gear rentals, and creative spaces.**

Corus Studios is an enterprise-grade digital studio operations system designed for photography studios. It unifies client booking, equipment rental, studio space reservation, retail merchandise sales, and administrative finance management into a seamless, high-performance web platform.

---

## 🌟 Table of Contents
- [What is Corus Studios?](#-what-is-corus-studios)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Method 1: Docker Compose (Recommended)](#method-1-docker-compose-recommended)
  - [Method 2: Manual Local Development](#method-2-manual-local-development)
- [Environment Configuration](#-environment-configuration)
- [Default Credentials & Seed Data](#-default-credentials--seed-data)
- [Scheduled Jobs & Automation](#-scheduled-jobs--automation)
- [API Documentation](#-api-documentation)
- [Code Quality & Testing](#-code-quality--testing)
- [Project Directory Structure](#-project-directory-structure)

---

## 🎯 What is Corus Studios?

Corus Studios serves two primary audiences:

1. **For Clients & Customers:**
   - **Online Photoshoot Booking:** Reserve studio sessions (Birthday, Graduation, Matriculation, Lifestyle, Agenda) with real-time calendar availability and upfront deposit checkout.
   - **Studio Space Reservation:** Request exclusive studio space hire for custom productions with an approval-gated workflow.
   - **Equipment Rental:** Browse cameras, lighting, and gear with instant daily booking.
   - **Merchandise & Prints Store:** Browse catalog products, add items to a persistent cart, and place orders.
   - **Automated Digital Receipts:** Download branded PDF invoices and receipts upon payment confirmation.

2. **For Studio Managers & Admins:**
   - **Executive Dashboard:** Live metrics for revenue, bookings, orders, and equipment utilization.
   - **Finance & Bookkeeping Ledger:** Full tracking of revenue and operational expenses with one-click CSV and PDF export.
   - **Content Management System (CMS):** Upload and organize portfolio images by shoot category with ImageKit CDN integration.
   - **Role-Based Access Control (RBAC):** Admin and granular staff roles with scoped permissions and immutable audit logging.

---

## ⚡ Key Features

| Module | Features |
| :--- | :--- |
| **Photoshoot Sessions** | Dynamic duration & pricing, calendar slots, 15-minute slot holds during checkout, walk-in bookings support. |
| **Studio Space Hire** | Request-based reservation, admin approval/rejection pipeline, deposit collection within 48 hours of approval. |
| **Gear Rental** | Daily rental rates, equipment inventory tracking, security deposit management, check-in return confirmation. |
| **Store & Catalog** | Multi-category product catalog, stock depletion guards, cart persistence, shipping & pickup fulfillment. |
| **Payments** | Paystack checkout integration (Mobile Money & Cards in GHS), automated webhook verification, offline cash tracking. |
| **Invoicing & Receipts** | Real-time HTML & PDF receipt generation with QR validation and automated email delivery. |
| **Security & Auth** | JWT bearer authentication, OTP email verification, rate limiting, Argon2/Bcrypt password hashing. |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    Client["Client / Admin Browser"] -->|Next.js App / Port 3000| Frontend["Frontend (Next.js 16)"]
    Frontend -->|REST API Requests| Backend["Backend (FastAPI / Port 8000)"]
    Backend -->|PostgreSQL Driver| DB[("PostgreSQL 16 Database")]
    Backend -->|Media Upload & Delivery| ImageKit["ImageKit CDN"]
    Backend -->|Payment Initialization & Webhooks| Paystack["Paystack Gateway"]
    Backend -->|Automated PDF Generation| PDFEngine["WeasyPrint / xhtml2pdf"]
    Backend -->|Transaction Logs| AuditLog["Immutable Audit Trail"]
```

---

## 💻 Tech Stack

### Frontend (`corus-studios`)
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Library:** [React 19](https://react.dev/)
- **Language:** TypeScript
- **Styling:** CSS Modules & Tailwind CSS v4
- **Icons & Visuals:** [Lucide React](https://lucide.dev/), React Icons
- **Charts:** [Recharts](https://recharts.org/)
- **Carousels:** Swiper.js

### Backend (`corus-backend`)
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Database ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Migrations:** [Alembic](https://alembic.sqlalchemy.org/)
- **Data Validation:** [Pydantic v2](https://docs.pydantic.dev/)
- **Server:** [Uvicorn](https://www.uvicorn.org/) with WatchFiles reload
- **Rate Limiting:** SlowAPI
- **PDF Generation:** WeasyPrint / xhtml2pdf / ReportLab

### Infrastructure & External Services
- **Database:** PostgreSQL 16 (Alpine)
- **Containerization:** Docker & Docker Compose
- **Media CDN:** [ImageKit.io](https://imagekit.io/)
- **Payment Processing:** [Paystack](https://paystack.com/)

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (recommended), **OR**:
- Node.js 20+ & npm
- Python 3.11+
- PostgreSQL 15+

---

### Method 1: Docker Compose (Recommended)

The easiest way to spin up the entire system (Database, Backend API, and Frontend web app) is with Docker Compose:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Unknown-strange/corus-site.git
   cd corus-site
   ```

2. **Configure environment files:**
   Ensure `corus-backend/.env` exists (see [Environment Configuration](#-environment-configuration)).

3. **Start all services:**
   ```bash
   docker compose up -d
   ```

4. **Access the application:**
   - **Frontend Site:** [http://localhost:3000](http://localhost:3000)
   - **Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)
   - **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **PostgreSQL Database:** `localhost:5432`

---

### Method 2: Manual Local Development

If you prefer running services directly on your host machine without Docker:

#### 1. Start PostgreSQL
Ensure PostgreSQL is running and create a database named `corus_db`:
```bash
createdb corus_db
```

#### 2. Backend Setup (`corus-backend`)
```bash
cd corus-backend

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial admin, session types, catalog items, and rentals
python scripts/seed_admin.py
python scripts/seed_catalog.py
python scripts/seed_sessions.py
python scripts/seed_rentals.py

# Start backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### 3. Frontend Setup (`corus-studios`)
Open a new terminal window:
```bash
cd corus-studios

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Environment Configuration

### Backend: `corus-backend/.env`

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://corus:corus@localhost:5432/corus_db` |
| `SECRET_KEY` | JWT signing secret key | `super-secret-random-key` |
| `DEBUG` | Enable debug logs & dev OTPs | `true` |
| `FRONTEND_URL` | Allowed client URL for CORS | `http://localhost:3000` |
| `ADMIN_USERNAME` | Default seed administrator | `admin` |
| `ADMIN_PASSWORD` | Default seed admin password | `change-me-on-first-run` |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private API key | `private_...` |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key | `public_...` |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit base delivery URL | `https://ik.imagekit.io/corusStudio` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | `sk_test_...` |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | `pk_test_...` |

### Frontend: `corus-studios/.env.local`

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend API base address | `http://localhost:8000` |

---

## 🔑 Default Credentials & Seed Data

When the database is seeded, the following defaults are available:

- **Admin Login:**
  - **URL:** [http://localhost:3000/login](http://localhost:3000/login)
  - **Username:** `admin`
  - **Password:** `change-me-on-first-run` *(defined in `.env`)*
- **Pre-seeded Shoot Categories / Session Types:**
  - Birthday Shoot
  - Graduation Shoot
  - Matriculation Shoot
  - Lifestyle (Weddings & Funerals)
  - Agenda / Editorial Shoot

---

## ⏰ Scheduled Jobs & Automation

The backend includes automated maintenance tasks located in `corus-backend/scripts/`:

```bash
# Expire studio slot holds older than 15 minutes
python scripts/expire_holds.py

# Expire unpaid shop orders past payment window
python scripts/expire_unpaid_orders.py

# Expire studio reservation approvals past 48h deadline
python scripts/expire_reservation_approvals.py

# Send 24-hour advance photoshoot reminders to clients
python scripts/send_booking_reminders.py
```
*In production, configure these scripts via cron or a cloud scheduler (e.g., Render Cron Jobs, AWS EventBridge).*

---

## 📖 API Documentation

FastAPI automatically generates interactive OpenAPI documentation:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key Route Namespaces:
- `/auth` — Customer registration, OTP verification, login, password recovery.
- `/catalog` — Public products, categories, homepage CMS, gallery content.
- `/sessions` — Shoot session types, calendar availability, slot holds.
- `/rentals` — Equipment rental catalog and checkout.
- `/reservations` — Studio space hire requests and status checks.
- `/cart` & `/orders` — Shopping cart and order fulfillment.
- `/payments` & `/webhooks` — Paystack transaction handling.
- `/admin/*` — Protected management endpoints (Dashboard, Analytics, Finance, Staff, Receipts, Gallery CMS).

---

## 🧪 Code Quality & Testing

### Backend Quality Checks
```bash
cd corus-backend
source .venv/bin/activate

# Run test suite
pytest tests/

# Run Ruff linter
ruff check app/

# Run Bandit security scanner
bandit -r app/
```

### Frontend Quality Checks
```bash
cd corus-studios

# TypeScript compilation check
npx tsc --noEmit

# ESLint check
npm run lint

# Production build verification
npm run build
```

---

## 📂 Project Directory Structure

```text
corus-site/
├── docker-compose.yml              # Multi-container orchestration
├── corus-backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/routes/             # API routes (public & admin endpoints)
│   │   ├── core/                   # Security, JWT, config, rate limiting
│   │   ├── models/                 # SQLAlchemy database models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   └── services/               # Paystack, ImageKit, receipts, email
│   ├── alembic/                    # Database schema migrations
│   ├── scripts/                    # Seed scripts & maintenance cron jobs
│   ├── tests/                      # Automated pytest suite
│   ├── Dockerfile                  # Production container definition
│   └── requirements.txt            # Python dependencies
│
└── corus-studios/                  # Next.js 16 Application
    ├── app/
    │   ├── admin/                  # Protected admin portal (Finance, Bookings, CMS)
    │   ├── gallery/                # Public portfolio gallery
    │   ├── login/ & register/      # Customer & staff authentication
    │   └── page.tsx                # Homepage
    ├── components/                 # Reusable UI widgets, guards, & cards
    ├── lib/                        # API clients, helpers, & dashboard types
    ├── public/                     # Static media & assets
    ├── Dockerfile                  # Container definition
    └── package.json                # Node dependencies
```

---

## 📄 License
Proprietary software — Copyright © Corus Studios. All rights reserved.

