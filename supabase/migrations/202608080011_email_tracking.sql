-- JobPilot Phase 11: OAuth mailbox connections and privacy-preserving recruiter email metadata.
create table if not exists public.email_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('GMAIL','MICROSOFT')),
  provider_account_id text not null,
  email_address text not null,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','EXPIRED','REAUTH_REQUIRED','DISCONNECTED','ERROR')),
  sync_cursor text,
  connected_at timestamptz not null default timezone('utc',now()),
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  unique(user_id,provider,provider_account_id)
);

create table if not exists public.application_email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  provider text not null check (provider in ('GMAIL','MICROSOFT')),
  provider_message_id text not null,
  sender_email text,
  sender_domain text,
  subject text not null default '',
  classification text not null check (classification in ('APPLICATION_CONFIRMATION','RECRUITER_REPLY','ASSESSMENT','INTERVIEW_REQUEST','INTERVIEW_SCHEDULED','REJECTION','OFFER','ACTION_REQUIRED','GENERAL_UPDATE','UNKNOWN')),
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW')),
  received_at timestamptz not null,
  matched_by text[] not null default '{}',
  proposed_status text,
  review_status text not null default 'PENDING' check (review_status in ('AUTO_APPLIED','PENDING','CONFIRMED','DISMISSED','UNMATCHED')),
  created_at timestamptz not null default timezone('utc',now()),
  unique(user_id,provider,provider_message_id)
);

create table if not exists public.email_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.email_connections(id) on delete cascade,
  started_at timestamptz not null default timezone('utc',now()),
  completed_at timestamptz,
  messages_scanned integer not null default 0 check(messages_scanned>=0),
  messages_matched integer not null default 0 check(messages_matched>=0),
  errors jsonb not null default '[]'::jsonb,
  status text not null default 'RUNNING' check(status in ('RUNNING','COMPLETED','PARTIAL','FAILED'))
);

create table if not exists public.email_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check(provider in ('GMAIL','MICROSOFT')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc',now())
);

create table if not exists public.email_sync_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.email_connections(id) on delete cascade,
  status text not null default 'PENDING' check(status in ('PENDING','QUEUED','COMPLETED','FAILED')),
  requested_at timestamptz not null default timezone('utc',now()),
  completed_at timestamptz
);

create index if not exists email_connections_user_status_idx on public.email_connections(user_id,status);
create index if not exists email_connections_sync_idx on public.email_connections(status,last_successful_sync_at);
create index if not exists application_email_events_user_received_idx on public.application_email_events(user_id,received_at desc);
create index if not exists application_email_events_application_idx on public.application_email_events(application_id,received_at);
create index if not exists application_email_events_review_idx on public.application_email_events(user_id,review_status,confidence);
create index if not exists email_sync_runs_connection_idx on public.email_sync_runs(connection_id,started_at desc);
create index if not exists email_sync_requests_pending_idx on public.email_sync_requests(status,requested_at);
create unique index if not exists email_sync_requests_one_active_idx on public.email_sync_requests(connection_id) where status in ('PENDING','QUEUED');

drop trigger if exists email_connections_updated_at on public.email_connections;
create trigger email_connections_updated_at before update on public.email_connections for each row execute function public.set_updated_at();

alter table public.email_connections enable row level security;
alter table public.application_email_events enable row level security;
alter table public.email_sync_runs enable row level security;
alter table public.email_oauth_states enable row level security;
alter table public.email_sync_requests enable row level security;

create policy "Users read own email connections" on public.email_connections for select to authenticated using((select auth.uid())=user_id);
create policy "Users read own email events" on public.application_email_events for select to authenticated using((select auth.uid())=user_id);
create policy "Users read own email sync runs" on public.email_sync_runs for select to authenticated using((select auth.uid())=user_id);
create policy "Users create own email sync requests" on public.email_sync_requests for insert to authenticated with check((select auth.uid())=user_id);
create policy "Users read own email sync requests" on public.email_sync_requests for select to authenticated using((select auth.uid())=user_id);
-- Connections, OAuth states, imported metadata, run results, and request status are
-- otherwise written only by trusted server/worker code using the service role.

-- RLS filters rows, not columns. Replace the default table-wide client SELECT grant
-- so encrypted tokens cannot be requested through the browser even by their owner.
revoke select on public.email_connections from anon,authenticated;
grant select(id,user_id,provider,provider_account_id,email_address,token_expires_at,scopes,status,connected_at,last_sync_at,last_successful_sync_at,last_error_code,created_at,updated_at)
on public.email_connections to authenticated;

notify pgrst,'reload schema';
