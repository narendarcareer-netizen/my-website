-- JobPilot Phase 6: manual application pipeline, audit history, notes, snapshots, and notifications.
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete restrict,
  status text not null default 'SAVED' check (status in ('SAVED','PREPARING','NEEDS_REVIEW','READY_TO_APPLY','APPLYING','NEEDS_USER_ACTION','SUBMITTED','INTERVIEW','REJECTED','OFFER','WITHDRAWN','FAILED','ARCHIVED')),
  match_score integer check (match_score is null or match_score between 0 and 100),
  selected_resume_draft_id uuid references public.job_document_drafts(id) on delete set null,
  selected_cover_letter_draft_id uuid references public.job_document_drafts(id) on delete set null,
  source_apply_url text check (source_apply_url is null or source_apply_url ~ '^https://'),
  started_at timestamptz, submitted_at timestamptz, last_activity_at timestamptz not null default timezone('utc', now()),
  notes text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, job_id)
);
create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, event_type text not null,
  event_data jsonb not null default '{}'::jsonb, dedupe_key text, created_at timestamptz not null default timezone('utc', now()),
  unique(application_id, event_type, dedupe_key)
);
create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, content text not null check(char_length(content) between 1 and 5000),
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  document_type text not null check(document_type in ('resume','cover_letter')), document_draft_id uuid not null references public.job_document_drafts(id) on delete restrict,
  document_version_id uuid not null references public.document_versions(id) on delete restrict, created_at timestamptz not null default timezone('utc', now()),
  unique(application_id, document_type)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, title text not null check(char_length(title) between 1 and 160), message text not null check(char_length(message) between 1 and 1000),
  read_at timestamptz, created_at timestamptz not null default timezone('utc', now())
);
create index if not exists applications_user_status_idx on public.applications(user_id,status,last_activity_at desc);
create index if not exists applications_job_idx on public.applications(job_id);
create index if not exists application_events_application_idx on public.application_events(application_id,created_at);
create index if not exists application_notes_application_idx on public.application_notes(application_id,created_at desc);
create index if not exists application_documents_application_idx on public.application_documents(application_id);
create index if not exists notifications_user_unread_idx on public.notifications(user_id,read_at,created_at desc);
drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();
drop trigger if exists application_notes_updated_at on public.application_notes;
create trigger application_notes_updated_at before update on public.application_notes for each row execute function public.set_updated_at();
alter table public.applications enable row level security; alter table public.application_events enable row level security;
alter table public.application_notes enable row level security; alter table public.application_documents enable row level security; alter table public.notifications enable row level security;
drop policy if exists "Users manage own applications" on public.applications;
drop policy if exists "Users read own application events" on public.application_events;
drop policy if exists "Users manage own application notes" on public.application_notes;
drop policy if exists "Users read own application documents" on public.application_documents;
drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users manage own applications" on public.applications for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users read own application events" on public.application_events for select to authenticated using ((select auth.uid())=user_id);
create policy "Users manage own application notes" on public.application_notes for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users read own application documents" on public.application_documents for select to authenticated using (exists(select 1 from public.applications a where a.id=application_id and a.user_id=(select auth.uid())));
create policy "Users read own notifications" on public.notifications for select to authenticated using ((select auth.uid())=user_id);
create policy "Users update own notifications" on public.notifications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
notify pgrst, 'reload schema';
