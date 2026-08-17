# Set up the ETF database and load the seed data

## Step 0 — Connect the backend

This project has no database yet. I'll open the Lovable Cloud connect step (Supabase under the hood) — you click to approve, and that's the only manual action needed.

## Step 1 — Schema migration (verbatim)

Run `supabase_schema.sql` exactly as written, as one migration:

- `pgcrypto` extension
- 5 tables: `etf_master`, `etf_snapshots`, `substitution_scores`, `refresh_jobs`, `explanation_requests`
- 13 indexes
- `set_updated_at()` function + `trg_etf_master_updated_at` trigger on `etf_master`

No edits, no reordering, no "improvements".

## Step 2 — Seed migration (verbatim)

Run `etf_master_seed.sql` as a second, separate migration: all 17 `INSERT INTO etf_master ... VALUES` batches, 1,244 value rows total, in file order, with the original `ON CONFLICT DO NOTHING`. No CSV import, no rewriting, no row reordering. The file is ~1.4 MB; if a single statement exceeds the migration tool's payload limit, I will split it strictly on the existing batch boundaries (never inside a batch) and still run them in order.

## Step 3 — Verification (report back, no silent fixes)

1. List all 5 tables and dump the actual `etf_master` column list (name + type + nullability) from `information_schema` so you can diff it against the source file.
2. `select count(*) from etf_master` — expect exactly 1244.
3. `select count(*) filter (where is_ishares) as ishares_rows, count(*) filter (where not is_ishares) as competitor_rows from etf_master` — expect 1189 / 55.

If any check fails, I stop and report the exact numbers and the failing statement, without guessing at a fix.

## One thing to flag

The schema file contains no `GRANT` or row-level-security statements. That's fine for migrations and server-side access, but the tables will not be reachable from browser/API calls until access policies exist. I will not touch that in these two migrations. Tell me if you want a third, clearly separate migration adding grants/RLS later — otherwise I leave the database exactly as your files define it.
