# ETF Database Setup

This project needs a Postgres database via Supabase. If Supabase isn't

connected to this project yet, prompt me to connect it now using your

native Supabase integration — I'll click your "Connect Supabase" button

when you show it, that's the only manual step on my end.

Once connected, run the two attached SQL files against the database, in

this exact order, as two separate migrations:

1. `supabase_schema.sql` — creates all 5 tables (etf_master,

   etf_snapshots, substitution_scores, refresh_jobs, explanation_requests)

   plus their indexes and the etf_master updated_at trigger. Run this

   exactly as written — do not modify, simplify, or "improve" any part of

   it. This schema has already been designed and load-tested against a

   real Postgres instance.

2. `etf_master_seed.sql` — loads all 1,244 rows of seed data into

   etf_master (the iShares candidate universe plus the AFP competitor

   universe) via batched INSERT statements. This has also already been

   load-tested end-to-end against a real Postgres instance, so run it

   exactly as written too — do not rewrite it as a CSV import or any

   other loading mechanism, and do not skip or reorder any of the

   INSERT batches in the file.

After both migrations run, confirm for me:

- All 5 tables exist, with the column list you actually created for

  etf_master (so I can compare it against the source file).

- select count(*) from etf_master — should be exactly 1244.

- select count(*) filter (where is_ishares) as ishares_rows,

  count(*) filter (where not is_ishares) as competitor_rows from

  etf_master — should be 1189 and 55 respectively.

If either count doesn't match, stop and tell me what happened rather than

silently proceeding — don't guess at a fix.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://etf-doug.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/006b0624-c5a6-48df-925e-b3c1ffa80d4b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
