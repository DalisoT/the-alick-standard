# THE ALICK STANDARD

> **More Than a Cut. It's the Standard.**
>
> Premium barber booking & business-management platform for **Alick Tembo** —
> in-shop appointments and home-service grooming, with a private dashboard
> for managing the entire operation.

A polished Next.js 14 web app where customers book in seconds and Alick
runs the entire barbering business from one place: appointments, customers,
availability, services, revenue and expenses.

---

## What's inside

### Customer experience (public)
- Black / charcoal / gold premium barbershop aesthetic
- Landing page with brand showcase, services and "How it works"
- Service menu with prices and durations
- About Alick page
- **Two-track booking flow** — in-shop or home service
- Real-time availability calendar with 30-min slot granularity
- Travel-fee transparency (shown before confirming home bookings)
- Booking reference + WhatsApp deep-link on confirmation
- Mobile-first, fully responsive, fast

### Admin dashboard (`/admin`)
- Secure JWT-cookie login
- **Dashboard** — today's bookings, KPI cards, in-shop vs home revenue
- **Appointments** — filter by today/upcoming/pending/completed/cancelled,
  search by customer or ref, full status workflow
  (confirm / decline / reschedule / cancel / mark completed / no-show)
- **Calendar** — 14-day visual schedule with colour-coded statuses
- **Customers** — cards with lifetime spend, returning/loyal badges,
  full booking history modal
- **Walk-in** bookings — quick add from any device
- **Services** — CRUD with live pricing
- **Availability** — weekly schedule + one-off blocks
- **Analytics** — daily revenue chart, status mix, in-shop vs home,
  completion/cancellation rates, net revenue
- **Expenses** — track supplies, utilities, marketing, transport
- **Settings** — brand info, travel fee, time-slot interval,
  notification toggles

### Architecture (designed for what's next)
- **Notifications** — every state change queues a notification record
  with the exact payload WhatsApp will consume (booking received,
  confirmed, reminder, completed, cancelled). Plug in the WhatsApp
  Business API consumer later without touching the app.
- **Online payments** — booking already captures total + travel fee.
  Add Stripe / MTN MoMo / Airtel Money to the confirmation flow.
- **Maps / location** — `customer.address` already exists for home service.
- **Customer accounts** — phone-based identification is in place;
  add a customer login layer on top.

---

## Tech stack

- **Next.js 14.2** (App Router, Server Components)
- **TypeScript** strict
- **Tailwind CSS 3.4** — custom theme: black / charcoal / cream / gold
- **libsql + Drizzle ORM** — local SQLite, zero-config, prebuilt
  Windows binaries (no Visual Studio required)
- **jose** — JWT session cookies (httpOnly, secure in prod)
- **bcryptjs** — password hashing
- **Zod** — runtime input validation on every API route
- **date-fns** — time-slot math
- **lucide-react** — icons
- **framer-motion** — micro-animations

No external services required to run locally.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Edit AUTH_SECRET — generate with:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Seed (creates admin + sample services, hours, customers, bookings)
npm run db:seed

# 4. Run
npm run dev
```

The server creates the SQLite database at `./data/tas.db` on first boot
and runs the schema bootstrap automatically via Next.js instrumentation.

Open:
- **Customer site** — <http://localhost:3000>
- **Admin login** — <http://localhost:3000/admin/login>

Default admin (override via `.env.local`):
- username: `alick`
- password: `standard2026`

---

## Scripts

| Script                | What it does                                          |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Start the dev server                                  |
| `npm run build`       | Production build                                      |
| `npm run start`       | Run the production build                              |
| `npm run db:seed`     | Seed admin, services, hours, settings (no demo data)  |
| `npm run db:seed:demo`| Seed everything including 11 sample bookings + customers + expenses |
| `npm run db:reset`    | Wipe transactional data, keep operating config        |
| `npm run db:studio`   | Open Drizzle Studio (visual DB inspector)             |
| `npm run icons`       | Regenerate PWA icons from `public/*.svg`              |

---

## Progressive Web App

THE ALICK STANDARD installs as a standalone PWA on iOS, Android, desktop
and Chrome OS. After the first visit, the browser shows an in-app "Install"
prompt — or users can hit **Share → Add to Home Screen** on iOS.

What that gives you:

- Full-screen launch (no browser chrome)
- Custom install icon + splash screen
- App shortcuts for **In-Shop booking**, **Home service**, **Admin**
- Offline shell — pages render even without a connection
- Push notifications via the service worker (Web Push API)
- Native notifications fire for live booking events even when the tab is
  in the background (the admin must opt-in once)

### Live notifications

Open the admin dashboard in one tab and any other tab as a customer. When
the customer books, the admin tab gets a real-time toast + (if granted)
a native notification. When the admin confirms the booking, the customer's
`/book/live/<ref>` page updates instantly with the new status.

Both directions use Server-Sent Events over `/api/notifications/stream`
(customer) and `/api/admin/notifications/stream` (admin), backed by an
in-process pub/sub bus.

---

## Environment variables

| Var                              | Purpose                                                |
| -------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                   | Path to SQLite file (default `./data/tas.db`)          |
| `AUTH_SECRET`                    | 32-byte hex secret for signing JWTs (required)         |
| `ADMIN_USERNAME` / `_PASSWORD`   | Seed credentials (only used on first seed)             |
| `NEXT_PUBLIC_BUSINESS_NAME`      | Brand name override                                    |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`    | WhatsApp number for the "Message Alick" link           |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                # Landing
│   ├── services/page.tsx       # Service menu
│   ├── about/page.tsx          # About Alick
│   ├── book/                   # Booking flow
│   │   ├── page.tsx
│   │   ├── shop/page.tsx
│   │   ├── home/page.tsx
│   │   └── confirmation/[ref]/page.tsx
│   ├── admin/                  # Private dashboard
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── appointments/
│   │   ├── calendar/
│   │   ├── customers/
│   │   ├── services/
│   │   ├── availability/
│   │   ├── analytics/
│   │   ├── expenses/
│   │   └── settings/
│   └── api/                    # Route handlers
│       ├── bookings/
│       ├── availability/
│       └── admin/
├── components/
│   ├── ui/                     # Reusable primitives
│   ├── public/                 # Header, Footer, PublicShell
│   ├── booking/                # DateSlotPicker, BookingForm
│   └── admin/                  # AdminShell, sidebar
├── lib/
│   ├── db/
│   │   ├── index.ts            # libsql + drizzle client
│   │   ├── schema.ts           # Database tables & types
│   │   ├── migrate.ts          # Schema bootstrap
│   │   ├── seed.ts             # Sample data
│   │   └── auto-seed.ts        # Auto-run on first start
│   ├── auth.ts                 # JWT + bcrypt + login
│   ├── time-slots.ts           # Availability engine
│   ├── notifications.ts        # Queue for WhatsApp integration
│   └── utils.ts                # Currency, dates, validation
└── instrumentation.ts          # Next.js startup hook
```

---

## Money handling

All money is stored as **integer ngwee** (1 ZMW = 100 ngwee) to avoid
floating-point issues. Conversion happens at the edge:

- `kwachaToNgwee("75.00")` → `7500`
- `ngweeToKwacha(7500)` → `"75.00"`
- `formatK(7500)` → `"K 75.00"` (locale-aware thousands separator)

The currency is Zambian Kwacha. Phone numbers are normalised to the
`260XXXXXXXXX` international format for SMS / WhatsApp delivery.

---

## Deployment notes

The app is ready for any Node 24 host that supports Next.js 14
(App Router + Server Components):

- **Vercel** — zero-config, just push. The SQLite file goes in `/data`
  which is ephemeral on Vercel; for production data persistence,
  swap `DATABASE_URL` to a Turso / libsql remote URL — no code changes
  required, the libsql client accepts `libsql://` and `https://` URLs.
- **Railway / Render / Fly.io** — Node 24 runtime, persistent volume
  mounted at `/data`.
- **Self-host** — `node build && npm start` behind a reverse proxy.

---

## Roadmap hooks

The codebase intentionally leaves clean seams for:

1. **WhatsApp Business API** — consume the `notification_log` table.
2. **Online payments** — total + travel fee are already computed; plug
   Stripe / MTN MoMo / Airtel Money into the booking flow.
3. **Customer accounts** — phone-based identity is already in place;
   add a `/account` portal that finds a customer by phone + OTP.
4. **Maps** — `address` already captured; render with Leaflet or
   Google Maps on the dashboard.
5. **Multi-barber** — schema already isolates appointments by
   `barber_id`; just add the column and admin scoping.

---

## License

© 2026 THE ALICK STANDARD. All rights reserved.