-- ============================================================
-- Migration 008 — Add group_name / prediction_deadline + seed
--                 all 72 World Cup 2026 group stage matches
-- Run once in Supabase SQL Editor. Safe to inspect first.
-- ============================================================
-- Note: The 2026 World Cup has 12 groups × 6 matches = 72 group
-- stage matches (not 48 — there are 48 TEAMS but 72 matches).
-- All times stored as EDT (UTC-4), which is Eastern Time in June.
-- ============================================================

-- ── Schema additions ─────────────────────────────────────────

alter table public.matches
  add column if not exists group_name text;

alter table public.rounds
  add column if not exists prediction_deadline timestamptz;

-- ── Prediction deadlines (15 min before first match of each round) ──

update public.rounds
  set prediction_deadline = '2026-06-11 13:45:00-04'   -- 15 min before Mexico vs South Africa
  where name = 'Group Stage – Matchday 1';

update public.rounds
  set prediction_deadline = '2026-06-18 11:45:00-04'   -- 15 min before Czech Republic vs South Africa
  where name = 'Group Stage – Matchday 2';

update public.rounds
  set prediction_deadline = '2026-06-24 14:45:00-04'   -- 15 min before earliest MD3 matches
  where name = 'Group Stage – Matchday 3';

-- ── Insert 72 group stage matches ────────────────────────────
-- Idempotency: skip if matches already exist.

do $$
begin
  if exists (select 1 from public.matches limit 1) then
    raise notice 'Matches already seeded — skipping insert.';
    return;
  end if;

  insert into public.matches (round_id, group_name, home_team, away_team, match_date, venue)
  select r.id, m.grp, m.home, m.away, m.dt::timestamptz, m.venue
  from (values
    -- ── Group A: Mexico · South Africa · South Korea · Czech Republic ──
    ('Group Stage – Matchday 1','A','Mexico',          'South Africa',     '2026-06-11 14:00:00-04','Estadio Azteca, Mexico City'),
    ('Group Stage – Matchday 1','A','South Korea',     'Czech Republic',   '2026-06-11 21:00:00-04','Estadio Akron, Zapopan'),
    ('Group Stage – Matchday 2','A','Czech Republic',  'South Africa',     '2026-06-18 12:00:00-04','Mercedes-Benz Stadium, Atlanta'),
    ('Group Stage – Matchday 2','A','Mexico',          'South Korea',      '2026-06-18 20:00:00-04','Estadio Akron, Zapopan'),
    ('Group Stage – Matchday 3','A','Czech Republic',  'Mexico',           '2026-06-24 20:00:00-04','Estadio Azteca, Mexico City'),
    ('Group Stage – Matchday 3','A','South Africa',    'South Korea',      '2026-06-24 20:00:00-04','Estadio BBVA, Guadalupe'),

    -- ── Group B: Canada · Bosnia-Herzegovina · Qatar · Switzerland ──
    ('Group Stage – Matchday 1','B','Canada',          'Bosnia-Herzegovina','2026-06-12 19:00:00-04','BMO Field, Toronto'),
    ('Group Stage – Matchday 1','B','Qatar',           'Switzerland',      '2026-06-13 15:00:00-04','Levi''s Stadium, Santa Clara'),
    ('Group Stage – Matchday 2','B','Switzerland',     'Bosnia-Herzegovina','2026-06-18 15:00:00-04','SoFi Stadium, Inglewood'),
    ('Group Stage – Matchday 2','B','Canada',          'Qatar',            '2026-06-18 18:00:00-04','BC Place, Vancouver'),
    ('Group Stage – Matchday 3','B','Switzerland',     'Canada',           '2026-06-24 15:00:00-04','BC Place, Vancouver'),
    ('Group Stage – Matchday 3','B','Bosnia-Herzegovina','Qatar',          '2026-06-24 15:00:00-04','Lumen Field, Seattle'),

    -- ── Group C: Brazil · Morocco · Haiti · Scotland ──
    ('Group Stage – Matchday 1','C','Brazil',          'Morocco',          '2026-06-13 18:00:00-04','MetLife Stadium, East Rutherford'),
    ('Group Stage – Matchday 1','C','Haiti',           'Scotland',         '2026-06-13 21:00:00-04','Gillette Stadium, Foxborough'),
    ('Group Stage – Matchday 2','C','Scotland',        'Morocco',          '2026-06-19 18:00:00-04','Gillette Stadium, Foxborough'),
    ('Group Stage – Matchday 2','C','Brazil',          'Haiti',            '2026-06-19 20:30:00-04','Lincoln Financial Field, Philadelphia'),
    ('Group Stage – Matchday 3','C','Scotland',        'Brazil',           '2026-06-24 18:00:00-04','Hard Rock Stadium, Miami Gardens'),
    ('Group Stage – Matchday 3','C','Morocco',         'Haiti',            '2026-06-24 18:00:00-04','Mercedes-Benz Stadium, Atlanta'),

    -- ── Group D: United States · Paraguay · Australia · Turkey ──
    ('Group Stage – Matchday 1','D','United States',   'Paraguay',         '2026-06-12 21:00:00-04','SoFi Stadium, Inglewood'),
    ('Group Stage – Matchday 1','D','Australia',       'Turkey',           '2026-06-14 00:00:00-04','BC Place, Vancouver'),
    ('Group Stage – Matchday 2','D','United States',   'Australia',        '2026-06-19 15:00:00-04','Lumen Field, Seattle'),
    ('Group Stage – Matchday 2','D','Turkey',          'Paraguay',         '2026-06-19 23:00:00-04','Levi''s Stadium, Santa Clara'),
    ('Group Stage – Matchday 3','D','Turkey',          'United States',    '2026-06-25 22:00:00-04','SoFi Stadium, Inglewood'),
    ('Group Stage – Matchday 3','D','Paraguay',        'Australia',        '2026-06-25 22:00:00-04','Levi''s Stadium, Santa Clara'),

    -- ── Group E: Germany · Ecuador · Ivory Coast · Curaçao ──
    ('Group Stage – Matchday 1','E','Germany',         'Curaçao',          '2026-06-14 13:00:00-04','NRG Stadium, Houston'),
    ('Group Stage – Matchday 1','E','Ivory Coast',     'Ecuador',          '2026-06-14 20:00:00-04','Lincoln Financial Field, Philadelphia'),
    ('Group Stage – Matchday 2','E','Germany',         'Ivory Coast',      '2026-06-20 17:00:00-04','BMO Field, Toronto'),
    ('Group Stage – Matchday 2','E','Ecuador',         'Curaçao',          '2026-06-20 20:00:00-04','Arrowhead Stadium, Kansas City'),
    ('Group Stage – Matchday 3','E','Curaçao',         'Ivory Coast',      '2026-06-25 17:00:00-04','Lincoln Financial Field, Philadelphia'),
    ('Group Stage – Matchday 3','E','Ecuador',         'Germany',          '2026-06-25 17:00:00-04','MetLife Stadium, East Rutherford'),

    -- ── Group F: Netherlands · Japan · Sweden · Tunisia ──
    ('Group Stage – Matchday 1','F','Netherlands',     'Japan',            '2026-06-14 16:00:00-04','AT&T Stadium, Arlington'),
    ('Group Stage – Matchday 1','F','Sweden',          'Tunisia',          '2026-06-14 21:00:00-04','Estadio BBVA, Guadalupe'),
    ('Group Stage – Matchday 2','F','Netherlands',     'Sweden',           '2026-06-20 13:00:00-04','NRG Stadium, Houston'),
    ('Group Stage – Matchday 2','F','Tunisia',         'Japan',            '2026-06-20 23:00:00-04','Estadio BBVA, Guadalupe'),
    ('Group Stage – Matchday 3','F','Japan',           'Sweden',           '2026-06-25 19:00:00-04','AT&T Stadium, Arlington'),
    ('Group Stage – Matchday 3','F','Tunisia',         'Netherlands',      '2026-06-25 19:00:00-04','Arrowhead Stadium, Kansas City'),

    -- ── Group G: Belgium · Egypt · Iran · New Zealand ──
    ('Group Stage – Matchday 1','G','Belgium',         'Egypt',            '2026-06-15 15:00:00-04','Lumen Field, Seattle'),
    ('Group Stage – Matchday 1','G','Iran',            'New Zealand',      '2026-06-15 21:00:00-04','SoFi Stadium, Inglewood'),
    ('Group Stage – Matchday 2','G','Belgium',         'Iran',             '2026-06-21 15:00:00-04','SoFi Stadium, Inglewood'),
    ('Group Stage – Matchday 2','G','New Zealand',     'Egypt',            '2026-06-21 21:00:00-04','BC Place, Vancouver'),
    ('Group Stage – Matchday 3','G','Egypt',           'Iran',             '2026-06-26 23:00:00-04','Lumen Field, Seattle'),
    ('Group Stage – Matchday 3','G','New Zealand',     'Belgium',          '2026-06-26 23:00:00-04','BC Place, Vancouver'),

    -- ── Group H: Spain · Cape Verde · Saudi Arabia · Uruguay ──
    ('Group Stage – Matchday 1','H','Spain',           'Cape Verde',       '2026-06-15 13:00:00-04','Mercedes-Benz Stadium, Atlanta'),
    ('Group Stage – Matchday 1','H','Saudi Arabia',    'Uruguay',          '2026-06-15 19:00:00-04','Hard Rock Stadium, Miami Gardens'),
    ('Group Stage – Matchday 2','H','Spain',           'Saudi Arabia',     '2026-06-21 13:00:00-04','Mercedes-Benz Stadium, Atlanta'),
    ('Group Stage – Matchday 2','H','Uruguay',         'Cape Verde',       '2026-06-21 19:00:00-04','Hard Rock Stadium, Miami Gardens'),
    ('Group Stage – Matchday 3','H','Cape Verde',      'Saudi Arabia',     '2026-06-26 20:00:00-04','NRG Stadium, Houston'),
    ('Group Stage – Matchday 3','H','Uruguay',         'Spain',            '2026-06-26 19:00:00-04','Estadio Akron, Zapopan'),

    -- ── Group I: France · Senegal · Iraq · Norway ──
    ('Group Stage – Matchday 1','I','France',          'Senegal',          '2026-06-16 15:00:00-04','MetLife Stadium, East Rutherford'),
    ('Group Stage – Matchday 1','I','Iraq',            'Norway',           '2026-06-16 18:00:00-04','Gillette Stadium, Foxborough'),
    ('Group Stage – Matchday 2','I','France',          'Iraq',             '2026-06-22 17:00:00-04','Lincoln Financial Field, Philadelphia'),
    ('Group Stage – Matchday 2','I','Norway',          'Senegal',          '2026-06-22 20:00:00-04','MetLife Stadium, East Rutherford'),
    ('Group Stage – Matchday 3','I','Norway',          'France',           '2026-06-26 15:00:00-04','Gillette Stadium, Foxborough'),
    ('Group Stage – Matchday 3','I','Senegal',         'Iraq',             '2026-06-26 15:00:00-04','BMO Field, Toronto'),

    -- ── Group J: Argentina · Algeria · Austria · Jordan ──
    ('Group Stage – Matchday 1','J','Argentina',       'Algeria',          '2026-06-16 20:00:00-04','Arrowhead Stadium, Kansas City'),
    ('Group Stage – Matchday 1','J','Austria',         'Jordan',           '2026-06-16 23:00:00-04','Levi''s Stadium, Santa Clara'),
    ('Group Stage – Matchday 2','J','Argentina',       'Austria',          '2026-06-22 12:00:00-04','AT&T Stadium, Arlington'),
    ('Group Stage – Matchday 2','J','Jordan',          'Algeria',          '2026-06-22 23:00:00-04','Levi''s Stadium, Santa Clara'),
    ('Group Stage – Matchday 3','J','Algeria',         'Austria',          '2026-06-27 22:00:00-04','Arrowhead Stadium, Kansas City'),
    ('Group Stage – Matchday 3','J','Jordan',          'Argentina',        '2026-06-27 22:00:00-04','AT&T Stadium, Arlington'),

    -- ── Group K: Portugal · DR Congo · Uzbekistan · Colombia ──
    ('Group Stage – Matchday 1','K','Portugal',        'DR Congo',         '2026-06-17 12:00:00-04','NRG Stadium, Houston'),
    ('Group Stage – Matchday 1','K','Uzbekistan',      'Colombia',         '2026-06-17 21:00:00-04','Estadio Azteca, Mexico City'),
    ('Group Stage – Matchday 2','K','Portugal',        'Uzbekistan',       '2026-06-23 12:00:00-04','NRG Stadium, Houston'),
    ('Group Stage – Matchday 2','K','Colombia',        'DR Congo',         '2026-06-23 21:00:00-04','Estadio Akron, Zapopan'),
    ('Group Stage – Matchday 3','K','Colombia',        'Portugal',         '2026-06-27 20:30:00-04','Hard Rock Stadium, Miami Gardens'),
    ('Group Stage – Matchday 3','K','DR Congo',        'Uzbekistan',       '2026-06-27 20:30:00-04','Mercedes-Benz Stadium, Atlanta'),

    -- ── Group L: England · Croatia · Ghana · Panama ──
    ('Group Stage – Matchday 1','L','England',         'Croatia',          '2026-06-17 14:00:00-04','AT&T Stadium, Arlington'),
    ('Group Stage – Matchday 1','L','Ghana',           'Panama',           '2026-06-17 18:00:00-04','BMO Field, Toronto'),
    ('Group Stage – Matchday 2','L','England',         'Ghana',            '2026-06-23 15:00:00-04','Gillette Stadium, Foxborough'),
    ('Group Stage – Matchday 2','L','Panama',          'Croatia',          '2026-06-23 18:00:00-04','BMO Field, Toronto'),
    ('Group Stage – Matchday 3','L','Panama',          'England',          '2026-06-27 16:00:00-04','MetLife Stadium, East Rutherford'),
    ('Group Stage – Matchday 3','L','Croatia',         'Ghana',            '2026-06-27 16:00:00-04','Lincoln Financial Field, Philadelphia')

  ) as m(rnd, grp, home, away, dt, venue)
  join public.rounds r on r.name = m.rnd;

end $$;
