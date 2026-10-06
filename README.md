# Job Search Tracker

Track job opportunities, outreach status, and personalized outreach templates.

Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS v4, shadcn/ui (Base UI), React Query, Prisma 7 + Postgres.

## Setup (local)

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # then set SEC_USER_AGENT
npm run db:local     # starts a local Postgres (Prisma dev server) in the background
npm run db:setup     # creates the tables and seeds starter templates
npm run dev          # http://localhost:3000
```

With no `APP_PASSWORD` set, local development skips sign-in and shows your own data.

## Owner and demo

The site has two views of the same app:

- **Owner** (signed in with `APP_PASSWORD`): your real data, everything editable.
- **Visitors** (not signed in): an interactive demo with sample opportunities and the real, public Form D leads. They can add and edit freely; the demo is rebuilt every 60 minutes and after each daily scan.

The two never mix because they live in separate Postgres schemas: the default schema holds the owner's data and the `demo` schema holds the sample data. Every request handler gets its database from `getDb()` in `lib/session.ts`, which picks one based on the signed-in cookie. A visitor's request has no path to the owner's tables.

Safeguards: sign-in locks for 15 minutes after 10 wrong passwords; the demo caps how many opportunities and research lookups visitors can create; visitors can't start SEC scans; and if `APP_PASSWORD` is missing in production, everyone gets the demo rather than the real data.

## Deploying (Vercel + Postgres)

1. Push this repo to GitHub and import it at vercel.com/new.
2. In the Vercel project, open **Storage** and add a Postgres database (Prisma Postgres or Neon). This sets `DATABASE_URL` (or `POSTGRES_URL`) for you; it must be a direct `postgres://` URL.
3. Under **Settings → Environment Variables**, add:
   - `APP_PASSWORD`: a long, unique password for owner sign-in
   - `CRON_SECRET`: any long random string
   - `SEC_USER_AGENT`: `Your Name you@example.com`
4. Redeploy. The build runs `vercel-build`, which creates the tables in both schemas and then builds the app.
5. To copy existing local data (the old `dev.db`) into the hosted database, run once from your machine with the hosted connection string:
   `DATABASE_URL="postgres://..." npm run db:import`

`vercel.json` schedules the Form D scan daily at 13:00 UTC (9am Eastern in summer, 8am in winter). It calls `GET /api/form-d/scan` with the cron secret, scans the last 3 days, then rebuilds the demo.

## Features

- **Opportunities** (`/`): add opportunities, change status inline, see totals, leads by status, and outreach-sent %, and export everything as CSV.
- **Templates** (`/templates`): browse starter outreach templates and preview them with `[Company]`, `[Contact Name]`, `[Role]`, and `[Specific Detail]` filled in, either typed or pulled from an opportunity, then copy the result.
- **Form D Leads** (`/form-d`, plus a section on the dashboard): companies that recently filed an SEC Form D. See below.
- **Opportunity detail** (`/opportunities/[id]`, click a company name): fit score with reasons, editable location, and company research. "Write outreach" opens Templates with the opportunity and its research context loaded.
- **Search Profile** (`/settings`): job titles, industries, geography, company stage, salary, and custom searches. Drives which Form D leads count as matches and the generated Google searches.
- **Quick Job Search** (dashboard): Google queries generated from the profile, each with Copy and Search (opens Google in a new tab; nothing is searched automatically).

Moving an opportunity to **Applied** stamps `dateApplied` the first time.
"Outreach sent %" counts leads in Outreach sent, Response received, Interview, Offer, or No response.

## Fit score

`lib/scoring.ts` scores each opportunity 1–10 against the search profile. It starts at 5 and adds:

| Signal | Points |
| --- | --- |
| Role contains one of the profile's job titles ("PM", "TPM", and "Sr." are expanded before comparing) | +2 |
| Came from a Form D lead (funded startup) | +1 |
| Location matches a profile geography, or is remote when "Open to remote" is on | +1 |
| Company stage is one the profile targets: a round named in research or notes, else the Form D size estimate (labeled as an estimate) | +1 |
| Looks like one of the profile's industries (best-effort, from the company name and Form D industry group) | +1 |

Location, stage, and industry use the same matching as Form D leads (`lib/formd/match.ts`). Saving the profile rescales every score.

Badges: **Hot Fit** 8–10 (green), **Warm** 5–7.9 (yellow), **Cold** below 5 (gray). Because the base is 5 and nothing subtracts, Cold can't occur yet. The list can be sorted by score.

## Company research

`POST /api/company/research` with `{ opportunityId }` (result is cached on the opportunity) or `{ companyName, companyDomain? }`. The detail page fetches it automatically the first time an opportunity is viewed. Sources, all best-effort:

- **Funding / stage:** Crunchbase if `CRUNCHBASE_API_KEY` is set in `.env` (untested without a key), else the company's Form D data, else a "<Company> raises $X" headline. A stage estimated from raise size is labeled as an estimate.
- **Recent news:** Google News RSS (no key). One-word company names can return unrelated headlines; use "Refine news search" on the detail page to set your own search terms.
- **Hiring:** public Greenhouse, Lever, and Ashby job boards, matched by company name (so confirm it's the right company), plus a LinkedIn jobs link.

If a source fails, the rest still returns, with the failure noted and manual lookup links shown.

## Search profile

One profile, stored in `SearchProfile` (list fields are JSON). `GET /api/search-profile` returns it, creating defaults on first use; `POST` saves it. "Open to remote" is the single remote setting; "Remote" is not a geography entry.

**Form D matching** (`lib/formd/match.ts`): `GET /api/form-d?profileId=default` returns only matching leads; without `profileId` it returns all. Every lead carries `stage`, `location`, `matchScore` (out of 10), `reasonsForMatch`, and `matchesProfile`.

- **Stage** is estimated from raise size, since filings don't name the round: under $5M Seed, $5M–$20M Series A, $20M+ Series B or later (matches Series B, Series C, or Growth). Filters.
- **Geography** uses the filing address: presets map to states (and cities for metro areas); custom entries match a city, state name, or state code. Leads you've toggled remote-friendly match when "Open to remote" is on. International presets match any non-US, non-Canadian company, because the stored data doesn't say which country. Filters.
- **Industry** is a guess from the company name and the filing's coarse industry group. It raises the score but never hides a lead.

**Generated searches** (`lib/dorks.ts`, `GET /api/search-profile/generated-dorks`): Greenhouse, Lever, Workable, other hiring platforms (Ashby, SmartRecruiters, BambooHR, iCIMS, Taleo), company career pages (`inurl:careers` / `inurl:jobs`, minus the big aggregators), niche boards (Wellfound, We Work Remotely, Work at a Startup, Hacker News), one per geography, plus your custom searches. Up to six job titles go in each query to stay under Google's query length limit.

## Form D leads

Scans SEC EDGAR daily indexes for new Form D filings and keeps companies that:

- raised $3M–$50M (offering size, or amount sold when the offering is "Indefinite")
- had a first sale in the last 30 days
- look like operating companies: pooled funds, investment/banking, real-estate industry groups, and fund/SPV/series/project-LLC names are excluded (heuristic, so expect the odd miss)

Each company (CIK) is stored once in `FormDLead`. "Add" creates an Opportunity with `source="form_d"`, the first executive as contact, and filing details in notes; it links to an existing opportunity with the same company name instead of duplicating.

**Contacts are guesses.** Form D lists principals' names but no emails or websites. The scanner guesses a domain from the company name (`name.com` / `.ai` / `.io`, first one with a mail server) and suggests `careers@` / `hiring@`. Verify before reaching out.

**Remote-friendly** is a toggle you set per lead; Form D doesn't include it. Which locations count as a match comes from the search profile.

### Running scans

SEC requires a declared User-Agent with contact info, set in `.env`:

```bash
SEC_USER_AGENT="Your Name you@example.com"
```

- **Scan now** button on `/form-d` scans the last 7 days (owner only).
- CLI: `npm run formd:scan` (or `-- --days 30` to backfill; about 15 seconds per business day).
- Scheduled: daily on the hosted site (see Deploying).

Scans are idempotent: each EDGAR day is recorded in `FormDScanDay` and skipped afterwards. Today's index isn't published until evening, so a 9am run picks up the previous business day. Requests are throttled to 8/sec, under SEC's 10/sec limit.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET / POST | `/api/opportunities` | List / create |
| GET / PATCH | `/api/opportunities/[id]` | Read / update status, location, news search |
| GET | `/api/opportunities/[id]/score` | Fit score `{ score, reasoning, badge }` |
| POST | `/api/company/research` | Company research |
| GET | `/api/opportunities/export` | CSV download |
| GET | `/api/templates` | List templates |
| GET / POST | `/api/search-profile` | Read / save the search profile |
| GET | `/api/search-profile/generated-dorks` | Google searches generated from the profile |
| GET | `/api/form-d` | Form D leads scored against the profile (`?profileId=default` for matches only) |
| POST | `/api/form-d/scan` | Scan EDGAR (`{ "days": 1-30 }`) |
| GET | `/api/form-d/scan` | Cron trigger (needs `CRON_SECRET`) |
| POST | `/api/auth/login`, `/api/auth/logout` | Owner sign in / out |
| GET | `/api/auth/session` | Whether this browser is the owner or a demo visitor |
| PATCH | `/api/form-d/[id]` | Set `remoteFriendly` |
| POST | `/api/form-d/[id]/add` | Add lead to opportunities |

## Schema changes

Edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name <change>`, `npx prisma generate` (Prisma 7 doesn't generate automatically on migrate), and `PRISMA_SCHEMA=demo npx prisma migrate deploy` to bring the demo schema along. The hosted site applies new migrations to both schemas on each deploy.
