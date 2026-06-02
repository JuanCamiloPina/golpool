-- ============================================================
-- Migration 004 — Explicit owner SELECT policy on pools
-- Applied: Bug fix (dashboard not showing owned pools)
-- ============================================================
-- Problem:
--   The dashboard query SELECT FROM pools WHERE owner_id = user.id
--   was returning zero rows. The existing "Pools are publicly viewable"
--   policy (using true) should cover this, but if that policy was
--   never applied (e.g. only migration 001 was run, not 002), the
--   old Phase 1 policy might still be in place — or RLS is blocking
--   the owner for another reason.
--
-- Fix:
--   Add an explicit owner-only policy. Multiple SELECT policies are
--   combined with OR by PostgreSQL, so this is additive and safe
--   even if the public policy already exists.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'pools'
      and policyname = 'Owners can view own pools'
  ) then
    execute $policy$
      create policy "Owners can view own pools"
        on public.pools for select
        using (owner_id = auth.uid())
    $policy$;
  end if;
end $$;
