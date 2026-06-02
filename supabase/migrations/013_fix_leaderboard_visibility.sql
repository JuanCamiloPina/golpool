-- ============================================================
-- Migration 013 — Fix leaderboard visibility for pool admins
-- ============================================================
--
-- Problem: After migration 011 added the pool owner as an
-- approved pool_members row, other members still cannot see
-- the owner in the leaderboard.
--
-- Root cause: two nested RLS evaluation issues:
--
--   1. pool_members SELECT: the existing "owners can see all
--      members" policy uses an EXISTS self-join on pool_members.
--      When this is evaluated inside the profiles policy subquery
--      (which also JOINs pool_members), PostgreSQL can reach a
--      recursion depth that silently drops rows.
--
--   2. profiles SELECT: migration 010 expanded the policy with
--      EXISTS / JOIN subqueries back into pool_members, creating
--      a pool_members → profiles → pool_members evaluation chain
--      that can fail for the admin's profile specifically.
--
-- Fix: add two ADDITIONAL permissive policies (OR-ed with the
-- existing ones) that use simpler, flatter predicates and avoid
-- the nested EXISTS chains.  Existing policies are left intact
-- so that admin-page and re-apply behaviour is unaffected.
-- ============================================================


-- ── 1. pool_members — approved members can explicitly see each other ──
--
-- The existing "owners can see all members" policy already intends
-- this via an EXISTS clause, but the nested evaluation sometimes
-- fails.  This flat IN-subquery policy provides a cleaner second
-- path that PostgreSQL evaluates independently.

drop policy if exists "approved members see each other" on public.pool_members;

create policy "approved members see each other"
  on public.pool_members
  for select
  using (
    status = 'approved'
    and pool_id in (
      select pool_id
      from   public.pool_members
      where  user_id = auth.uid()
        and  status  = 'approved'
    )
  );


-- ── 2. profiles — approved members can see each other's profiles ──
--
-- Migration 010 expanded "Users can view own and member profiles"
-- with EXISTS/JOIN clauses back into pool_members.  That chain
-- can fail when the pool_members policy itself triggers profile
-- evaluation.  This separate policy uses a flat IN subquery that
-- avoids the mutual-reference problem.

drop policy if exists "approved members see each other profiles" on public.profiles;

create policy "approved members see each other profiles"
  on public.profiles
  for select
  using (
    -- Own profile (fast path — no subquery)
    id = auth.uid()

    -- Profile of any approved member who shares an approved pool with the caller
    or id in (
      select pm2.user_id
      from   public.pool_members pm1
      join   public.pool_members pm2
               on  pm2.pool_id = pm1.pool_id
               and pm2.status  = 'approved'
      where  pm1.user_id = auth.uid()
        and  pm1.status  = 'approved'
    )
  );
