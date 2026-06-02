-- ============================================================
-- Migration 010 — Allow rejected members to re-apply &
--                 let approved members see pool owner profiles
-- ============================================================

-- ── 1. pool_members: rejected users can update their own row to pending
-- The existing "Pool owners can update member status" UPDATE policy only
-- covers pool owners. This adds a separate policy so that a user whose
-- membership was rejected can submit a new request.

create policy "Users can reapply after rejection"
  on public.pool_members for update
  using  (user_id = auth.uid() and status = 'rejected')
  with check (user_id = auth.uid() and status = 'pending');


-- ── 2. profiles: expand SELECT so approved members can see:
--       a) their pool owner's profile (needed for Pool Info tab)
--       b) other approved members' profiles (needed for leaderboard names)

drop policy if exists "Users can view own and member profiles" on public.profiles;

create policy "Users can view own and member profiles"
  on public.profiles for select
  using (
    -- Own profile
    auth.uid() = id

    -- Pool owners can see their members' profiles (existing behaviour)
    or exists (
      select 1
      from public.pool_members pm
      join public.pools p on p.id = pm.pool_id
      where pm.user_id = profiles.id
        and p.owner_id = auth.uid()
    )

    -- Approved members can see the pool owner's profile
    or exists (
      select 1
      from public.pool_members pm
      join public.pools p on p.id = pm.pool_id
      where p.owner_id = profiles.id
        and pm.user_id = auth.uid()
        and pm.status  = 'approved'
    )

    -- Approved members can see other approved members' profiles
    or exists (
      select 1
      from public.pool_members pm1
      join public.pool_members pm2
        on  pm1.pool_id  = pm2.pool_id
        and pm2.user_id  = auth.uid()
        and pm2.status   = 'approved'
      where pm1.user_id = profiles.id
        and pm1.status  = 'approved'
    )
  );
