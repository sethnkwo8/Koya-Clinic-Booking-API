# Koya Clinic Booking API

Next.js app implementing the [Koya assessment OpenAPI contract](https://koyaacademy.com/assessment-api) (levels 1–5): slots, bookings, API key auth, concurrency-safe booking, cancellation, idempotency, pagination, and rate limiting.

- **API** — Route handlers at the repo root paths (`/slots`, `/bookings`, `/reset`, …)
- **Web UI** — `/` lists slots, books a visit, shows confirmation
- **Database** — PostgreSQL via Prisma (required for persistence on Vercel)

## Quick start

```bash
cp .env.example .env
# set DATABASE_URL and API_KEY

npm install
npx prisma migrate deploy
npm run db:seed   # optional demo slots
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the UI. Call the API with header `X-API-Key: <your API_KEY>`.

If TypeScript complains that `Booking` or `Prisma.BookingWhereInput` are missing, the Prisma client was not generated (common when `npm` blocks install scripts). Run `npx prisma generate`, or allow scripts: `npm approve-scripts @prisma/client prisma @prisma/engines`.

## Deploy (Vercel + Supabase)

### Fix: `P1012 Environment variable not found: DATABASE_URL`

Vercel does **not** read your local `.env`. Add variables in the **Vercel project → Settings → Environment Variables** for **Production** (and Preview if you want). Then **Redeploy**.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | App runtime — Supabase **Transaction pooler** (`6543`, `?pgbouncer=true`) recommended on Vercel |
| `DIRECT_URL` | `prisma migrate deploy` at build — use the **Session pooler** (`5432`) URI that worked with `npm run db:deploy`. For local dev, both URLs can be the same Session pooler string. |
| `API_KEY` | Secret for `X-API-Key` (Tally form) |
| `NEXT_PUBLIC_API_KEY` | **Same value** as `API_KEY` |

`vercel.json` runs `prisma migrate deploy && npm run build`, so **`DATABASE_URL` and `DIRECT_URL` must exist before the first deploy**.

### Steps

1. Push repo to GitHub and import in Vercel.
2. Add all four variables above (encode `@` in passwords as `%40`).
3. Deploy. If migrate succeeds, the API is live.
4. Optional: from your machine, `DATABASE_URL="$DIRECT_URL" npm run db:seed` only works if seed targets prod — or call `POST /reset` with assessor-style slots after deploy.

**Simplest Supabase setup:** set **`DATABASE_URL` and `DIRECT_URL` to the same Session pooler URI** (port 5432) until everything works; switch `DATABASE_URL` to Transaction pooler later if you want.

**Tally submission**

| Field | Example |
|--------|---------|
| API base URL | `https://your-app.vercel.app` |
| Web page URL | `https://your-app.vercel.app` |
| API key | value of `API_KEY` |

## API overview

| Method | Path | Level |
|--------|------|-------|
| `GET` | `/slots` | 1 |
| `POST` | `/bookings` | 1–5 |
| `GET` | `/bookings/{id}` | 1 |
| `DELETE` | `/bookings/{id}` | 3 |
| `GET` | `/bookings?email=` | 4 |
| `POST` | `/reset` | 1 (test harness) |

All routes except the web UI require `X-API-Key`.

## Scripts

- `npm run dev` — local dev server
- `npm run build` / `npm start` — production
- `npm run db:migrate` — apply migrations in dev
- `npm run db:seed` — insert demo slots if the table is empty
