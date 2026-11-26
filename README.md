# Booksy-style Appointment Booking — Reference Implementation

A reference implementation inspired by **Booksy**: a local-services marketplace where users can own a business, book appointments, and manage a schedule. Built with Next.js 16.4.6 App Router, React 19, Tailwind 4, TypeScript, MongoDB + Mongoose, bcryptjs, jose (JWT in an HTTP-only cookie) and zod.

## Features

- **Accounts** — register, login, logout, `/api/auth/me`; bcrypt password hashing, signed JWT session cookie.
- **Businesses** — owner-created profiles with category, location, description, images and per-day opening hours; search, category/location filters, rating sort, pagination and favorites.
- **Services** — per-business name, description, duration and price; owner-only create/update/delete.
- **Availability** — 15-minute slot grid generated from opening hours minus existing appointments; booking validates hours, past times and service duration overlap.
- **Appointments** — `pending → confirmed → completed` plus `cancelled` from pending/confirmed; customer and owner views; atomic slot release on cancellation.
- **Reviews** — only after a completed appointment, one per appointment, with an atomic aggregate rating on the business.
- **Favorites** — customer-saved businesses with a favorites-only browse filter.
- **Owner workspace** — business/service management, daily schedule and completed-revenue dashboard.
- **UI** — responsive layout, calendar/slot picker, booking flow, loading/empty/error states.

## Setup

Requirements: Node 20.9+, a local MongoDB instance.

```bash
npm install
cp .env.example .env.local
npm run dev -- -p 3210
```

Environment (`.env.local`):

```
MONGODB_URI=mongodb://127.0.0.1:27017/booksy_ref
JWT_SECRET=replace-with-a-long-random-secret
```

Seed the database (re-runnable; wipes **only** `booksy_ref`):

```bash
npm run seed
```

Quality gates:

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build
npm run start -- -p 3210
```

## Demo accounts

All demo passwords are `password123`.

| Email | Role |
| --- | --- |
| `owner@example.com` | Owns Glow Hair Studio and Sharp Edge Barbers |
| `mia@example.com` | Owns Wellness Clinic and Pulse Fitness |
| `zoe@example.com` | Owns Serenity Spa; also books appointments |
| `customer@example.com` | Customer with completed visits and favorites |
| `liam@example.com`, `noah@example.com` | Additional customers |

## API table

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Create account (201) | — |
| POST | `/api/auth/login` | Sign in | — |
| POST | `/api/auth/logout` | Clear session cookie | — |
| GET | `/api/auth/me` | Current user or `null` | — |
| GET | `/api/businesses` | List/search/filter/sort/paginate | — |
| POST | `/api/businesses` | Create business (201) | user |
| GET | `/api/businesses/[id]` | Business detail + services | — |
| PATCH | `/api/businesses/[id]` | Update business | owner |
| DELETE | `/api/businesses/[id]` | Delete business + dependents | owner |
| GET | `/api/businesses/[id]/services` | List services | — |
| POST | `/api/businesses/[id]/services` | Add service (201) | owner |
| GET | `/api/businesses/[id]/slots` | Available slots for `date` + `serviceId` | — |
| GET | `/api/businesses/[id]/reviews` | Paginated reviews | — |
| PATCH | `/api/services/[id]` | Update service | owner |
| DELETE | `/api/services/[id]` | Delete service (blocks upcoming bookings) | owner |
| GET | `/api/appointments` | Customer appointments (`status`, `page`, `limit`) | user |
| POST | `/api/appointments` | Book a slot (201) | user |
| GET | `/api/appointments/[id]` | Appointment detail | customer/owner |
| PATCH | `/api/appointments/[id]` | `confirm` / `complete` / `cancel` | owner / customer |
| POST | `/api/reviews` | Review a completed appointment (201) | customer |
| DELETE | `/api/reviews/[id]` | Delete own review | author |
| GET | `/api/favorites` | Favorite businesses | user |
| POST | `/api/favorites` | Add favorite (201/200) | user |
| DELETE | `/api/favorites/[businessId]` | Remove favorite | user |
| GET | `/api/owner/appointments` | Owner schedule (`date`, `businessId`, `status`) | user |
| GET | `/api/owner/revenue` | Completed revenue and monthly breakdown | user |

Pages: `/`, `/login`, `/register`, `/browse`, `/businesses/[id]`, `/appointments`, `/favorites`, `/owner`. Authenticated pages live in the `(app)` route group and redirect anonymous visitors to `/login`.

## Double-booking model

Bookings occupy every 15-minute key from `start` to `start + durationMin`. A unique compound index on `{ business: 1, slotKeys: 1 }` rejects any overlapping booking — including overlaps caused by longer services — with HTTP 409. Cancelling clears `slotKeys`, releasing the slots.

## Known limitations

- Times are interpreted in UTC; there is no per-business timezone or DST handling.
- Slot granularity is fixed at 15 minutes and overnight opening hours are not supported.
- No payments, notifications, image uploads, staff members or per-service provider selection.
- There is no password reset or email verification; `JWT_SECRET` must be replaced for any real deployment.
- Owner revenue counts completed appointments at their booked price only.

## Top improvements

1. Timezone-aware opening hours and slot generation per business.
2. Staff providers with individual schedules and per-provider double-booking guards.
3. Payments, deposits and automated confirmation/cancellation notifications.
