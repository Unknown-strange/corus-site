# AGENTS_CHORUZ

Running log of what has been built on the Corus Studios frontend, the
conventions we've settled, and what is blocked. Updated as we go.

Reference docs:

- [`docs/FRONTEND.md`](docs/FRONTEND.md) — business rules, API contract, route map, open questions
- [`AGENTS.md`](AGENTS.md) — Next.js 16 warning: read `node_modules/next/dist/docs/` before writing framework code
- [`../corus-backend/roadmap.md`](../corus-backend/roadmap.md) — backend phase status

---

## Ownership

| Area | Owner | Editable here |
|------|-------|---------------|
| Frontend — every screen and feature | Us | ✅ |
| Backend API (FastAPI) | Other group members | ⛔ read-only |
| Database schema / migrations | Other group members | ⛔ read-only |
| Deployment config (Render, Supabase) | Other group members | ⛔ except frontend env + hosting |

**The API is a contract with another team.** If an endpoint or field we need
doesn't exist, we stop and write it down as a blocker — we don't invent a mock
and move on, and we don't rename frontend fields to "make more sense". Field
names match what the API actually returns, verified against the live OpenAPI
schema at `<API_BASE>/docs`.

---

## Conventions settled so far

| Decision | Choice | Why |
|----------|--------|-----|
| Styling | **CSS Modules**, co-located as `Component.module.css` | Matches every existing component (Hero, Navbar, Gallery, Booking) |
| Design fidelity | Absolute layout on a fixed design stage, scaled by a `--s` unit | Lets CSS carry the exact design numbers while still scaling down |
| Responsive strategy | Mobile-first base styles; design layout from `min-width: 1024px` | Below 1024px the mosaic is dropped and the form stacks |
| Route files | `app/<route>/page.tsx` = server component holding `metadata`, rendering a client component from `components/` | Keeps metadata server-side; only the interactive part ships as client JS |
| Decorative images | `alt=""` + `aria-hidden` on the wrapper | Portfolio imagery on auth screens conveys nothing to a screen reader |
| Form labels | `aria-label` per input | Designs have no visible labels; placeholders alone are not accessible names |

Still undecided — see *Project conventions* in [`docs/FRONTEND.md`](docs/FRONTEND.md):
token storage, data-fetching strategy, form validation library, `lib/api/`
folder shape.

---

## Build log

### 2026-07-27 — Frontend documentation

Created [`docs/FRONTEND.md`](docs/FRONTEND.md): corrected business rules with a
delta table against the original requirements document, route map, API
conventions (error envelope, pagination, money, dates, rate limits), auth and
session handling, per-flow endpoint sequences, the staff permission matrix,
design/asset state, open questions, and a phased build checklist.

Three rules in the requirements document were confirmed stale: rentals and shop
purchases have **no approval step**, and a paid deposit — not an approval —
confirms a session booking. Approval gating now applies to studio reservations
and custom session types only.

### 2026-07-27 — Sign Up screen (UI only)

**Files**

- `app/signup/page.tsx` — route + metadata
- `components/SignUp.tsx` — client component
- `components/SignUp.module.css` — layout

**Layout.** A **1289 × 1030** card — the design's 1396 width minus the 107px of
empty canvas left of the photos, so the card edge sits flush against the
mosaic. `--s` is one design pixel, so the CSS reads directly off the design:
`calc(283 * var(--s))` is "283px at design width".

Photo mosaic coordinates were given as absolute page positions (`top: 1458px`
and down) and are normalised in `SignUp.tsx` — vertically against the topmost
image, horizontally by 107px. The bottom row runs to y 1062 against a
1030-tall card and is intentionally clipped, matching the design.

The form panel spans x 559–1289: the 580-wide form with a matching 75px gutter
on both sides.

**Verified** at 1920, 1536, 1440, 1024, and 375px — every element lands on its
design coordinate (icon 946/145, button 741/787 at 580×80, fields at
250/354/458/562/666, all relative to the original canvas). No scrolling in
either axis at any width. All seven asset paths return 200. `eslint` and
`tsc --noEmit` clean.

**Deviations from the design, deliberate:**

1. **Submit is not wired.** See the blocker below.
2. **Helvetica** is specified but ships on neither Windows nor Android, so it
   falls back to Arial for most users. Consider a webfont if the exact face
   matters.

### 2026-07-27 — Sign Up sizing, and landing page entry points

**Sizing.** The card previously filled the whole window. It now scales to fit
whichever of viewport width or height runs out first, with a 48px gutter, and
sits centred on a `#f4f5f6` page with a 1px `#EFEFEF` ring. At 1920×1080 it
renders 1231×984 (95.5%); at 1536×864, 961×768 (74.6%). Never scrolls.

The ring is a `box-shadow` spread rather than a `border` — a border would sit
inside the box and shift every absolutely positioned child by 1px.

Fixed the "Phne Number" placeholder typo.

**Entry points.** Nothing linked to `/signup` — it was reachable only by typing
the URL. Added:

- `Sign Up` button in the Navbar, beside `Log In` (desktop) and in the
  slide-down menu (mobile). `Log In` → `/login` still points at a page that
  does not exist yet.
- The landing page booking form now routes to `/signup` on submit, since
  `POST /sessions/holds` is customer-only.

**Auth gating is a placeholder.** There is no session state in the app, so the
booking form redirects *every* visitor. When the auth context lands, the check
belongs in `Booking.tsx` — signed-in customers should continue into the real
booking flow instead. The same pattern will be needed for cart, rentals, and
reservations.

### 2026-07-28 — Sign Up visual corrections

- Seams between mosaic photos filled with `#f4f5f6`, matching the page.
- Translucent dark wash added, which the first read of the design missed.

  The card is **two rectangles** — photos left (x 0–559), form right
  (x 559–1289). The wash is a single sheet over the left rectangle
  (`.mosaic::after`), *not* one overlay per photo, so it darkens the seams
  between photos as well. Opacity is an estimate from the mockup — tune the
  single `--photo-scrim` variable in `SignUp.module.css`.
- Email, Phone Number, Password, and Confirm Password left aligned with a 45px
  inset. First and Last Name stay centred, per the design.

---

## Blockers

### 🔴 Sign Up cannot submit — register contract mismatch

`POST /auth/register` accepts exactly:

```
{ first_name, last_name, username, email, password }
```

Two problems:

- The design collects a **phone number**. There is no phone column on the
  `User` model and no phone field on `RegisterRequest`. Pydantic ignores unknown
  fields, so sending it would collect customer data and silently discard it.
- The design has **no username field**, but `username` is required by the API
  *and* is what `/auth/login` authenticates against.

Deriving a username from the email was considered and rejected: customers would
be unable to log in with a credential they never chose, and collisions would
surface as a 409 they can't act on.

**Needed from the backend team:** add `phone` to the user model and
`RegisterRequest`, and make `username` optional (or confirm the design should
gain a username field instead).

Until then the form renders and validates client-side, and the submit handler
shows an inline notice explaining why nothing was sent. Remove that notice and
the block comment in `SignUp.tsx` when wiring it up.

---

## Next up

1. Resolve the register blocker, then wire Sign Up → `/auth/register`.
2. OTP verification screen — registration returns `201` and emails a 6-digit
   code; only `/auth/verify-otp` returns a token.
3. Login screen — `/login` is linked from the Navbar but does not exist yet.
   Note it authenticates on **username**, not email.
4. Auth context, then replace the blanket redirect in `Booking.tsx` with a real
   signed-in check.
5. `lib/api/` client — base URL, bearer token, error-envelope parsing.
6. `images.remotePatterns` for ImageKit, before any API-backed image is rendered.
