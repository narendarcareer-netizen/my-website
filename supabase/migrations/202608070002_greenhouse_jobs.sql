-- JobPilot Phase 3: public job catalog, Greenhouse sources, skills, and saved jobs.
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  website_url text check (website_url is null or website_url ~ '^https://'),
  careers_url text check (careers_url is null or careers_url ~ '^https://'),
  ats_type text not null check (ats_type in ('greenhouse')),
  ats_identifier text not null check (ats_identifier ~ '^[a-z0-9_-]{2,100}$'),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (ats_type, ats_identifier)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  external_id text not null,
  ats_type text not null check (ats_type in ('greenhouse')),
  source_url text not null check (source_url ~ '^https://'),
  apply_url text not null check (apply_url ~ '^https://'),
  title text not null check (char_length(title) between 1 and 300),
  description text not null default '',
  location text,
  workplace_type text check (workplace_type is null or workplace_type in ('Remote', 'Hybrid', 'On-site')),
  employment_type text,
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= salary_min),
  salary_currency text check (salary_currency is null or salary_currency ~ '^[A-Z]{3}$'),
  posted_at timestamptz,
  discovered_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  status text not null default 'active' check (status in ('active', 'closed')),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  unique (company_id, ats_type, external_id)
);

create table if not exists public.job_skills (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  skill text not null check (char_length(skill) between 1 and 100),
  unique (job_id, skill)
);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, job_id)
);

create index if not exists jobs_company_status_idx on public.jobs(company_id, status);
create index if not exists jobs_title_idx on public.jobs(title);
create index if not exists jobs_location_idx on public.jobs(location);
create index if not exists jobs_posted_at_idx on public.jobs(posted_at desc nulls last);
create index if not exists job_skills_job_id_idx on public.job_skills(job_id);
create index if not exists saved_jobs_user_id_idx on public.saved_jobs(user_id);

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.job_skills enable row level security;
alter table public.saved_jobs enable row level security;

drop policy if exists "Anyone can read active companies" on public.companies;
create policy "Anyone can read active companies" on public.companies for select to anon, authenticated using (active = true);

drop policy if exists "Anyone can read active jobs" on public.jobs;
create policy "Anyone can read active jobs" on public.jobs for select to anon, authenticated using (status = 'active' and exists (select 1 from public.companies where companies.id = jobs.company_id and companies.active = true));

drop policy if exists "Anyone can read skills for active jobs" on public.job_skills;
create policy "Anyone can read skills for active jobs" on public.job_skills for select to anon, authenticated using (exists (select 1 from public.jobs join public.companies on companies.id = jobs.company_id where jobs.id = job_skills.job_id and jobs.status = 'active' and companies.active = true));

-- No insert/update/delete policies exist for companies, jobs, or job_skills.
-- Only the server-side service role can modify the catalog.

drop policy if exists "Users select own saved jobs" on public.saved_jobs;
drop policy if exists "Users insert own saved jobs" on public.saved_jobs;
drop policy if exists "Users delete own saved jobs" on public.saved_jobs;
create policy "Users select own saved jobs" on public.saved_jobs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own saved jobs" on public.saved_jobs for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.jobs where jobs.id = saved_jobs.job_id and jobs.status = 'active'));
create policy "Users delete own saved jobs" on public.saved_jobs for delete to authenticated using ((select auth.uid()) = user_id);

-- Example local source: Figma's public Greenhouse board (identifier: figma).
-- The admin page can add this source after the migration is applied.
