-- JobPilot Phase 5: grounded resume analysis and reviewed application documents.
create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  parsed_text text not null,
  structured_data jsonb not null,
  skills text[] not null default '{}',
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, resume_id)
);

create table if not exists public.job_document_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  document_type text not null check (document_type in ('resume_suggestions', 'cover_letter', 'application_summary')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'archived')),
  content jsonb not null,
  source_facts jsonb not null,
  model_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  unique (user_id, job_id, resume_id, document_type)
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_draft_id uuid not null references public.job_document_drafts(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_draft_id, version_number)
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (char_length(operation) between 1 and 100),
  model text not null check (char_length(model) between 1 and 100),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost numeric(12,6) not null default 0 check (estimated_cost >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists resume_analyses_user_idx on public.resume_analyses(user_id);
create index if not exists resume_analyses_resume_idx on public.resume_analyses(resume_id);
create index if not exists job_document_drafts_user_job_idx on public.job_document_drafts(user_id, job_id);
create index if not exists document_versions_draft_idx on public.document_versions(document_draft_id, version_number desc);
create index if not exists ai_usage_user_created_idx on public.ai_usage(user_id, created_at desc);

drop trigger if exists resume_analyses_updated_at on public.resume_analyses;
create trigger resume_analyses_updated_at before update on public.resume_analyses for each row execute function public.set_updated_at();
drop trigger if exists job_document_drafts_updated_at on public.job_document_drafts;
create trigger job_document_drafts_updated_at before update on public.job_document_drafts for each row execute function public.set_updated_at();

alter table public.resume_analyses enable row level security;
alter table public.job_document_drafts enable row level security;
alter table public.document_versions enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "Users manage own resume analyses" on public.resume_analyses;
create policy "Users manage own resume analyses" on public.resume_analyses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own document drafts" on public.job_document_drafts;
create policy "Users manage own document drafts" on public.job_document_drafts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own document versions" on public.document_versions;
drop policy if exists "Users create own document versions" on public.document_versions;
create policy "Users read own document versions" on public.document_versions for select to authenticated using (exists (select 1 from public.job_document_drafts d where d.id = document_draft_id and d.user_id = (select auth.uid())));
create policy "Users create own document versions" on public.document_versions for insert to authenticated with check (exists (select 1 from public.job_document_drafts d where d.id = document_draft_id and d.user_id = (select auth.uid())));
drop policy if exists "Users read own AI usage" on public.ai_usage;
create policy "Users read own AI usage" on public.ai_usage for select to authenticated using ((select auth.uid()) = user_id);

-- ai_usage has no client insert/update/delete policy. Trusted server code writes usage.
