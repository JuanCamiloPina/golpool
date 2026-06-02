-- ============================================================
-- Migration 005 — Fix pool_members SELECT policy for admin page
-- Applied: Bug fix — admin page shows no members
-- ============================================================
-- Problem:
--   The pool admin page queries pool_members for all rows in their pool,
--   but sees zero rows. The cause is the SELECT policy currently in the
--   database is the Phase 1 version:
--
--     "Members can view other members in same pool"
--     USING (EXISTS (SELECT 1 FROM pool_members pm
--                    WHERE pm.pool_id = pool_members.pool_id
--                      AND pm.user_id = auth.uid()))
--
--   This only lets someone see members if they are themselves already a
--   pool_member row. The pool owner is not a pool_member row — they are
--   recorded in pools.owner_id — so they see nothing.
--
-- Fix:
--   Replace with an explicit owner-first policy. Pool owners can see
--   ALL member rows for their pools regardless of status. Members can
--   see approved peers and their own row.
-- ============================================================

-- Drop any existing variants of the pool_members SELECT policy
drop policy if exists "Members can view other members in same pool" on public.pool_members;
drop policy if exists "Pool members are viewable by owner and members"  on public.pool_members;
drop policy if exists "owners can see all members"                      on public.pool_members;

-- Recreate with explicit owner access
create policy "owners can see all members"
  on public.pool_members
  for select
  using (
    -- Pool owner sees every row in their pool (all statuses)
    pool_id in (
      select id from public.pools where owner_id = auth.uid()
    )
    -- Users can always see their own membership row
    or user_id = auth.uid()
    -- Approved members can see other approved members
    or exists (
      select 1 from public.pool_members pm
      where pm.pool_id = pool_members.pool_id
        and pm.user_id = auth.uid()
        and pm.status  = 'approved'
    )
  );
