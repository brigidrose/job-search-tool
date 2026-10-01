# Job Search Tracker

Track job opportunities, outreach status, and personalized outreach templates.

Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS v4, shadcn/ui (Base UI), React Query, Prisma 7 + SQLite.

## Setup

```bash
npm install          # also runs `prisma generate`
npm run db:setup     # creates dev.db, applies migrations, seeds starter templates
npm run dev          # http://localhost:3000
```

`.env` holds `DATABASE_URL="file:./dev.db"`. The database file is git-ignored.

## Features

- **Opportunities** (`/`): add opportunities, change status inline, see totals, leads by status, and outreach-sent %, and export everything as CSV.
- **Templates** (`/templates`): browse starter outreach templates and preview them with `[Company]`, `[Contact Name]`, `[Role]`, and `[Specific Detail]` filled in, either typed or pulled from an opportunity, then copy the result.
- **Form D Leads** (`/form-d`, plus a section on the dashboard): companies that recently filed an SEC Form D. See below.

Moving an opportunity to **Applied** stamps `dateApplied` the first time.
"Outreach sent %" counts leads in Outreach sent, Response received, Interview, Offer, or No response.

## Form D leads

Scans SEC EDGAR daily indexes for new Form D filings and keeps companies that:

- raised $3M–$50M (offering size, or amount sold when the offering is "Indefinite")
- had a first sale in the last 30 days
- look like operating companies: pooled funds, investment/banking, real-estate industry groups, and fund/SPV/series/project-LLC names are excluded (heuristic, so expect the odd miss)

Each company (CIK) is stored once in `FormDLead`. "Add" creates an Opportunity with `source="form_d"`, the first executive as contact, and filing details in notes; it links to an existing opportunity with the same company name instead of duplicating.

**Contacts are guesses.** Form D lists principals' names but no emails or websites. The scanner guesses a domain from the company name (`name.com` / `.ai` / `.io`, first one with a mail server) and suggests `careers@` / `hiring@`. Verify before reaching out.

**Remote-friendly** is a toggle you set per lead; Form D doesn't include it. **Southeast** = AL, AR, FL, GA, KY, LA, MS, NC, SC, TN, VA, WV (issuer's address).

### Running scans

SEC requires a declared User-Agent with contact info, set in `.env`:

```bash
SEC_USER_AGENT="Your Name you@example.com"
```

- **Scan now** button on `/form-d` scans the last 7 days.
- CLI: `npm run formd:scan` (or `-- --days 30` to backfill; about 15 seconds per business day).
- Scheduled: `GET /api/form-d/scan` with `Authorization: Bearer $CRON_SECRET` (the header Vercel Cron sends).

Scans are idempotent: each EDGAR day is recorded in `FormDScanDay` and skipped afterwards. Today's index isn't published until evening, so a 9am run picks up the previous business day. Requests are throttled to 8/sec, under SEC's 10/sec limit.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET / POST | `/api/opportunities` | List / create |
| PATCH | `/api/opportunities/[id]` | Update status |
| GET | `/api/opportunities/export` | CSV download |
| GET | `/api/templates` | List templates |
| GET | `/api/form-d` | Form D leads + last scan time |
| POST | `/api/form-d/scan` | Scan EDGAR (`{ "days": 1-30 }`) |
| GET | `/api/form-d/scan` | Cron trigger (needs `CRON_SECRET`) |
| PATCH | `/api/form-d/[id]` | Set `remoteFriendly` |
| POST | `/api/form-d/[id]/add` | Add lead to opportunities |

## Schema changes

Edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name <change>` followed by `npx prisma generate` (Prisma 7 doesn't generate automatically on migrate).
