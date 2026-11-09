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

## Deploy (Vercel + Neon)

1. Create a Neon (or Supabase) Postgres database and copy `DATABASE_URL`.
2. Import this repo in Vercel.
3. Set environment variables:
   - `DATABASE_URL`
   - `API_KEY` (submit this value on the Tally form)
   - `NEXT_PUBLIC_API_KEY` (same as `API_KEY` so the UI can call the API)
4. Set **Build Command** to `npx prisma migrate deploy && npm run build` (or add `postinstall`: `prisma generate`).
5. After first deploy, run migrations (or use the build command above) and `npm run db:seed` locally against production URL if you want demo slots.

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
