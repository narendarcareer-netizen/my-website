-- JobPilot Phase 7: short-lived browser-extension sessions.
create table if not exists public.extension_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null references public.applications(id) on delete cascade,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 resume_version_id uuid references public.document_versions(id) on delete restrict,
 cover_letter_version_id uuid references public.document_versions(id) on delete restrict,
 expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default timezone('utc',now())
);
create index if not exists extension_sessions_application_idx on public.extension_sessions(application_id,expires_at desc);
create index if not exists extension_sessions_user_idx on public.extension_sessions(user_id,expires_at desc);
alter table public.extension_sessions enable row level security;
drop policy if exists "Users read own extension sessions" on public.extension_sessions;
create policy "Users read own extension sessions" on public.extension_sessions for select to authenticated using ((select auth.uid())=user_id);
-- Creation, token lookup, and revocation are trusted server operations only.
notify pgrst, 'reload schema';
