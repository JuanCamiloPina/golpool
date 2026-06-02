-- ============================================================
-- Migration 011 — Auto-enrol pool owners as approved members
-- ============================================================
-- Problem: when a user creates a pool they become owner_id in
-- pools, but no pool_members row is inserted for them. This
-- means they don't appear in the leaderboard, can't submit
-- predictions, and show member count = 0 on the dashboard.
--
-- Fix (backfill only — the API route handles new pools):
-- ============================================================

insert into public.pool_members (pool_id, user_id, status)
select p.id, p.owner_id, 'approved'
from public.pools p
where not exists (
  select 1
  from public.pool_members pm
  where pm.pool_id = p.id
    and pm.user_id = p.owner_id
)
on conflict (pool_id, user_id) do nothing;
