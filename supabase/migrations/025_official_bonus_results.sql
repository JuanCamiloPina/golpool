-- ============================================================
-- Migration 025 — Official bonus results singleton table
-- ============================================================

create table if not exists public.official_bonus_results (
  id           uuid        default gen_random_uuid() primary key,
  winner       text,
  runner_up    text,
  third_place  text,
  golden_ball  text,
  golden_boot  text,
  golden_glove text,
  updated_at   timestamptz default now()
);

-- Only the service-role (admin) client writes; block all direct client access
alter table public.official_bonus_results enable row level security;

create policy "Public read official bonus results"
  on public.official_bonus_results for select
  using (true);
