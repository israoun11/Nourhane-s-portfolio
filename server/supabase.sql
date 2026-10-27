-- ─────────────────────────────────────────────────────────────
--  Nourhane Thabet website — one-time Supabase setup.
--  Supabase dashboard → SQL Editor → New query → paste → Run.
-- ─────────────────────────────────────────────────────────────

-- Website content (one row per document: content, history, media)
create table if not exists public.nt_content (
  key        text primary key,
  value      jsonb not null,
  version    integer not null default 1,
  updated_at timestamptz not null default now()
);

-- Admin sessions (only a hash of the session token is stored)
create table if not exists public.nt_sessions (
  id_hash    text primary key,
  expires_at timestamptz not null
);

-- Lock both tables: only the server (secret key) may read or write them.
alter table public.nt_content  enable row level security;
alter table public.nt_sessions enable row level security;
revoke all on public.nt_content  from anon, authenticated;
revoke all on public.nt_sessions from anon, authenticated;

-- Public image bucket (read: everyone, write: server only), 5 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
