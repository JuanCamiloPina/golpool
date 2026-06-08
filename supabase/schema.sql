-- ============================================================
-- GolPool — Schema Reference
-- ============================================================
-- Run ONCE on a fresh Supabase project.
-- Do NOT run on a database that already has tables and data —
-- you will get "relation already exists" errors.
--
-- For incremental changes:  supabase/migrations/
-- To wipe and start over:   supabase/reset.sql  (dev only)
-- ============================================================
--
-- REQUIRED SUPABASE DASHBOARD CONFIGURATION
-- After running this schema, configure the following in the
-- Supabase dashboard (Authentication → URL Configuration):
--
--   Site URL:
--     https://mygopool.com          (production)
--     http://localhost:3000                   (local dev)
--
--   Redirect URLs (add ALL of these):
--     https://mygopool.com/auth/callback
--     https://mygopool.com/auth/reset-password
--     http://localhost:3000/auth/callback
--     http://localhost:3000/auth/reset-password
--
--   Without these entries, Supabase will reject the redirectTo
--   URL in password-reset and email-confirmation flows, and
--   users will land on the wrong page with no session.
-- ============================================================


-- ============================================================
-- TABLES (dependency order — no forward references)
-- ============================================================

create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  email       text        not null,
  language    text        not null default 'en' check (language in ('en', 'es')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.pools (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  description  text,
  invite_code  text        unique not null default upper(substring(gen_random_uuid()::text, 1, 8)),
  owner_id     uuid        not null references public.profiles(id) on delete cascade,
  max_members  integer     default 50,
  entry_fee    numeric     default 0,
  currency     text        default 'USD',
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.pool_members (
  id           uuid        primary key default gen_random_uuid(),
  pool_id      uuid        not null references public.pools(id)    on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  -- pending = waiting for admin approval, approved = active member, rejected = denied
  status       text        not null default 'pending'
                           check (status in ('pending', 'approved', 'rejected')),
  joined_at    timestamptz not null default now(),
  total_points integer     not null default 0,
  rank         integer,
  unique(pool_id, user_id)
);

create table public.rounds (
  id                  serial      primary key,
  name                text        not null,
  name_es             text        not null,
  order_index         integer     not null,
  scoring_multiplier  numeric     not null default 1,
  created_at          timestamptz not null default now()
);

create table public.matches (
  id              uuid        primary key default gen_random_uuid(),
  round_id        integer     not null references public.rounds(id),
  home_team       text,
  away_team       text,
  home_team_flag  text,
  away_team_flag  text,
  match_date      timestamptz,
  venue           text,
  home_score      integer,
  away_score      integer,
  status          text        not null default 'scheduled'
                              check (status in ('scheduled', 'live', 'finished', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.predictions (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles(id) on delete cascade,
  pool_id               uuid        not null references public.pools(id)    on delete cascade,
  match_id              uuid        not null references public.matches(id)  on delete cascade,
  predicted_home_score  integer     not null,
  predicted_away_score  integer     not null,
  points_earned         integer     not null default 0,
  submitted_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(user_id, pool_id, match_id)
);

create table public.bonus_predictions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  pool_id       uuid        not null references public.pools(id)    on delete cascade,
  question      text        not null,
  answer        text        not null,
  points_earned integer     not null default 0,
  is_resolved   boolean     not null default false,
  submitted_at  timestamptz not null default now()
);

create table public.audit_log (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references public.profiles(id) on delete set null,
  action      text        not null,
  table_name  text        not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create table public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null,
  title       text        not null,
  body        text        not null,
  is_read     boolean     not null default false,
  data        jsonb,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.pools             enable row level security;
alter table public.pool_members      enable row level security;
alter table public.rounds            enable row level security;
alter table public.matches           enable row level security;
alter table public.predictions       enable row level security;
alter table public.bonus_predictions enable row level security;
alter table public.audit_log         enable row level security;
alter table public.notifications     enable row level security;


-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles ------------------------------------------------
-- Users see their own profile; pool owners see their members' profiles.
-- The second clause is required so the admin page can join pool_members
-- with profiles — without it, PostgREST returns null for every profile
-- that isn't the requesting user.
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
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- pools ---------------------------------------------------
-- Open to everyone: pool names/codes are not sensitive, and anonymous
-- users must see pool info when they visit a public invite link.
create policy "Pools are publicly viewable"
  on public.pools for select
  using (true);

create policy "Authenticated users can create pools"
  on public.pools for insert
  with check (auth.uid() = owner_id);

create policy "Pool owners can update their pools"
  on public.pools for update
  using (auth.uid() = owner_id);

create policy "Pool owners can delete their pools"
  on public.pools for delete
  using (auth.uid() = owner_id);

-- pool_members --------------------------------------------
-- SELECT:
--   • Pool owner (via pools.owner_id) sees every row in their pool.
--   • Users see their own membership row (any status).
--   • Approved members see other approved members.
-- NOTE: the owner is NOT a pool_member row themselves, so the owner
-- clause must use a subquery into pools — not a self-join on pool_members.
create policy "owners can see all members"
  on public.pool_members for select
  using (
    pool_id in (
      select id from public.pools where owner_id = auth.uid()
    )
    or user_id = auth.uid()
    or exists (
      select 1 from public.pool_members pm
      where pm.pool_id = pool_members.pool_id
        and pm.user_id = auth.uid()
        and pm.status  = 'approved'
    )
  );

-- INSERT: status must be 'pending' — prevents self-approval
create policy "Users can join pools as pending"
  on public.pool_members for insert
  with check (auth.uid() = user_id and status = 'pending');

-- UPDATE: only the pool owner can change member status
create policy "Pool owners can update member status"
  on public.pool_members for update
  using (
    exists (
      select 1 from public.pools
      where id = pool_members.pool_id and owner_id = auth.uid()
    )
  );

-- DELETE: members can withdraw; owners can remove anyone
create policy "Users and owners can remove memberships"
  on public.pool_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.pools
      where id = pool_members.pool_id and owner_id = auth.uid()
    )
  );

-- rounds --------------------------------------------------
create policy "Rounds are viewable by everyone"
  on public.rounds for select
  using (true);

-- matches -------------------------------------------------
create policy "Matches are viewable by everyone"
  on public.matches for select
  using (true);

-- predictions ---------------------------------------------
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
  );

create policy "Users can insert their own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own predictions before match starts"
  on public.predictions for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches
      where id = predictions.match_id
        and (match_date is null or match_date > now())
    )
  );

-- bonus_predictions ---------------------------------------
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
  );

create policy "Users can insert their own bonus predictions"
  on public.bonus_predictions for insert
  with check (auth.uid() = user_id);

-- audit_log -----------------------------------------------
create policy "Users can view their own audit logs"
  on public.audit_log for select
  using (auth.uid() = user_id);

-- notifications -------------------------------------------
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark their own notifications as read"
  on public.notifications for update
  using (auth.uid() = user_id);


-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'language', 'en')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- SEED DATA
-- ============================================================

insert into public.rounds (name, name_es, order_index, scoring_multiplier) values
  ('Group Stage – Matchday 1', 'Fase de Grupos – Jornada 1', 1,  1),
  ('Group Stage – Matchday 2', 'Fase de Grupos – Jornada 2', 2,  1),
  ('Group Stage – Matchday 3', 'Fase de Grupos – Jornada 3', 3,  1),
  ('Round of 32',              'Ronda de 32',                4,  2),
  ('Round of 16',              'Octavos de Final',           5,  3),
  ('Quarterfinals',            'Cuartos de Final',           6,  4),
  ('Semifinals',               'Semifinales',                7,  5),
  ('Final',                    'Final',                      8, 10);
