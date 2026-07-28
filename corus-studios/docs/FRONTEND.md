# Corus Studios — Frontend Guide

Working reference for the frontend team. Covers the business rules the UI must
implement, the API contract, project conventions, and the build checklist.

> **This document supersedes the original requirements document where they
> conflict.** See [Business rules](#business-rules) for the deltas. The backend
> is the implemented source of truth; this guide records what it actually does.

Companion docs:

- Backend phase status and business design — [`../../corus-backend/roadmap.md`](../../corus-backend/roadmap.md)
- Backend setup and deploy — [`../../corus-backend/README.md`](../../corus-backend/README.md), [`../../corus-backend/docs/DEPLOYMENT.md`](../../corus-backend/docs/DEPLOYMENT.md)
- Live API schema — `<API_BASE>/docs` (Swagger) and `/redoc`

---

## Table of contents

- [Scope](#scope)
- [Business rules](#business-rules)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Route map](#route-map)
- [API conventions](#api-conventions)
- [Auth and sessions](#auth-and-sessions)
- [Flow specifications](#flow-specifications)
- [Admin portal and permissions](#admin-portal-and-permissions)
- [Project conventions](#project-conventions)
- [Design system and assets](#design-system-and-assets)
- [Accessibility and performance](#accessibility-and-performance)
- [Git workflow](#git-workflow)
- [Deployment](#deployment)
- [Open questions](#open-questions)
- [Build checklist](#build-checklist)

---

## Scope

Two portals against one FastAPI backend:

| Portal | Users | Covers |
|--------|-------|--------|
| **Customer** | Public visitors, registered customers | Marketing pages, gallery, shop, rentals, session booking, studio reservations, account, receipts |
| **Admin** | Owner (admin), staff | Dashboard, approvals, inventory, slots, orders, customers, CMS, finance, audit log |

Out of scope (unchanged from the requirements doc): mobile app, AI photo
editing, online photo delivery, loyalty programme, third-party accounting
integration, live chat.

---

## Business rules

Currency is **GHS** throughout. Payments go through **Paystack**. There is **no
shipping** — everything is collected at the studio.

### The four transaction flows

| Flow | Approval? | Payment | Notes |
|------|-----------|---------|-------|
| **Session booking** | No | 50 GHS deposit online | Slot held 15 min during checkout; balance paid in person |
| **Equipment rental** | **No** | Full amount, instant | Daily rate × number of days |
| **Studio reservation** | **Yes** | Deposit after approval | Customer has **48 h** to pay once approved |
| **Shop purchase** | **No** | Full amount, instant | Stock drops at checkout; restored if unpaid after 15 min |

### Deltas from the original requirements document

These changed after the requirements doc was written. Build to the table above.

| Requirement | Doc said | Actual |
|-------------|----------|--------|
| User Story 5 — rent equipment | "Pending approval" | **No approval.** Instant Paystack checkout |
| User Story 6 — purchase equipment | "Submit request, pending approval" | **No approval.** Cart → checkout → pay |
| User Story 3 — book session | Slots, prevent double booking, pending approval | Slots and double-booking prevention are right; **no approval** — a paid deposit confirms the booking |

Approval-gated flows are now **studio reservations only**, plus custom
("Others") session types.

### Order fulfilment lifecycle

```
pending → processing → in_route → delivered
```

`in_route` means ready for collection / handed over — not postal shipping. Only
admin/staff advance the status.

### Timers the UI must surface

| Timer | Value | Where it matters |
|-------|-------|------------------|
| Slot hold TTL | 15 min | Session checkout — show a countdown, release on expiry |
| Unpaid order expiry | 15 min | Shop checkout — order voided, stock restored |
| Reservation payment window | 48 h | After admin approval — show a deadline |
| OTP expiry | 10 min | Registration and password reset |
| OTP resend cooldown | 60 s | Disable the resend button |
| Access token lifetime | 60 min | See [Auth and sessions](#auth-and-sessions) |

Values are backend-configurable, so read them from API responses where the
response provides them rather than hardcoding.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.11 (App Router) |
| React | 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + CSS Modules (see [Project conventions](#project-conventions)) |
| Icons | lucide-react |
| Carousel | swiper |
| Linting | ESLint 9 + eslint-config-next |

> ⚠️ **Next.js 16 is not the Next.js most tutorials describe.** APIs,
> conventions, and file structure differ from earlier versions. Before writing
> Next-specific code, read the relevant guide in `node_modules/next/dist/docs/`
> and heed deprecation notices. See [`../AGENTS.md`](../AGENTS.md).

---

## Getting started

```bash
npm install
```

Create `.env.local` (see below), then:

```bash
npm run dev
```

Runs at `http://localhost:3000`.

### Pointing at a backend

Two options:

1. **Deployed backend on Render** — simplest. Set `NEXT_PUBLIC_API_URL` to the
   Render URL. Note the free tier cold-starts, so the first request can take
   ~30 s.
2. **Local backend** — follow [`../../corus-backend/README.md`](../../corus-backend/README.md).
   Runs at `http://127.0.0.1:8000`.

**CORS:** the backend allows all origins when `DEBUG=true`, but in production it
allows exactly one origin — its `FRONTEND_URL` setting. Any deployed frontend
origin must be registered with the backend team. See [Open questions](#open-questions).

---

## Environment variables

Committing `.env*` is blocked by `.gitignore`. Keep this table current so new
team members know what to create.

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://127.0.0.1:8000` | Backend base URL, no trailing slash |

**Paystack public key is *not* an env var.** Every checkout response includes a
`public_key` field — use that. It keeps the frontend in sync when the backend
switches between test and live keys.

---

## Route map

### Public (no auth)

| Route | Purpose |
|-------|---------|
| `/` | Homepage — hero, gallery preview, booking CTA |
| `/gallery` | Full gallery with category filters |
| `/shop` | Product catalogue |
| `/shop/[slug]` | Product detail |
| `/rentals` | Rental equipment catalogue |
| `/rentals/[slug]` | Rental equipment detail |
| `/login` | Login (customers, staff, admin — one form) |
| `/signup` | Registration |
| `/verify-otp` | OTP entry after registration |
| `/forgot-password`, `/reset-password` | Password reset |

### Customer (auth required)

| Route | Purpose |
|-------|---------|
| `/booking` | Session type + slot selection |
| `/booking/checkout` | Hold countdown + deposit payment |
| `/cart` | Shopping cart |
| `/shop/checkout` | Order checkout |
| `/reservations/new` | Studio reservation request |
| `/account` | Profile, password, username |
| `/account/bookings`, `/orders`, `/rentals`, `/reservations` | History |
| `/account/receipts` | Receipt list + PDF download |

### Payment callbacks — fixed by the backend

The backend constructs these URLs, so the paths are **not ours to rename**:

| Route | Built by |
|-------|----------|
| `/booking/payment/callback?reference=…` | `booking_checkout.py` |
| `/shop/payment/callback?reference=…` | `order_checkout.py` |
| `/rentals/payment/callback?reference=…` | `rental_checkout.py` |
| `/reservations/payment/callback?reference=…` | `studio_reservations.py` |

In development (Paystack unconfigured) the backend returns these directly as the
`authorization_url`. In production Paystack redirects to the backend's single
`PAYSTACK_CALLBACK_URL` instead — so a **unified `/payment/callback` page must
also exist**, and all five paths should share one component.

**Callback contract:** read `reference` from the query string →
`GET /payments/verify/{reference}` → the response returns whichever of
`booking_id`, `order_id`, `rental_id`, `reservation_id` applies → route to that
confirmation screen.

### Admin (role: admin or staff)

`/admin` plus `/admin/dashboard`, `/orders`, `/bookings`, `/reservations`,
`/rentals`, `/products`, `/categories`, `/sessions`, `/slots`, `/customers`,
`/staff`, `/receipts`, `/payments`, `/finance`, `/cms`, `/audit-logs`.

Nav items are gated by permission — see [Admin portal and permissions](#admin-portal-and-permissions).

---

## API conventions

Base URL from `NEXT_PUBLIC_API_URL`. Authenticated requests send
`Authorization: Bearer <access_token>`.

### Error envelope

Every error response has this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": []
  }
}
```

| Code | HTTP | Suggested UI |
|------|------|--------------|
| `validation_error` | 422 | Map `details[].loc` to form fields, show inline |
| `unauthorized` | 401 | Clear token, redirect to `/login` |
| `forbidden` | 403 | "You don't have permission" — don't redirect |
| `not_found` | 404 | Empty/404 state |
| `conflict` | 409 | Inline message — e.g. slot taken, out of stock |
| `rate_limit_exceeded` | 429 | "Too many attempts, try again shortly" |
| `service_unavailable` | 503 | "Payments unavailable right now" |
| `internal_error` | 500 | Generic error state |

`422` details carry `{ loc, msg, type }` per field — `loc` is a path array whose
last element is the field name.

### Pagination

Admin list endpoints return:

```json
{ "items": [], "total": 0, "page": 1, "limit": 20, "pages": 1 }
```

### Money

Amount fields are suffixed `_ghs` and are decimals. Pydantic may serialise them
as JSON strings, so **normalise through one helper** rather than assuming
`number`. Never do floating-point arithmetic on them — the backend stores
pesewas internally and is authoritative for every total.

Display with:

```ts
new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" })
```

### Dates

ISO 8601 UTC on the wire. Display in the studio timezone, `Africa/Accra`.

### Rate limits

Auth endpoints are rate limited — 5/min generally, 10/min for login. Handle 429
on every auth form; don't let it surface as a silent failure.

---

## Auth and sessions

### Registration

```
POST /auth/register    { first_name, last_name, username, email, password }
  → 201, OTP emailed
POST /auth/verify-otp  { email, otp }  → { access_token, token_type }
POST /auth/resend-otp  { email }
```

Constraints to enforce client-side: username ≥ 3 chars, password ≥ 8 chars, OTP
exactly 6 digits, OTP valid 10 min, resend cooldown 60 s, max 5 attempts.

In development the register/resend responses include a `dev_otp` field so you
can test without a mail server. It is absent in production — never depend on it
in UI logic.

### Login and password reset

```
POST /auth/login            { username, password }  → { access_token }
POST /auth/forgot-password  { email }
POST /auth/reset-password   { email, otp, new_password }  → { access_token }
```

Login takes **username**, not email.

### Session handling

`GET /auth/me` returns:

```json
{ "id", "email", "username", "first_name", "last_name",
  "role", "email_verified", "is_active", "permissions", "created_at" }
```

- `role` is `customer` | `staff` | `admin` — this drives which portal the user
  lands in after login.
- `permissions` is a string array, populated for staff.

**There is no refresh token.** The access token expires after 60 minutes
(`ACCESS_TOKEN_EXPIRE_MINUTES`). The UI must handle expiry deliberately: on any
`401`, clear the token and redirect to `/login`, preserving the intended
destination so the user returns to where they were.

### Account management

`PATCH /auth/password` (current + new password) and `PATCH /auth/username`
(new username + current password).

---

## Flow specifications

### A — Session booking

```
GET  /sessions/types                     list session types + prices
GET  /sessions/availability?…            open slots (excludes blocked/booked/held)
POST /sessions/holds        { slot_id }  → hold_id, 15 min TTL
POST /sessions/bookings/checkout { hold_id }
     → { booking_id, authorization_url, reference, public_key, amount_ghs }
redirect to authorization_url → Paystack → callback
GET  /payments/verify/{reference}
```

UI requirements: unavailable slots greyed out (not hidden), a visible countdown
on the hold, `DELETE /sessions/holds/{hold_id}` if the user backs out, and a
clear statement that the deposit is partial with the balance due at the studio.
`GET /sessions/bookings/me` and `/bookings/{id}` back the history screens —
booking detail exposes `deposit_amount_ghs`, `total_price_ghs`,
`balance_due_ghs`, and an optional `receipt`.

### B — Equipment rental (no approval)

```
GET  /rentals/equipment              catalogue
GET  /rentals/equipment/{slug}       detail
POST /rentals/checkout               → authorization_url, reference, …
GET  /rentals/me, /rentals/{id}      history
```

Price is daily rate × days. Show the computed total before checkout and make
clear it is charged in full immediately.

### C — Studio reservation (approval first)

```
POST /reservations                       submit request → status pending
GET  /reservations/me, /reservations/{id}
POST /reservations/{id}/checkout         only after approval → deposit payment
```

The UI must represent the full state machine — pending, approved (with a 48 h
payment deadline), rejected, paid, expired — and only show the pay action in the
approved state.

### D — Shop purchase

```
GET    /catalog/products, /catalog/products/{slug}, /catalog/categories
GET    /cart
POST   /cart/items                 { product_id, quantity }
PATCH  /cart/items/{product_id}
DELETE /cart/items/{product_id}, DELETE /cart
POST   /orders/checkout            → authorization_url, reference, …
GET    /orders/me, /orders/{id}
```

Cart requires auth. Out-of-stock products must not be addable. After checkout,
the order is unpaid for 15 minutes before being voided and stock restored —
communicate that on the payment screen.

### E — Receipts

`GET /receipts/me`, `/receipts/{id}`, `/receipts/{id}/download` (PDF). Available
across all four paid flows.

### F — Public content / CMS

`GET /catalog/content/homepage`, `/content/gallery`, `/content/rental-info`.
Homepage and gallery content is admin-managed — the frontend should render from
these endpoints, not from hardcoded arrays.

---

## Admin portal and permissions

Staff accounts are created by the admin with an explicit permission list. Admin
bypasses all permission checks. Use `permissions` from `/auth/me` to hide nav
items and actions the user cannot use.

| Permission | Unlocks |
|------------|---------|
| `dashboard.view` | Dashboard summary + activity feed |
| `orders.view` / `orders.manage` | Order list and detail / status transitions |
| `bookings.view` | Session bookings |
| `reservations.view` / `reservations.approve` | Reservation list / approve-reject actions |
| `rentals.view` / `rentals.manage` | Rentals / rent-equipment CRUD, mark returned |
| `receipts.view` | Receipt list, detail, PDF |
| `payments.view` | Payment list (raw Paystack JSON stays admin-only) |
| `customers.view` | Customer list and profile |
| `products.view` / `products.manage` | Catalogue / product + category CRUD, uploads |
| `cms.manage` | Site content, gallery, gallery uploads |
| `finance.view` / `finance.manage` | Ledger, summary, export / manual entries |
| `sessions.manage` | Session types, slots, booking settings |

**Admin-only, never assignable:** staff CRUD, audit logs, full payment JSON.

> Permission gating in the frontend is a UX affordance only. The backend
> enforces access — never treat a hidden button as a security control.

---

## Project conventions

### Decisions to settle

These are open in the codebase today. Two people choosing differently means
rework, so agree and record the answer here before building more screens.

- [ ] **Styling** — components currently use CSS Modules; `app/layout.tsx` uses
      Tailwind utilities. Pick one, or write the rule for when each applies.
- [ ] **Token storage** — `localStorage` vs httpOnly cookie. This decides
      whether authenticated data can be fetched in server components at all.
- [ ] **Data fetching** — server components vs client-side. `GalleryCard.tsx`
      currently fakes loading with a `setTimeout` over hardcoded data.
- [ ] **Forms** — validation library or hand-rolled, and how `422` details map
      back to fields.
- [ ] **Folder structure** — where `lib/api/*`, shared types, and feature
      components live.

### Current structure

```
corus-studios/
├── app/            App Router pages, layout.tsx, globals.css
├── components/     Shared components + co-located .module.css
├── lib/            Helpers (gallery.ts is currently empty)
├── public/         Static assets
└── docs/           This guide
```

### Component rules

- Add `"use client"` only where state, effects, or event handlers require it.
- Co-locate a component's CSS Module beside it: `Foo.tsx` + `Foo.module.css`.
- Every list view needs three states: loading (skeleton), empty, and error.
  `GallerySkeleton.tsx` is the existing pattern.
- One API module per domain under `lib/api/` — no raw `fetch` calls scattered
  through components.

---

## Design system and assets

### Tokens

`app/globals.css` currently defines only `--background` / `--foreground` with a
`prefers-color-scheme` dark variant, and `body` falls back to Arial despite Geist
being loaded in `layout.tsx`. **Brand colours, typography scale, and spacing
tokens are not yet defined** — they belong here once agreed.

### Assets

`public/` is the only asset store. There is no `assets/` directory.

| Path | Contents |
|------|----------|
| `public/images/` | `hero1.png` … `hero6.png` — Hero carousel |
| `public/gallery/` | `1.png` … `10.png` and `Aunt Vida.jpg` — gallery and Sign Up mosaic |
| `public/icons/` | `Profile.png` — Sign Up header icon |
| `public/*.svg` | `file`, `globe`, `next`, `vercel`, `window` — unused create-next-app boilerplate, safe to delete |

There is still **no logo file**. Most icons come from `lucide-react` at runtime.
Add a `public/brand/` directory when brand assets arrive.

**Filename hygiene — worth fixing early.** `Profile.png` is capitalised and
`Aunt Vida.jpg` contains a space. Both work on Windows, where the filesystem is
case-insensitive, but Vercel builds on Linux, where `"/icons/profile.png"` is a
404 while `"/icons/Profile.png"` is not. Reference paths with exact case, and
prefer renaming new assets to lowercase-with-hyphens.

### Remote images

Product and gallery images served by the API are hosted on **ImageKit**.
`next.config.ts` has no `images.remotePatterns` entry, so `next/image` will
reject those URLs. This must be configured before wiring any API-backed image.

---

## Accessibility and performance

- Pages load within 3 seconds (non-functional requirement).
- Responsive across mobile, tablet, and desktop — both personas use phones.
- Every image needs meaningful `alt` text. `GalleryCard.tsx` currently passes
  `alt=""` on all ten images.
- Forms need labels, visible focus states, and errors announced to screen
  readers.
- Interactive controls must be keyboard reachable — including the mobile menu
  and gallery filters.

---

## Git workflow

- `main` is the integration branch. Work on personal branches
  (`kwadwo-build`, `takyi-frontend`, …).
- Open a PR into `main`; at least one teammate reviews.
- Run `npm run lint` and `npm run build` before opening a PR.
- Never commit `.env*` files.

---

## Deployment

Target is Vercel. Set `NEXT_PUBLIC_API_URL` per environment.

The backend permits **exactly one origin** in production (`FRONTEND_URL`), so
each deployed frontend origin must be registered with the backend team.
Preview deployments get a unique URL per build and will currently be blocked by
CORS — see [Open questions](#open-questions).

---

## Open questions

Track these with the backend team; update as they resolve.

| # | Question | Status |
|---|----------|--------|
| 1 | `.env.example` is gitignored in `corus-backend` and was never committed, though both READMEs tell you to copy it. Ask for it to be committed. | Open |
| 2 | Production CORS allows a single origin — Vercel preview deployments will be blocked. Needs a regex/list-based origin config. | Open |
| 3 | Will `PAYSTACK_CALLBACK_URL` point at one unified `/payment/callback`, or the four per-flow paths? Affects how many callback pages we build. | Open |
| 4 | Confirm the deployed Render backend URL and whether a staging instance exists. | Open |
| 5 | Are money fields serialised as JSON strings or numbers? Verify against a live response and record it. | Open |
| 6 | **Blocks Sign Up and Log In submit.** The Sign Up design collects a phone number, but `User` has no phone column and `RegisterRequest` has no phone field — it would be silently discarded. The design also omits `username`, which `POST /auth/register` requires. The Log In design collects an **email**, but `POST /auth/login` authenticates on `username` only. Backend needs to add `phone` and relax `username` (or the designs need a username field). | **Open — blocking** |
| 7 | **Blocks Google sign-in.** The Log In design has a "Continue with Google" button, but the backend has no OAuth routes, no provider config, and no social-account columns on `User`. The feature needs scoping before the button can do anything. | **Open — blocking** |

---

## Build checklist

Mirrors the backend's phase structure so progress is comparable.

### Phase 1 — Foundation

- [ ] `.env.local` + `NEXT_PUBLIC_API_URL` wired
- [ ] API client with base URL, bearer token, error-envelope parsing
- [ ] Auth context / session handling, 401 → login redirect
- [ ] Settle the decisions in [Project conventions](#project-conventions)
- [ ] Design tokens in `globals.css`; fix the Geist font fallback
- [ ] `images.remotePatterns` for ImageKit
- [ ] Real page metadata (currently "Create Next App")

### Phase 2 — Auth screens

- [x] Sign Up screen — UI only, submit not wired (blocked by open question 6)
- [x] Log In screen — UI only, submit not wired (blocked by open questions 6, 7)
- [x] Admin Log In screen (`/admin/login`) — UI only. **Not blocked by the API**;
      needs the client, `NEXT_PUBLIC_API_URL`, and token storage
- [ ] Sign Up wired to `POST /auth/register`
- [ ] Log In wired to `POST /auth/login`
- [ ] Forgot password / reset password screens (`/forgot-password` is linked
      from Log In but does not exist yet)
- [ ] OTP verification
- [ ] Forgot password, reset password
- [ ] Role-based redirect after login (customer vs admin portal)

### Phase 3 — Public site

- [ ] Homepage from `/catalog/content/homepage`
- [ ] Gallery from `/catalog/content/gallery` (replace the hardcoded array)
- [ ] Shop catalogue + product detail
- [ ] Rental catalogue + equipment detail

### Phase 4 — Customer transactions

- [ ] Session booking: types, availability, hold countdown, deposit checkout
- [ ] Cart and shop checkout
- [ ] Rental checkout
- [ ] Reservation request + post-approval payment
- [ ] Payment callback pages
- [ ] Account: profile, history, receipts

### Phase 5 — Admin portal

- [ ] Dashboard, approvals queue, orders, inventory, slots
- [ ] Customers, staff, CMS, finance, audit log
- [ ] Permission-based nav gating
