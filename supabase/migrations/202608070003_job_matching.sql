-- JobPilot Phase 4: normalized user skills and stored personalized job matches.
create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null check (skill = lower(trim(skill)) and char_length(skill) between 1 and 100),
  source text not null default 'manual' check (source in ('profile', 'resume', 'manual')),
  confidence numeric(4,3) not null default 1.0 check (confidence between 0 and 1),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, skill)
);

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  overall_score integer not null check (overall_score between 0 and 100),
  skills_score integer not null check (skills_score between 0 and 35),
  title_score integer not null check (title_score between 0 and 20),
  location_score integer not null check (location_score between 0 and 15),
  employment_type_score integer not null check (employment_type_score between 0 and 10),
  salary_score integer not null check (salary_score between 0 and 10),
  authorization_score integer not null check (authorization_score between 0 and 10),
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  reasons jsonb not null default '{"strong":[],"gaps":[],"unknown":[]}'::jsonb,
  calculated_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, job_id)
);

create index if not exists user_skills_user_id_idx on public.user_skills(user_id);
create index if not exists job_matches_user_id_idx on public.job_matches(user_id);
create index if not exists job_matches_job_id_idx on public.job_matches(job_id);
create index if not exists job_matches_user_score_idx on public.job_matches(user_id, overall_score desc);

drop trigger if exists job_matches_updated_at on public.job_matches;
create trigger job_matches_updated_at before update on public.job_matches for each row execute function public.set_updated_at();

alter table public.user_skills enable row level security;
alter table public.job_matches enable row level security;

drop policy if exists "Users select own skills" on public.user_skills;
drop policy if exists "Users insert own skills" on public.user_skills;
drop policy if exists "Users update own skills" on public.user_skills;
drop policy if exists "Users delete own skills" on public.user_skills;
create policy "Users select own skills" on public.user_skills for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own skills" on public.user_skills for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own skills" on public.user_skills for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own skills" on public.user_skills for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users read own matches" on public.job_matches;
create policy "Users read own matches" on public.job_matches for select to authenticated using ((select auth.uid()) = user_id);

-- Intentionally no client insert/update/delete policies on job_matches.
-- Only trusted server-side service-role code calculates and writes scores.
