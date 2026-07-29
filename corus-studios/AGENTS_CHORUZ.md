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

### 2026-07-28 — Log In screen, AuthShell extraction, navbar cleanup

**AuthShell.** The card chrome — page background, scaled stage, photo mosaic,
scrim, form panel — moved into `AuthShell.tsx` + `AuthShell.module.css`. The
mosaic had already been edited three times; keeping a second copy in the Log In
screen would have guaranteed the two drifting apart.

Split of responsibility: the shell styles the card and supplies the colour
variables and `--s`; each screen's stylesheet styles everything inside the
panel. The two never set the same property on the same element, so CSS Module
load order can't produce an override surprise.

Pages now compose: `app/<route>/page.tsx` renders `<AuthShell><Form /></AuthShell>`,
which keeps the shell a server component and ships only the form as client JS.
Sign Up geometry re-measured after the move and is unchanged.

**Files**

- `components/AuthShell.tsx`, `components/AuthShell.module.css`
- `components/LogIn.tsx`, `components/LogIn.module.css`
- `app/login/page.tsx`
- `components/SignUp.tsx`, `components/SignUp.module.css` — panel contents only

**Log In layout.** Same 1289 × 1030 card and 580-wide form at panel x 75. The
form is shorter, so the block starts lower (email at y 310 vs 250). Vertical
rhythm uses explicit margins rather than a flex gap, because the spacing is
uneven: field → forgot-password → button → divider → Google button.

No coordinates were supplied for this screen, so positions were derived
proportionally from the mockup. Field height (74), field width (580), and
button height (80) all landed on the Sign Up values, which is a good sign the
derivation is right.

**Navbar.** Removed the Sign Up button from both the desktop bar and the mobile
menu. Nav labels stack one word per line again — "Our" above "Gallery", "Log"
above "In" — via a `StackedLabel` helper, with `.navLink` set to `inline-flex`
so the anchor box wraps both lines. All five items share a centre line within
2px.

`/signup` is now reached from the Log In screen's footer link and from the
booking-form redirect.

---

### 2026-07-28 — Admin Log In, copy fixes, navbar alignment

**Copy corrected** on the customer Log In screen, at the team's call: the
subtitle now reads "Log in to continue." (was Sign Up's copy) and the footer
"Don't have an account?" (was a misplaced apostrophe).

**Navbar labels — one line each.** "Our Gallery" and "Log In" were wrapping onto
two lines. Root cause: `.navCenter` is absolutely positioned at `left: 50%`, so
its shrink-to-fit width was capped at the space remaining to the *right* of
that offset — about half the header — which squeezed the group and broke the
two-word labels. Fixed with `width: max-content` on `.navCenter` plus
`white-space: nowrap` on the links.

Verified single-line at 1536px and at 768px (the narrowest width where the
desktop bar shows), with no overflow past the header or the viewport at either.

**Admin Log In** — `app/admin/login/page.tsx`, `components/AdminLogIn.tsx`,
`components/AdminLogIn.module.css`.

Customer Log In minus the Google option, the "Sign In Options" divider, and the
sign-up footer, with username in place of email. Forgot Password was kept — it
wasn't in the removal list.

No coordinates were given, and dropping three elements leaves the block 459
design px tall in a 1030 card. Rather than leave the bottom third empty, the
block is centred vertically: header at y 286, button ending at 745, so 286
above and 285 below. Say the word if it should instead sit at the customer
screen's y 172.

**This is the first screen nothing blocks.** `POST /auth/login` takes
`{ username, password }` — exactly what the form collects, for admin and staff
alike. What's missing is frontend plumbing, not a backend change: the API
client, `NEXT_PUBLIC_API_URL`, and the token-storage decision.

### 2026-07-28 — Rentals page (studio space request)

`app/rentals/page.tsx`, `components/StudioRequest.tsx`,
`components/StudioRequest.module.css`. Linked from the navbar's Rentals tab,
which now points at `/rentals` instead of `#rentals` and highlights when
current (`aria-current="page"` + orange underline).

**Naming.** The navbar calls it Rentals, but the page is a *studio space
request*, which the backend calls **reservations** (`POST /reservations`,
approval-gated). `/rentals/*` in the API is **equipment rental** — a different,
instant-checkout flow with no screen yet. The component is named
`StudioRequest` rather than `Rentals` so the two don't get confused later.

No design coordinates were given and the page scrolls, so it is a fluid centred
column rather than a fixed design stage like the auth cards.

**Calendar** is hand-rolled: month/year selects, real weekday offsets, previous
and next month spill-over days muted, past dates disabled. Verified against the
design's July 2026 — five rows, first row `28 29 30 1 2 3 4`, last row
`26 27 28 29 30 31 1`.

Today is read via `useSyncExternalStore` with a `null` server snapshot rather
than `useState` + `useEffect`. Reading the clock during SSR risks a hydration
mismatch when server and visitor are on different dates, and the newer
`react-hooks/set-state-in-effect` rule rejects the effect-based version.

Verified at 1280px and 375px: multi-slot toggling, date selection, submit
validation, no console errors, no horizontal overflow, slots reflow 3 → 2 → 1
column.

**Not built, deliberately:** the signed-in avatar ("F Me") in the design's
navbar. There is no auth state yet, so the navbar still shows Log In.

### 2026-07-29 — Rentals rebuilt as two flows; admin login removed

**Admin login deleted.** `app/admin/login/`, `components/AdminLogIn.tsx` and its
stylesheet are gone. One login form now serves everyone.

Worth knowing: **no credentials need hardcoding in the frontend.** The backend
already provisions the admin account outside of registration —
`scripts/seed_admin.py` seeds it from `ADMIN_USERNAME` / `ADMIN_PASSWORD` env
vars. The admin types those into the normal form, `/auth/login` returns a
token, and `/auth/me` reports `role: "admin"`, which is what should route them
to the dashboard. Putting a password in frontend source would ship it to every
visitor in the JS bundle — anyone could read it in DevTools.

**Rentals is now two flows,** matching the two things the business rents:

```
/rentals                     catalogue — studio banner + gadget grid
/rentals/studio              studio request form (posts to /reservations)
/rentals/gadgets/[id]        gadget detail (posts to /rentals/checkout)
```

**Components**

| File | Role |
|------|------|
| `RentalsToolbar` | Grey band: heading, search, category filters, cart. Shared by the catalogue and the detail screen |
| `StudioHero` | "Rent a Studio for your Shoots" banner → `/rentals/studio` |
| `GadgetCard` | Card template — photo, name, price/day, Rent Now |
| `RentalsScreen` | Composes toolbar + hero + grid + View More; owns search state |
| `GadgetDetail` | Photo, price panel, dates/times, quantity, Add to Cart, Checkout |
| `StudioRequest` | Unchanged, now reached from the studio banner |

`GadgetCard` props mirror `RentEquipmentPublicResponse` exactly — `name`,
`slug`, `daily_rate_ghs`, `stock`, `image_url` — so swapping placeholder data
for `GET /rentals/equipment` is a substitution, not a rewrite. `stock === 0`
renders the design's "Not Available" state.

`lib/gadgets.ts` holds six placeholder gadgets, all using `gallery/gadget1.png`
(the only gadget photo in the repo). Names and prices are taken from the
mockup. The file is marked for deletion once the catalogue is live.

Verified at 1280px: 4-column grid reflowing 4 → 3 → 2 → 1, six cards linking to
their detail pages, studio banner linking to the request form, quantity stepper
capping at stock, no console errors, no horizontal overflow.

**Not built:** the signed-in avatar ("F Me") in the mockup's navbar — still no
auth state.

### 2026-07-29 — Three rentals fixes

**Back links** to `/rentals` added to the studio request screen (top-left of
the banner, in flow below 40rem so it can't overlap the heading) and the gadget
detail screen (above the title).

**Studio banner image was invisible.** `.image` had `z-index: -1` while `.hero`
was positioned but established no stacking context of its own, so the image
painted behind the *page* background rather than behind its own section.
Removed the negative z-index and lifted the title and CTA with `z-index: 1`
instead. Verified: hit-testing the title and button centres returns the text,
not the image.

**Calendar was blank until you touched something else.** `useSyncExternalStore`
was given a `subscribe` that never called `onStoreChange`, so after hydration
React had no reason to re-read the snapshot and the server's `null` stuck. The
component was hydrated the whole time — clicking any time slot forced a
re-render and the calendar appeared, which is what made it look intermittent.

Fixed once by making `subscribe` fire a one-shot notification. **That was still
wrong**: it left the calendar dependent on a re-render *after* hydration, so
anything slowing hydration showed an empty grid with dead dropdowns. See the
follow-up below for the real fix.

### 2026-07-29 — Calendar rendered on the server; banner overlay

**The calendar now comes from the server.** `StudioRequest` takes `todayIso` as
a prop; `app/rentals/studio/page.tsx` resolves it with

```ts
new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra" }).format(new Date())
```

`Africa/Accra` matches the backend's `STUDIO_TIMEZONE`, so what the UI treats
as a past date is what the API will reject. The page is `force-dynamic` —
without it "today" would be frozen to build time.

This removes the whole failure mode rather than patching it. Both earlier
attempts read the clock on the client, which meant the grid could only appear
on a re-render after hydration. Confirmed with `curl`: the raw HTML now
contains all 35 day buttons and no disabled selects, so the calendar is there
before any JavaScript runs. `calendarPlaceholder` and its CSS are gone.

**Lesson for the next date-dependent screen:** if a server component can
resolve the value, pass it as a prop. Client-only clock reads buy nothing here
and cost a render cycle you then have to defend.

**Studio banner:** source updated to `studio.jpg`, plus a
`rgba(0, 0, 0, 0.45)` wash via `.hero::after` so the heading and button read
clearly. It needs no z-index — it follows the image in tree order, and the text
sits above both on `z-index: 1`.

**Back links** shortened to "Back" on both screens.

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

### 🔴 Log In cannot submit — same root cause, and it now covers admin too

`POST /auth/login` takes `{ username, password }`. The design collects an
**email**, and the API does not authenticate on email. Resolving the register
blocker settles this too: whatever customers register with is what they log in
with.

### 🔴 Studio request cannot submit — multiple time slots

`POST /reservations` takes `{ requested_start, requested_end, purpose, notes }`
— **one contiguous datetime range**. The design lets the customer pick several
non-adjacent slots (10–11am, 2–3pm, 6–7pm in the mockup).

Neither workaround is the frontend's call to make:

- collapsing them into a single 10am–7pm range would reserve the studio for
  nine hours including the gaps, and be priced that way;
- firing one POST per slot creates several independent reservations, each
  approved or rejected separately, each with its own deposit.

**Needed from the backend team:** either accept a list of ranges on one
reservation, or confirm that one-request-per-slot is the intended behaviour.

Two smaller gaps on the same screen:

- **First/last name have nowhere to go.** The reservation attaches to the
  authenticated account and the API reads the name from there. The fields are
  in the design, so they render, but they are not part of the contract.
- **No availability source.** The design greys out unavailable slots.
  `/sessions/availability` covers session slots; reservations are free-form
  ranges with no slot table behind them. Nothing is faked as unavailable — all
  slots render selectable until an endpoint exists.

### 🔴 Gadget rental checkout — three fields with no contract

`POST /rentals/checkout` takes `{ equipment_id, start_date, end_date }` and
charges daily rate × days immediately. The detail screen adds:

- **Pickup / dropoff times** — the API takes plain dates, no time of day.
- **Quantity** — one request rents one unit; there is no quantity field.
- **Add to Cart** — `/cart` is products-only (`POST /cart/items { product_id }`).
  Rentals check out directly; there is no rental cart, and no cart screen
  exists for the toolbar icon to open either.

**Needed from the backend team:** confirm whether times and quantity are in
scope, or whether the design should drop them.

### 🔴 Rentals category filter has nothing to filter on

`EquipmentForRent` has no category column and `GET /rentals/equipment` takes no
filter parameters. Categories exist for shop products only. The Cameras /
Lenses / Lights buttons keep their selected state so the interaction is
visible, but they do not filter — inferring a category from the product name
would invent data. Search filters on name client-side, which works against
placeholder data and will need a server-side query once the catalogue is real.

### 🔴 "Continue with Google" has no backend

No OAuth routes, no provider config, no social-account columns on `User`. The
button is a design placeholder; clicking it explains why. Needs scoping as a
feature before it can be built.

Until then the form renders and validates client-side, and the submit handler
shows an inline notice explaining why nothing was sent. Remove that notice and
the block comment in `SignUp.tsx` when wiring it up.

---

## Next up

1. Resolve the register blocker, then wire Sign Up → `/auth/register` and
   Log In → `/auth/login`.
2. OTP verification screen — registration returns `201` and emails a 6-digit
   code; only `/auth/verify-otp` returns a token.
3. Forgot password / reset password screens — `/forgot-password` is linked from
   Log In but does not exist yet, so that link 404s today.
4. Auth context, then replace the blanket redirect in `Booking.tsx` with a real
   signed-in check.
5. `lib/api/` client — base URL, bearer token, error-envelope parsing.
6. `images.remotePatterns` for ImageKit, before any API-backed image is rendered.
