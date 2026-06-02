-- ============================================================
-- Migration 006 — Allow pool members to SELECT the pool they belong to
-- Applied: Bug fix — joined members cannot see pools on dashboard
-- ============================================================
-- Problem:
--   After a user is approved as a pool member, the dashboard fetches
--   pool details by querying: SELECT FROM pools WHERE id IN (pool_ids).
--   If the database only has the old Phase 1 policy:
--
--     "Pool members can view pools they belong to"
--     USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM pool_members ...))
--
--   the sub-select on pool_members is itself subject to the pool_members
--   RLS policy. If pool_members is also restricted, the sub-select returns
--   nothing, the USING clause is false, and the pool is invisible to the member.
--
--   Even with "Pools are publicly viewable" (using true) from migration 002,
--   some databases may not have that policy applied.
--
-- Fix:
--   Add an explicit, self-contained member visibility policy that uses
--   pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = auth.uid())
--   — a flat subquery with no intermediate RLS dependency.
-- ============================================================

drop policy if exists "members can view pools they belong to" on public.pools;

create policy "members can view pools they belong to"
  on public.pools
  for select
  using (
    id in (
      select pool_id from public.pool_members where user_id = auth.uid()
    )
  );
