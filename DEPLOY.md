# Deploying THE ALICK STANDARD to Vercel + Turso

**Free forever.** Vercel hosts the Next.js app, Turso hosts the SQLite-compatible
database. The same `libsql` driver that powers local dev talks to Turso in
production — zero code change, just swap `DATABASE_URL`.

---

## 1 · One-time setup (10 minutes)

### 1a. Create a Turso database

1. Go to **https://turso.tech** → sign in with **GitHub** (use `DalisoT`)
2. **Create database** → name: `the-alick-standard` → region: closest to your customers (e.g. `ams` for Europe, `lhr` for UK, `iad` for US East)
3. After creation, Turso shows you:
   - **Database URL** — looks like `libsql://the-alick-standard-yourname.turso.io`
   - Click **Create token** → name it `vercel` → copy the token (long string starting with `eyJ...`)

Keep both somewhere safe — you'll paste them into Vercel in step 2.

### 1b. (Optional but nice) Install the Turso CLI locally

If you want to inspect / back up the database later, install the CLI:

```bash
# macOS / Linux
curl -sSfL https://get.turso.tech/install.sh | bash

# Windows
irm https://get.turso.tech/install.ps1 | iex
```

Then `turso auth login` and `turso db shell the-alick-standard` opens a REPL against your prod DB.

---

## 2 · Deploy to Vercel (5 minutes)

1. Go to **https://vercel.com** → **Sign in with GitHub** (use `DalisoT`)
2. Click **Add New… → Project**
3. **Import** `DalisoT/the-alick-standard`
4. Framework auto-detected: **Next.js**. Don't change anything.
5. Expand **Environment Variables** and add:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `libsql://the-alick-standard-yourname.turso.io` |
| `DATABASE_AUTH_TOKEN` | the long token from step 1a |
| `AUTH_SECRET` | open a terminal and run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_USERNAME` | `alick` |
| `ADMIN_PASSWORD` | *(pick a strong password)* |
| `NEXT_PUBLIC_BUSINESS_NAME` | `THE ALICK STANDARD` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `260977000000` |

6. Click **Deploy**.
7. Wait ~90 seconds. The build succeeds (Vercel ignores dev-only deps), the schema auto-creates in Turso, and the seed runs on first boot.

Vercel gives you a URL like `https://the-alick-standard.vercel.app`.

---

## 3 · First-time setup runs automatically

When the first request hits your Vercel deployment:

- **`src/instrumentation.ts`** calls `ensureSchema()` which runs `CREATE TABLE IF NOT EXISTS` for every table — idempotent, safe to run on every boot.
- Then **`runSeedIfEmpty()`** checks if the admin user table is empty. If so, it inserts:
  - The admin user (`ADMIN_USERNAME` / `ADMIN_PASSWORD` from env)
  - Business settings singleton
  - Weekly hours (Mon–Sat 09:00–19:00, Sun closed)
  - 7 default services

All sections are gated on `count() === 0` checks, so re-running is harmless.

If you want to verify the seed worked, open `https://your-app.vercel.app/admin/login` — log in with the credentials from your env vars.

---

## 4 · Smoke test

Open your Vercel URL:

- ✅ Public site loads (home, services, book)
- ✅ `/admin/login` loads
- ✅ Log in → dashboard shows KPIs, recent appointments
- ✅ From another tab/phone, open `/book/shop` and book a slot
- ✅ Admin dashboard toasts the new booking in real time

If anything fails, hit **Vercel → Logs** for the runtime error.

---

## 5 · Point a real domain

1. Buy a domain (e.g. `thealickstandard.com`)
2. Vercel → your project → **Settings → Domains**
3. Type `thealickstandard.com` → **Add**
4. Vercel shows the DNS records to add at your registrar
5. SSL is automatic — no config needed
6. Add `NEXT_PUBLIC_SITE_URL=https://thealickstandard.com` to env vars and redeploy

---

## 6 · Daily backups

The Turso CLI gives you one-command backups:

```bash
# Manual snapshot
turso db shell the-alick-standard ".dump" > backup-$(date +%F).sql

# Or use the built-in scheduled backups in the Turso dashboard.
```

For a single-barber shop, Turso's built-in daily snapshot (free tier includes 7-day retention) is plenty.

---

## What's already wired up for Vercel

| File | Why it matters |
| --- | --- |
| `src/instrumentation.ts` | Auto-runs schema + seed on first boot — no manual `db:seed` step needed |
| `src/lib/db/auto-seed.ts` | Calls `seedDefaults()` only when the admin table is empty |
| `src/lib/db/index.ts` | Same `@libsql/client` driver for both local file and Turso |
| `.env.example` | Documents the Turso `libsql://...` URL format |
| `next.config.mjs` | Server-component external packages config keeps `libsql` working |

---

## Local dev still uses local SQLite

When you run `npm run dev` locally, `DATABASE_URL=file:./data/tas.db` (set in `.env.local`) gives you the file-backed SQLite. Production switches that single variable to `libsql://...` and the same code runs unchanged.

---

## Costs

- **Vercel Hobby** (free forever for personal use): 100 GB bandwidth, unlimited deploys
- **Turso Starter** (free forever): 9 GB storage, 1 billion row reads/month, 100k row writes/day

For a single-barber shop handling ~30 bookings/day, you'll use **under 1 %** of either free tier. Truly $0/mo.
