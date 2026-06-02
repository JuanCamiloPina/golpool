-- ============================================================
-- Migration 002 — Pool member status + updated RLS policies
-- Applied: Phase 2 (Pool Creation and Management)
-- ============================================================
-- Safe to run on a live database — uses IF NOT EXISTS /
-- DROP IF EXISTS guards throughout. No data is deleted.
--
-- Changes:
--   1. Add pool_members.status column
--   2. Replace pools SELECT policy (make pools publicly readable)
--   3. Replace pool_members policies (status-aware + owner access)
--   4. Update predictions/bonus_predictions SELECT policies
--      (only approved members can see each other's data)
-- ============================================================


-- ============================================================
-- 1. Add status column to pool_members
-- ============================================================

alter table public.pool_members
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected'));

-- Existing rows (from before this migration) were direct joins,
-- so treat them as approved.
update public.pool_members
  set status = 'approved'
  where status = 'pending';


-- ============================================================
-- 2. pools — replace SELECT policy
-- ============================================================

-- Old policy (Phase 1): only owner or existing members could see a pool.
-- Problem: blocked the invite-link join flow for new users.
drop policy if exists "Pool members can view pools they belong to" on public.pools;

-- New: pools are publicly readable (names/codes aren't sensitive).
-- Create only if it doesn't already exist.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'pools'
      and policyname = 'Pools are publicly viewable'
  ) then
    execute $policy$
      create policy "Pools are publicly viewable"
        on public.pools for select
        using (true)
    $policy$;
  end if;
end $$;


-- ============================================================
-- 3. pool_members — replace all policies
-- ============================================================

drop policy if exists "Members can view other members in same pool" on public.pool_members;
drop policy if exists "Users can join pools"                        on public.pool_members;
drop policy if exists "Users can leave pools"                       on public.pool_members;

-- SELECT: owner sees all statuses; user sees own row; approved
--         member sees other approved members.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'pool_members'
      and policyname = 'Pool members are viewable by owner and members'
  ) then
    execute $policy$
      create policy "Pool members are viewable by owner and members"
        on public.pool_members for select
        using (
          exists (
            select 1 from public.pools
            where id = pool_members.pool_id and owner_id = auth.uid()
          )
          or user_id = auth.uid()
          or exists (
            select 1 from public.pool_members pm
            where pm.pool_id = pool_members.pool_id
              and pm.user_id = auth.uid()
              and pm.status = 'approved'
          )
        )
    $policy$;
  end if;
end $$;

-- INSERT: enforce status = 'pending' (prevents self-approval).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'pool_members'
      and policyname = 'Users can join pools as pending'
  ) then
    execute $policy$
      create policy "Users can join pools as pending"
        on public.pool_members for insert
        with check (auth.uid() = user_id and status = 'pending')
    $policy$;
  end if;
end $$;

-- UPDATE: only pool owner can change member status.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'pool_members'
      and policyname = 'Pool owners can update member status'
  ) then
    execute $policy$
      create policy "Pool owners can update member status"
        on public.pool_members for update
        using (
          exists (
            select 1 from public.pools
            where id = pool_members.pool_id and owner_id = auth.uid()
          )
        )
    $policy$;
  end if;
end $$;

-- DELETE: member can withdraw; owner can remove anyone.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'pool_members'
      and policyname = 'Users and owners can remove memberships'
  ) then
    execute $policy$
      create policy "Users and owners can remove memberships"
        on public.pool_members for delete
        using (
          user_id = auth.uid()
          or exists (
            select 1 from public.pools
            where id = pool_members.pool_id and owner_id = auth.uid()
          )
        )
    $policy$;
  end if;
end $$;


-- ============================================================
-- 4. predictions — tighten SELECT to approved members only
-- ============================================================

drop policy if exists "Users can view predictions in their pools" on public.predictions;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'predictions'
      and policyname = 'Users can view predictions in their pools'
  ) then
    execute $policy$
      create policy "Users can view predictions in their pools"
        on public.predictions for select
        using (
          user_id = auth.uid()
          or exists (
            select 1 from public.pool_members
            where pool_id = predictions.pool_id
              and user_id = auth.uid()
              and status = 'approved'
          )
        )
    $policy$;
  end if;
end $$;


-- ============================================================
-- 5. bonus_predictions — same tightening
-- ============================================================

drop policy if exists "Users can view bonus predictions in their pools" on public.bonus_predictions;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'bonus_predictions'
      and policyname = 'Users can view bonus predictions in their pools'
  ) then
    execute $policy$
      create policy "Users can view bonus predictions in their pools"
        on public.bonus_predictions for select
        using (
          user_id = auth.uid()
          or exists (
            select 1 from public.pool_members
            where pool_id = bonus_predictions.pool_id
              and user_id = auth.uid()
              and status = 'approved'
          )
        )
    $policy$;
  end if;
end $$;
