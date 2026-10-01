# Deploying THE ALICK STANDARD to Railway.app

Railway keeps the SQLite file on a **persistent volume** so your bookings
survive every redeploy. The whole setup is ~5 minutes.

---

## 1 · Create a Railway account

1. Go to https://railway.app
2. Sign in with **GitHub** (use the `DalisoT` account)
3. Verify your email if prompted

---

## 2 · Create the project

1. Click **New Project** → **Deploy from GitHub repo**
2. Select **`DalisoT/the-alick-standard`**
3. Railway will detect it's a Next.js app and start building automatically

The first build will fail because we haven't set env vars or a volume yet —
that's expected.

---

## 3 · Add the persistent volume

This is what keeps your SQLite database alive across deploys.

1. In your Railway project, click on the **service card**
2. Open the **Variables** tab
3. Switch to the **Settings** tab → scroll to **Volumes**
4. Click **+ New Volume**
   - **Mount path:** `/app/data`
   - **Size:** `1 GB` (plenty for thousands of bookings)
5. Click **Add**

The volume is now mounted. The SQLite file lives at `/app/data/tas.db`.

---

## 4 · Set environment variables

Still on the **Variables** tab, click **+ New Variable** and add each of these:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `file:/app/data/tas.db` |
| `AUTH_SECRET` | *(generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)* |
| `ADMIN_USERNAME` | `alick` |
| `ADMIN_PASSWORD` | *(pick a strong password)* |
| `NEXT_PUBLIC_BUSINESS_NAME` | `THE ALICK STANDARD` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `260977000000` |
| `NEXT_PUBLIC_SITE_URL` | *(your Railway URL — see step 5)* |

> Tip: generate a strong `AUTH_SECRET` in any Node 24 terminal:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 5 · Get your public URL

1. In **Settings** tab → **Networking** → click **Generate Domain**
2. Railway gives you something like `the-alick-standard-production.up.railway.app`
3. Copy that URL into the `NEXT_PUBLIC_SITE_URL` variable above
4. Railway will redeploy automatically when the env changes

---

## 6 · Trigger a redeploy

Go to the **Deployments** tab → click the three-dot menu on the latest
deployment → **Redeploy**. The build runs again, picks up the new env
variables, and your live URL comes online in ~2 minutes.

---

## 7 · First-time database seed

After the first successful deploy, open a **shell** on the service
(Railway dashboard → service → "Shell" tab) and run:

```bash
npm run db:seed
```

This creates your admin user, the 7 default services, weekly hours, and
business settings. **Run it exactly once** — the script is idempotent
but you only need the defaults once.

To add demo data later (sample bookings/customers for screenshots):

```bash
npm run db:seed:demo
```

---

## 8 · Smoke test

Open your Railway URL in a browser:

- ✅ Public site loads (home, services, book)
- ✅ `/admin/login` loads
- ✅ Log in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set
- ✅ Dashboard shows the seeded services
- ✅ From another tab/phone, open `/book/shop` and book a slot — the
  admin dashboard should toast the booking in real time

---

## 9 · Point a real domain (optional)

1. Buy a domain (e.g. `thealickstandard.com`)
2. In Railway → **Settings** → **Networking** → **Custom Domain**
3. Add `thealickstandard.com` and `www.thealickstandard.com`
4. Railway will show the CNAME records to add at your registrar
5. Update `NEXT_PUBLIC_SITE_URL` to `https://thealickstandard.com`
6. SSL is automatic — no config needed

---

## 10 · Daily backups (recommended)

The SQLite file is one tiny file. Backing it up is trivial. Two options:

**Option A — Railway's built-in snapshots**
Settings → Backups → enable daily snapshot of the volume. Done.

**Option B — Cron-style shell script**
Open a Railway shell and run:

```bash
cp /app/data/tas.db /tmp/backup-$(date +%F).db
# Then download via Railway's file browser or set up an S3 upload.
```

For a single barber shop, **Option A is plenty**.

---

## What's already configured for you

| File | What it does |
| --- | --- |
| `railway.toml` | Nixpacks builder, persistent volume mount, healthcheck, release command |
| `Procfile` | Backup web process declaration |
| `package.json` | `engines: node >=20`, `start` binds to `0.0.0.0:$PORT` |
| `src/instrumentation.ts` | Auto-creates the schema on first boot — no separate migration step needed |

---

## Costs

- **Hobby plan**: $5/month of free credit, then usage-based (~$1–3/mo for a single Node service + 1 GB volume)
- **Trial plan**: $1 free credit, perfect for testing

For a single-barber shop handling ~30 bookings/day, you'll comfortably stay under $5/month.
