-- ============================================================
-- FocablyED Admin Console — Supabase migrations
-- Run this in Supabase Studio → SQL Editor (one block at a time
-- is fine, or all together).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- 1) Add columns the admin dashboard reads from
alter table public.profiles
  add column if not exists last_active_at timestamptz,
  add column if not exists phone text;

-- Helpful index for "active users in last N days" queries
create index if not exists profiles_last_active_at_idx
  on public.profiles (last_active_at desc);


-- 2) RLS policy: let admin emails SELECT every profile row.
-- (Regular users keep their existing self-only access via other policies.)

-- Drop the policy if it already exists so we can re-create it cleanly
drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (
  (auth.jwt() ->> 'email') in (
    'steve@yourfinancedept.com.au'
    -- add more admin emails here, comma-separated
  )
);


-- 3) (Optional) Backfill last_active_at from auth.users.last_sign_in_at
-- so the dashboard has some history before users next open the app.
-- Comment this out if you'd rather start from a clean slate.
update public.profiles p
set last_active_at = u.last_sign_in_at
from auth.users u
where p.id = u.id
  and p.last_active_at is null
  and u.last_sign_in_at is not null;


-- ============================================================
-- DONE.
-- After running this:
--   • Open https://focablyed.com/admin.html (or wherever you host
--     index.html — admin.html sits next to it).
--   • Sign in with steve@yourfinancedept.com.au + your password.
--   • Dashboard should show counts immediately; "Active users"
--     will populate as users open the app (last_active_at gets
--     stamped on each profile load via the patched index.html).
-- ============================================================
