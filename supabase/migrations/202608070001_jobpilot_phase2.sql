-- JobPilot Phase 2: user profiles, preferences, work authorization, resumes, and answers.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  phone text check (phone is null or char_length(phone) <= 30),
  location text check (location is null or char_length(location) <= 120),
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://'),
  portfolio_url text check (portfolio_url is null or portfolio_url ~ '^https://'),
  years_experience integer not null default 0 check (years_experience between 0 and 70),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  preferred_titles text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  remote_preference text not null default 'Flexible' check (remote_preference in ('On-site', 'Hybrid', 'Remote', 'Flexible')),
  employment_types text[] not null default '{}',
  minimum_salary integer not null default 0 check (minimum_salary >= 0),
  salary_currency text not null default 'USD' check (salary_currency ~ '^[A-Z]{3}$'),
  industries text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.work_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null check (char_length(country) between 2 and 100),
  authorization_type text not null check (char_length(authorization_type) between 2 and 120),
  requires_sponsorship boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
  storage_path text not null unique,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists one_primary_resume_per_user on public.resumes(user_id) where is_primary;

create table if not exists public.application_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null check (char_length(question_key) between 1 and 150),
  question_text text not null check (char_length(question_text) between 1 and 1000),
  answer text not null check (char_length(answer) <= 10000),
  is_sensitive boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, question_key)
);

create index if not exists work_authorizations_user_id_idx on public.work_authorizations(user_id);
create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists application_answers_user_id_idx on public.application_answers(user_id);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists job_preferences_updated_at on public.job_preferences;
create trigger job_preferences_updated_at before update on public.job_preferences for each row execute function public.set_updated_at();
drop trigger if exists work_authorizations_updated_at on public.work_authorizations;
create trigger work_authorizations_updated_at before update on public.work_authorizations for each row execute function public.set_updated_at();
drop trigger if exists application_answers_updated_at on public.application_answers;
create trigger application_answers_updated_at before update on public.application_answers for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.job_preferences enable row level security;
alter table public.work_authorizations enable row level security;
alter table public.resumes enable row level security;
alter table public.application_answers enable row level security;

-- One policy per operation keeps ownership rules explicit and easy to audit.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles', 'job_preferences', 'work_authorizations', 'resumes', 'application_answers'] loop
    execute format('drop policy if exists "Users select own %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "Users insert own %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "Users update own %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "Users delete own %1$s" on public.%1$I', table_name);
  end loop;
end $$;

create policy "Users select own profiles" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users insert own profiles" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users update own profiles" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users delete own profiles" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy "Users select own job_preferences" on public.job_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own job_preferences" on public.job_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own job_preferences" on public.job_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own job_preferences" on public.job_preferences for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users select own work_authorizations" on public.work_authorizations for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own work_authorizations" on public.work_authorizations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own work_authorizations" on public.work_authorizations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own work_authorizations" on public.work_authorizations for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users select own resumes" on public.resumes for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own resumes" on public.resumes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own resumes" on public.resumes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own resumes" on public.resumes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users select own application_answers" on public.application_answers for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own application_answers" on public.application_answers for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own application_answers" on public.application_answers for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own application_answers" on public.application_answers for delete to authenticated using ((select auth.uid()) = user_id);

-- The bucket is private. Object paths must start with the authenticated user's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users select own resume objects" on storage.objects;
drop policy if exists "Users insert own resume objects" on storage.objects;
drop policy if exists "Users update own resume objects" on storage.objects;
drop policy if exists "Users delete own resume objects" on storage.objects;

create policy "Users select own resume objects" on storage.objects for select to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users insert own resume objects" on storage.objects for insert to authenticated with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update own resume objects" on storage.objects for update to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own resume objects" on storage.objects for delete to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
