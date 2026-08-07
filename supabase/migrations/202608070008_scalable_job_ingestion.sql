-- JobPilot Phase 9: scalable career-source ingestion, health, scan history, and closure safety.
alter table public.companies drop constraint if exists companies_ats_type_check;
alter table public.companies add constraint companies_ats_type_check check(ats_type in('greenhouse','lever','ashby','smartrecruiters','workable','workday','generic'));
create table if not exists public.career_sources (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  ats_type text not null check (ats_type in ('GREENHOUSE','LEVER','ASHBY','SMARTRECRUITERS','WORKABLE','WORKDAY','GENERIC','UNKNOWN')),
  source_type text not null check (source_type in ('ATS_PUBLIC_API','ATS_PUBLIC_BOARD','CAREER_PAGE','SITEMAP','CUSTOM_CONNECTOR')),
  source_url text not null check (source_url ~ '^https://'), ats_identifier text, active boolean not null default true,
  scan_interval_minutes integer not null default 120 check (scan_interval_minutes between 15 and 43200),
  last_scan_at timestamptz, next_scan_at timestamptz not null default timezone('utc',now()), last_success_at timestamptz,
  consecutive_failures integer not null default 0, health_status text not null default 'UNKNOWN' check (health_status in ('HEALTHY','DEGRADED','FAILING','DISABLED','UNKNOWN')),
  last_error_code text, last_error_message text check(last_error_message is null or char_length(last_error_message)<=1000), jobs_last_seen integer not null default 0,
  disabled_reason text check(disabled_reason is null or disabled_reason in ('ROBOTS_RESTRICTED','AUTH_REQUIRED','ACCESS_DENIED','UNSUPPORTED','MANUAL')),
  anomaly_pending_count integer not null default 0, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
  unique(ats_type,ats_identifier), unique(company_id,source_url)
);
create index if not exists career_sources_due_idx on public.career_sources(active,next_scan_at) where active=true;
create index if not exists career_sources_health_idx on public.career_sources(health_status,consecutive_failures);
create index if not exists career_sources_company_idx on public.career_sources(company_id);

alter table public.jobs add column if not exists source_id uuid references public.career_sources(id) on delete set null;
alter table public.jobs drop constraint if exists jobs_ats_type_check;
alter table public.jobs add constraint jobs_ats_type_check check(ats_type in('greenhouse','lever','ashby','smartrecruiters','workable','workday','generic'));
alter table public.jobs add column if not exists canonical_apply_url text;
alter table public.jobs add column if not exists source_metadata jsonb not null default '{}'::jsonb;
alter table public.jobs add column if not exists missing_scan_count integer not null default 0;
create unique index if not exists jobs_source_external_unique on public.jobs(source_id,external_id);
create unique index if not exists jobs_canonical_apply_unique on public.jobs(canonical_apply_url) where canonical_apply_url is not null;
create index if not exists jobs_source_status_idx on public.jobs(source_id,status);
create index if not exists jobs_catalog_filter_idx on public.jobs(status,posted_at desc,company_id);
create index if not exists jobs_employment_idx on public.jobs(employment_type,status);
create index if not exists jobs_search_fts_idx on public.jobs using gin(to_tsvector('simple',coalesce(title,'')||' '||coalesce(location,'')||' '||coalesce(description,'')));

create table if not exists public.source_scan_runs (
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.career_sources(id) on delete cascade,
 connector text not null, connector_version text not null, status text not null check(status in ('RUNNING','SUCCEEDED','ANOMALY','FAILED','SKIPPED')),
 started_at timestamptz not null default timezone('utc',now()), completed_at timestamptz, response_ms integer,
 discovered_count integer not null default 0, inserted_count integer not null default 0, updated_count integer not null default 0,
 unchanged_count integer not null default 0, missing_count integer not null default 0, closed_count integer not null default 0,
 error_code text, error_message text check(error_message is null or char_length(error_message)<=1000), response_hash text, parser_metadata jsonb not null default '{}'::jsonb
);
create index if not exists source_scan_runs_source_idx on public.source_scan_runs(source_id,started_at desc);
create index if not exists source_scan_runs_status_idx on public.source_scan_runs(status,started_at desc);

create table if not exists public.job_change_history (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
 change_type text not null, changed_fields text[] not null, previous_values jsonb not null, new_values jsonb not null,
 detected_at timestamptz not null default timezone('utc',now())
);
create index if not exists job_change_history_job_idx on public.job_change_history(job_id,detected_at desc);

create table if not exists public.source_onboarding_batches (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id) on delete cascade,
 file_name text, total_count integer not null default 0, processed_count integer not null default 0,
 status text not null default 'PENDING' check(status in ('PENDING','PROCESSING','COMPLETED','FAILED')),
 created_at timestamptz not null default timezone('utc',now()), completed_at timestamptz
);
create table if not exists public.source_onboarding_items (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null references public.source_onboarding_batches(id) on delete cascade,
 company_name text not null, website_url text, careers_url text not null,
 status text not null default 'PENDING' check(status in ('PENDING','DETECTING','CONFIGURED','NEEDS_REVIEW','FAILED')),
 detected_ats text, confidence numeric(4,3), error_code text, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create index if not exists onboarding_items_pending_idx on public.source_onboarding_items(status,created_at);

create table if not exists public.ingestion_alerts (
 id uuid primary key default gen_random_uuid(), source_id uuid references public.career_sources(id) on delete cascade,
 type text not null, severity text not null check(severity in ('INFO','WARNING','CRITICAL')), title text not null, message text not null,
 resolved_at timestamptz, created_at timestamptz not null default timezone('utc',now())
);
create index if not exists ingestion_alerts_open_idx on public.ingestion_alerts(resolved_at,created_at desc);

drop trigger if exists career_sources_updated_at on public.career_sources; create trigger career_sources_updated_at before update on public.career_sources for each row execute function public.set_updated_at();
drop trigger if exists onboarding_items_updated_at on public.source_onboarding_items; create trigger onboarding_items_updated_at before update on public.source_onboarding_items for each row execute function public.set_updated_at();
alter table public.career_sources enable row level security; alter table public.source_scan_runs enable row level security;
alter table public.job_change_history enable row level security; alter table public.source_onboarding_batches enable row level security;
alter table public.source_onboarding_items enable row level security; alter table public.ingestion_alerts enable row level security;
-- No client write policies: source configuration and ingestion are trusted admin/worker operations.
notify pgrst,'reload schema';
