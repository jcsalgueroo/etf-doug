-- =============================================================================
-- Doug (ETF Substitute Finder) -- full Supabase/Postgres schema
-- =============================================================================

create extension if not exists "pgcrypto";  -- for gen_random_uuid()

-- -----------------------------------------------------------------------------
-- etf_master
-- -----------------------------------------------------------------------------
create table etf_master (
    id                              text primary key,
    isin                            text not null unique,
    ticker                          text not null,
    cusip                           text,
    sedol                           text,

    fund_name                       text not null,
    issuer                          text,
    manager                         text,
    exchange                        text,
    listing_country                 text,
    domicile                        text,
    legal_wrapper                   text,           -- e.g. 'US 40-Act ETF', 'UCITS ETF'
    share_class                     text,
    trading_currency                text,
    base_currency                   text,
    distribution_policy             text,
    currency_hedged                 boolean default false,
    launch_date                     date,

    asset_class                     text,
    sub_asset_class                 text,
    geographic_exposure              text,
    market_exposure                  text,
    sector_exposure                  text,
    style_or_factor                  text,
    active_or_passive                text,
    benchmark_name                   text,
    index_provider                   text,
    index_methodology_summary        text,
    replication_method               text,
    rebalance_frequency              text,
    esg_or_climate_designation       text,

    management_fee_bps               numeric,
    management_fee_effective_date    date,
    aum                              numeric,
    aum_currency                     text,
    aum_as_of_date                   date,

    data_quality_status              text not null default 'cleaned_unapproved',
    approved_at                      timestamptz,
    last_refreshed_at                timestamptz,
    field_provenance                 jsonb not null default '{}'::jsonb,

    -- operational additions, not in the documented spec
    is_ishares                       boolean not null,
    source_universe                  text not null,   -- 'ishares_candidate' | 'afp_competitor'
    family_key                       text,
    family_size                      numeric,

    created_at                       timestamptz not null default now(),
    updated_at                       timestamptz not null default now()
);

create index idx_etf_master_ticker on etf_master (ticker);
create index idx_etf_master_isin on etf_master (isin);
create index idx_etf_master_is_ishares on etf_master (is_ishares);
create index idx_etf_master_asset_class on etf_master (asset_class);
create index idx_etf_master_family_key on etf_master (family_key);

-- -----------------------------------------------------------------------------
-- etf_snapshots
-- -----------------------------------------------------------------------------
create table etf_snapshots (
    id                          uuid primary key default gen_random_uuid(),
    etf_id                      text not null references etf_master(id) on delete cascade,
    snapshot_date                date not null,

    holdings_summary             jsonb,
    fixed_income_attributes      jsonb,
    performance                  jsonb,
    source_urls                  jsonb,
    retrieval_metadata            jsonb,

    created_at                   timestamptz not null default now(),
    unique (etf_id, snapshot_date)
);

create index idx_etf_snapshots_etf_id on etf_snapshots (etf_id);
create index idx_etf_snapshots_date on etf_snapshots (snapshot_date);

-- -----------------------------------------------------------------------------
-- substitution_scores
-- -----------------------------------------------------------------------------
create table substitution_scores (
    id                          uuid primary key default gen_random_uuid(),
    source_etf_id               text not null references etf_master(id),
    candidate_etf_id            text not null references etf_master(id),
    model_version                text not null,          -- e.g. 'v0-2026-08-16'

    eligibility_status           text not null,           -- 'eligible' | 'ineligible'
    eligibility_checks_skipped   jsonb,

    total_score                  numeric,
    score_completeness_pct       numeric,
    exposure_score                numeric,
    methodology_score             numeric,
    holdings_score                 numeric,
    wrapper_score                  numeric,
    implementation_score           numeric,
    reason_codes                   jsonb,

    calculated_at                 timestamptz not null default now(),
    reviewed_by                   text,
    approval_status                text default 'unreviewed'
);

create index idx_sub_scores_source on substitution_scores (source_etf_id);
create index idx_sub_scores_candidate on substitution_scores (candidate_etf_id);
create index idx_sub_scores_model_version on substitution_scores (model_version);

-- -----------------------------------------------------------------------------
-- refresh_jobs
-- -----------------------------------------------------------------------------
create table refresh_jobs (
    id                          uuid primary key default gen_random_uuid(),
    ticker                      text,
    status                      text not null default 'pending',
    requested_at                 timestamptz not null default now(),
    completed_at                 timestamptz,
    source_results                jsonb,
    validation_flags              jsonb
);

create index idx_refresh_jobs_status on refresh_jobs (status);

-- -----------------------------------------------------------------------------
-- explanation_requests
-- -----------------------------------------------------------------------------
create table explanation_requests (
    id                          uuid primary key default gen_random_uuid(),
    comparison_snapshot_id      uuid references substitution_scores(id),
    user_id                     text,
    created_at                   timestamptz not null default now(),
    model                        text,
    prompt_version                text,
    response                      jsonb
);

create index idx_explanation_requests_comparison on explanation_requests (comparison_snapshot_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for etf_master
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_etf_master_updated_at
    before update on etf_master
    for each row
    execute function set_updated_at();