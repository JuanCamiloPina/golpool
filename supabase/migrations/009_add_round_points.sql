-- ============================================================
-- Migration 009 — Per-round points columns + indexes +
--                 bonus_predictions UPDATE policy
-- ============================================================

-- ── Per-round points on pool_members ─────────────────────────

alter table public.pool_members
  add column if not exists points_md1   integer not null default 0,
  add column if not exists points_md2   integer not null default 0,
  add column if not exists points_md3   integer not null default 0,
  add column if not exists points_r32   integer not null default 0,
  add column if not exists points_r16   integer not null default 0,
  add column if not exists points_qf    integer not null default 0,
  add column if not exists points_sf    integer not null default 0,
  add column if not exists points_final integer not null default 0;

-- ── Indexes ───────────────────────────────────────────────────

create index if not exists idx_predictions_user_pool_match
  on public.predictions (user_id, pool_id, match_id);

create index if not exists idx_pool_members_pool_points
  on public.pool_members (pool_id, total_points desc);

create index if not exists idx_matches_round_date
  on public.matches (round_id, match_date);

-- ── bonus_predictions UPDATE policy ──────────────────────────
-- Allows users to update their own bonus predictions before
-- the Group Stage Matchday 1 prediction_deadline.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'bonus_predictions'
      and policyname = 'Users can update own bonus predictions before deadline'
  ) then
    execute $policy$
      create policy "Users can update own bonus predictions before deadline"
        on public.bonus_predictions for update
        using (
          auth.uid() = user_id
          and exists (
            select 1 from public.rounds
            where name = 'Group Stage – Matchday 1'
              and (prediction_deadline is null or prediction_deadline > now())
          )
        )
    $policy$;
  end if;
end $$;
