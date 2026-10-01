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

Moving an opportunity to **Applied** stamps `dateApplied` the first time.
"Outreach sent %" counts leads in Outreach sent, Response received, Interview, Offer, or No response.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET / POST | `/api/opportunities` | List / create |
| PATCH | `/api/opportunities/[id]` | Update status |
| GET | `/api/opportunities/export` | CSV download |
| GET | `/api/templates` | List templates |

## Schema changes

Edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name <change>` followed by `npx prisma generate` (Prisma 7 doesn't generate automatically on migrate).
