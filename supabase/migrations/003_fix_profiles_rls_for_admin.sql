-- ============================================================
-- Migration 003 — Fix profiles RLS so admin page can read member data
-- Applied: Bug fix (Phase 2)
-- ============================================================
-- Problem:
--   The profiles SELECT policy only allowed users to see their own row
--   (auth.uid() = id). When the admin page queries:
--
--     pool_members.select('...profiles(full_name, email)')
--
--   PostgREST resolves the join by also querying profiles through RLS.
--   Because the pool owner is not the same person as the member, the
--   profiles RLS blocked the join and returned null for every member's
--   profile. Names and emails appeared blank on the admin page.
--
-- Fix:
--   Extend the profiles SELECT policy so that pool owners can also read
--   the profiles of users who are members of their pools.
-- ============================================================

-- Drop the old restrictive policy
drop policy if exists "Users can view their own profile" on public.profiles;

-- New policy: own profile + profiles of members in pools you own
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'Users can view own and member profiles'
  ) then
    execute $policy$
      create policy "Users can view own and member profiles"
        on public.profiles for select
        using (
          auth.uid() = id
          or exists (
            select 1
            from public.pool_members pm
            join public.pools p on p.id = pm.pool_id
            where pm.user_id = profiles.id
              and p.owner_id = auth.uid()
          )
        )
    $policy$;
  end if;
end $$;
