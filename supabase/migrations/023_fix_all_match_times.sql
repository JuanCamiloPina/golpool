-- ============================================================
-- Migration 023 — Replace ALL 104 match times with the
--                 correct official schedule (CDT = UTC-5).
-- Source: worldcuplocaltime.com/2026-fifa-world-cup-schedule-central-time/
-- All kickoff times converted: CDT local + 5h = UTC stored.
-- match_date and match_time are stored in UTC.
-- ============================================================

-- ── 1. Add missing columns ────────────────────────────────────

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS match_number  integer,
  ADD COLUMN IF NOT EXISTS match_time    time,
  ADD COLUMN IF NOT EXISTS api_match_id  integer;

-- ── 2. Delete all existing matches ───────────────────────────

DELETE FROM public.matches;

-- ── 3. Correct round deadlines (1h before each round's first match UTC) ──

UPDATE public.rounds SET prediction_deadline = '2026-06-11 18:00:00+00'
WHERE name = 'Group Stage – Matchday 1';   -- M1  kicks off 19:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-06-18 15:00:00+00'
WHERE name = 'Group Stage – Matchday 2';   -- M25 kicks off 16:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-06-24 18:00:00+00'
WHERE name = 'Group Stage – Matchday 3';   -- M49/51 kick off 19:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-06-28 18:00:00+00'
WHERE name = 'Round of 32';               -- M73 kicks off 19:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-07-04 16:00:00+00'
WHERE name = 'Round of 16';              -- M90 kicks off 17:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-07-09 19:00:00+00'
WHERE name = 'Quarterfinals';            -- M97 kicks off 20:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-07-14 18:00:00+00'
WHERE name = 'Semifinals';              -- M101 kicks off 19:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-07-18 20:00:00+00'
WHERE name = 'Final';                   -- M103 kicks off 21:00 UTC

-- ── 4. Insert all 104 matches ─────────────────────────────────
-- Columns: num, rnd (round name), grp, home, away, dt (date UTC), tm (time UTC), venue

INSERT INTO public.matches
  (match_number, round_id, group_name, home_team, away_team,
   match_date, match_time, venue, status)
SELECT
  m.num,
  r.id,
  m.grp,
  m.home,
  m.away,
  m.dt::date,
  m.tm::time,
  m.venue,
  'scheduled'
FROM (VALUES

  -- ══════════════════════════════════════════════════════════
  -- GROUP STAGE — MATCHDAY 1
  -- ══════════════════════════════════════════════════════════
  --  num  round                        grp  home                   away                    date           time        venue
  (  1, 'Group Stage – Matchday 1', 'A', 'Mexico',             'South Africa',       '2026-06-11', '19:00:00', 'Mexico City'),
  (  2, 'Group Stage – Matchday 1', 'A', 'South Korea',        'Czech Republic',     '2026-06-12', '02:00:00', 'Guadalajara'),
  (  3, 'Group Stage – Matchday 1', 'B', 'Canada',             'Bosnia-Herzegovina', '2026-06-12', '19:00:00', 'Toronto'),
  (  4, 'Group Stage – Matchday 1', 'D', 'USA',                'Paraguay',           '2026-06-13', '01:00:00', 'Los Angeles'),
  (  5, 'Group Stage – Matchday 1', 'C', 'Haiti',              'Scotland',           '2026-06-14', '01:00:00', 'Boston'),
  (  6, 'Group Stage – Matchday 1', 'D', 'Australia',          'Turkey',             '2026-06-14', '04:00:00', 'Vancouver'),
  (  7, 'Group Stage – Matchday 1', 'C', 'Brazil',             'Morocco',            '2026-06-13', '22:00:00', 'New York'),
  (  8, 'Group Stage – Matchday 1', 'B', 'Qatar',              'Switzerland',        '2026-06-13', '19:00:00', 'SF Bay Area'),
  (  9, 'Group Stage – Matchday 1', 'E', 'Ivory Coast',        'Ecuador',            '2026-06-14', '23:00:00', 'Philadelphia'),
  ( 10, 'Group Stage – Matchday 1', 'E', 'Germany',            'Curaçao',            '2026-06-14', '17:00:00', 'Houston'),
  ( 11, 'Group Stage – Matchday 1', 'F', 'Netherlands',        'Japan',              '2026-06-14', '20:00:00', 'Dallas'),
  ( 12, 'Group Stage – Matchday 1', 'F', 'Sweden',             'Tunisia',            '2026-06-15', '02:00:00', 'Monterrey'),
  ( 13, 'Group Stage – Matchday 1', 'H', 'Saudi Arabia',       'Uruguay',            '2026-06-15', '22:00:00', 'Miami'),
  ( 14, 'Group Stage – Matchday 1', 'H', 'Spain',              'Cape Verde',         '2026-06-15', '16:00:00', 'Atlanta'),
  ( 15, 'Group Stage – Matchday 1', 'G', 'Iran',               'New Zealand',        '2026-06-16', '01:00:00', 'Los Angeles'),
  ( 16, 'Group Stage – Matchday 1', 'G', 'Belgium',            'Egypt',              '2026-06-15', '19:00:00', 'Seattle'),
  ( 17, 'Group Stage – Matchday 1', 'I', 'France',             'Senegal',            '2026-06-16', '19:00:00', 'New York'),
  ( 18, 'Group Stage – Matchday 1', 'I', 'Iraq',               'Norway',             '2026-06-16', '22:00:00', 'Boston'),
  ( 19, 'Group Stage – Matchday 1', 'J', 'Argentina',          'Algeria',            '2026-06-17', '01:00:00', 'Kansas City'),
  ( 20, 'Group Stage – Matchday 1', 'J', 'Austria',            'Jordan',             '2026-06-17', '04:00:00', 'SF Bay Area'),
  ( 21, 'Group Stage – Matchday 1', 'L', 'Ghana',              'Panama',             '2026-06-17', '23:00:00', 'Toronto'),
  ( 22, 'Group Stage – Matchday 1', 'L', 'England',            'Croatia',            '2026-06-17', '20:00:00', 'Dallas'),
  ( 23, 'Group Stage – Matchday 1', 'K', 'Portugal',           'DR Congo',           '2026-06-17', '17:00:00', 'Houston'),
  ( 24, 'Group Stage – Matchday 1', 'K', 'Uzbekistan',         'Colombia',           '2026-06-18', '02:00:00', 'Mexico City'),

  -- ══════════════════════════════════════════════════════════
  -- GROUP STAGE — MATCHDAY 2
  -- ══════════════════════════════════════════════════════════
  ( 25, 'Group Stage – Matchday 2', 'A', 'Czech Republic',     'South Africa',       '2026-06-18', '16:00:00', 'Atlanta'),
  ( 26, 'Group Stage – Matchday 2', 'B', 'Switzerland',        'Bosnia-Herzegovina', '2026-06-18', '19:00:00', 'Los Angeles'),
  ( 27, 'Group Stage – Matchday 2', 'B', 'Canada',             'Qatar',              '2026-06-18', '22:00:00', 'Vancouver'),
  ( 28, 'Group Stage – Matchday 2', 'A', 'Mexico',             'South Korea',        '2026-06-19', '01:00:00', 'Guadalajara'),
  ( 29, 'Group Stage – Matchday 2', 'C', 'Brazil',             'Haiti',              '2026-06-20', '00:30:00', 'Philadelphia'),
  ( 30, 'Group Stage – Matchday 2', 'C', 'Scotland',           'Morocco',            '2026-06-19', '22:00:00', 'Boston'),
  ( 31, 'Group Stage – Matchday 2', 'D', 'Turkey',             'Paraguay',           '2026-06-20', '03:00:00', 'SF Bay Area'),
  ( 32, 'Group Stage – Matchday 2', 'D', 'USA',                'Australia',          '2026-06-19', '19:00:00', 'Seattle'),
  ( 33, 'Group Stage – Matchday 2', 'E', 'Germany',            'Ivory Coast',        '2026-06-20', '20:00:00', 'Toronto'),
  ( 34, 'Group Stage – Matchday 2', 'E', 'Ecuador',            'Curaçao',            '2026-06-21', '00:00:00', 'Kansas City'),
  ( 35, 'Group Stage – Matchday 2', 'F', 'Netherlands',        'Sweden',             '2026-06-20', '17:00:00', 'Houston'),
  ( 36, 'Group Stage – Matchday 2', 'F', 'Tunisia',            'Japan',              '2026-06-21', '04:00:00', 'Monterrey'),
  ( 37, 'Group Stage – Matchday 2', 'H', 'Uruguay',            'Cape Verde',         '2026-06-21', '22:00:00', 'Miami'),
  ( 38, 'Group Stage – Matchday 2', 'H', 'Spain',              'Saudi Arabia',       '2026-06-21', '16:00:00', 'Atlanta'),
  ( 39, 'Group Stage – Matchday 2', 'G', 'Belgium',            'Iran',               '2026-06-21', '19:00:00', 'Los Angeles'),
  ( 40, 'Group Stage – Matchday 2', 'G', 'New Zealand',        'Egypt',              '2026-06-22', '01:00:00', 'Vancouver'),
  ( 41, 'Group Stage – Matchday 2', 'I', 'Norway',             'Senegal',            '2026-06-23', '00:00:00', 'New York'),
  ( 42, 'Group Stage – Matchday 2', 'I', 'France',             'Iraq',               '2026-06-22', '21:00:00', 'Philadelphia'),
  ( 43, 'Group Stage – Matchday 2', 'J', 'Argentina',          'Austria',            '2026-06-22', '17:00:00', 'Dallas'),
  ( 44, 'Group Stage – Matchday 2', 'J', 'Jordan',             'Algeria',            '2026-06-23', '03:00:00', 'SF Bay Area'),
  ( 45, 'Group Stage – Matchday 2', 'L', 'England',            'Ghana',              '2026-06-23', '20:00:00', 'Boston'),
  ( 46, 'Group Stage – Matchday 2', 'L', 'Panama',             'Croatia',            '2026-06-23', '23:00:00', 'Toronto'),
  ( 47, 'Group Stage – Matchday 2', 'K', 'Portugal',           'Uzbekistan',         '2026-06-23', '17:00:00', 'Houston'),
  ( 48, 'Group Stage – Matchday 2', 'K', 'Colombia',           'DR Congo',           '2026-06-24', '02:00:00', 'Guadalajara'),

  -- ══════════════════════════════════════════════════════════
  -- GROUP STAGE — MATCHDAY 3 (simultaneous per group)
  -- ══════════════════════════════════════════════════════════
  ( 49, 'Group Stage – Matchday 3', 'C', 'Scotland',           'Brazil',             '2026-06-24', '22:00:00', 'Miami'),
  ( 50, 'Group Stage – Matchday 3', 'C', 'Morocco',            'Haiti',              '2026-06-24', '22:00:00', 'Atlanta'),
  ( 51, 'Group Stage – Matchday 3', 'B', 'Switzerland',        'Canada',             '2026-06-24', '19:00:00', 'Vancouver'),
  ( 52, 'Group Stage – Matchday 3', 'B', 'Bosnia-Herzegovina', 'Qatar',              '2026-06-24', '19:00:00', 'Seattle'),
  ( 53, 'Group Stage – Matchday 3', 'A', 'Czech Republic',     'Mexico',             '2026-06-25', '01:00:00', 'Mexico City'),
  ( 54, 'Group Stage – Matchday 3', 'A', 'South Africa',       'South Korea',        '2026-06-25', '01:00:00', 'Monterrey'),
  ( 55, 'Group Stage – Matchday 3', 'E', 'Curaçao',            'Ivory Coast',        '2026-06-25', '20:00:00', 'Philadelphia'),
  ( 56, 'Group Stage – Matchday 3', 'E', 'Ecuador',            'Germany',            '2026-06-25', '20:00:00', 'New York'),
  ( 57, 'Group Stage – Matchday 3', 'F', 'Japan',              'Sweden',             '2026-06-25', '23:00:00', 'Dallas'),
  ( 58, 'Group Stage – Matchday 3', 'F', 'Tunisia',            'Netherlands',        '2026-06-25', '23:00:00', 'Kansas City'),
  ( 59, 'Group Stage – Matchday 3', 'D', 'Turkey',             'USA',                '2026-06-26', '02:00:00', 'Los Angeles'),
  ( 60, 'Group Stage – Matchday 3', 'D', 'Paraguay',           'Australia',          '2026-06-26', '02:00:00', 'SF Bay Area'),
  ( 61, 'Group Stage – Matchday 3', 'I', 'Norway',             'France',             '2026-06-26', '19:00:00', 'Boston'),
  ( 62, 'Group Stage – Matchday 3', 'I', 'Senegal',            'Iraq',               '2026-06-26', '19:00:00', 'Toronto'),
  ( 63, 'Group Stage – Matchday 3', 'G', 'Egypt',              'Iran',               '2026-06-27', '03:00:00', 'Seattle'),
  ( 64, 'Group Stage – Matchday 3', 'G', 'New Zealand',        'Belgium',            '2026-06-27', '03:00:00', 'Vancouver'),
  ( 65, 'Group Stage – Matchday 3', 'H', 'Cape Verde',         'Saudi Arabia',       '2026-06-27', '00:00:00', 'Houston'),
  ( 66, 'Group Stage – Matchday 3', 'H', 'Uruguay',            'Spain',              '2026-06-27', '00:00:00', 'Guadalajara'),
  ( 67, 'Group Stage – Matchday 3', 'L', 'Panama',             'England',            '2026-06-27', '21:00:00', 'New York'),
  ( 68, 'Group Stage – Matchday 3', 'L', 'Croatia',            'Ghana',              '2026-06-27', '21:00:00', 'Philadelphia'),
  ( 69, 'Group Stage – Matchday 3', 'J', 'Algeria',            'Austria',            '2026-06-28', '02:00:00', 'Kansas City'),
  ( 70, 'Group Stage – Matchday 3', 'J', 'Jordan',             'Argentina',          '2026-06-28', '02:00:00', 'Dallas'),
  ( 71, 'Group Stage – Matchday 3', 'K', 'Colombia',           'Portugal',           '2026-06-27', '23:30:00', 'Miami'),
  ( 72, 'Group Stage – Matchday 3', 'K', 'DR Congo',           'Uzbekistan',         '2026-06-27', '23:30:00', 'Atlanta'),

  -- ══════════════════════════════════════════════════════════
  -- ROUND OF 32 (Jun 28 – Jul 4)
  -- ══════════════════════════════════════════════════════════
  ( 73, 'Round of 32', NULL, 'RU Group A',          'RU Group B',           '2026-06-28', '19:00:00', 'Los Angeles'),
  ( 74, 'Round of 32', NULL, 'W Group E',            'Best 3rd A/B/C/D/F',  '2026-06-29', '20:30:00', 'Boston'),
  ( 75, 'Round of 32', NULL, 'W Group F',            'RU Group C',           '2026-06-30', '01:00:00', 'Monterrey'),
  ( 76, 'Round of 32', NULL, 'W Group C',            'RU Group F',           '2026-06-29', '17:00:00', 'Houston'),
  ( 77, 'Round of 32', NULL, 'W Group I',            'Best 3rd C/D/F/G/H',  '2026-06-30', '21:00:00', 'New York'),
  ( 78, 'Round of 32', NULL, 'RU Group E',           'RU Group I',           '2026-06-30', '17:00:00', 'Dallas'),
  ( 79, 'Round of 32', NULL, 'W Group A',            'Best 3rd C/E/F/H/I',  '2026-07-01', '01:00:00', 'Mexico City'),
  ( 80, 'Round of 32', NULL, 'W Group L',            'Best 3rd E/H/I/J/K',  '2026-07-01', '16:00:00', 'Atlanta'),
  ( 81, 'Round of 32', NULL, 'W Group D',            'Best 3rd B/E/F/I/J',  '2026-07-02', '00:00:00', 'SF Bay Area'),
  ( 82, 'Round of 32', NULL, 'W Group G',            'Best 3rd A/E/H/I/J',  '2026-07-01', '20:00:00', 'Seattle'),
  ( 83, 'Round of 32', NULL, 'RU Group K',           'RU Group L',           '2026-07-02', '23:00:00', 'Toronto'),
  ( 84, 'Round of 32', NULL, 'W Group H',            'RU Group J',           '2026-07-02', '19:00:00', 'Los Angeles'),
  ( 85, 'Round of 32', NULL, 'W Group B',            'Best 3rd E/F/G/I/J',  '2026-07-03', '03:00:00', 'Vancouver'),
  ( 86, 'Round of 32', NULL, 'W Group J',            'RU Group H',           '2026-07-03', '22:00:00', 'Miami'),
  ( 87, 'Round of 32', NULL, 'W Group K',            'Best 3rd D/E/I/J/L',  '2026-07-04', '01:30:00', 'Kansas City'),
  ( 88, 'Round of 32', NULL, 'RU Group D',           'RU Group G',           '2026-07-03', '18:00:00', 'Dallas'),

  -- ══════════════════════════════════════════════════════════
  -- ROUND OF 16 (Jul 4–7)
  -- ══════════════════════════════════════════════════════════
  ( 89, 'Round of 16', NULL, 'W Match 74',           'W Match 77',           '2026-07-04', '21:00:00', 'Philadelphia'),
  ( 90, 'Round of 16', NULL, 'W Match 73',           'W Match 75',           '2026-07-04', '17:00:00', 'Houston'),
  ( 91, 'Round of 16', NULL, 'W Match 76',           'W Match 78',           '2026-07-05', '20:00:00', 'New York'),
  ( 92, 'Round of 16', NULL, 'W Match 79',           'W Match 80',           '2026-07-06', '00:00:00', 'Mexico City'),
  ( 93, 'Round of 16', NULL, 'W Match 83',           'W Match 84',           '2026-07-06', '19:00:00', 'Dallas'),
  ( 94, 'Round of 16', NULL, 'W Match 81',           'W Match 82',           '2026-07-07', '00:00:00', 'Seattle'),
  ( 95, 'Round of 16', NULL, 'W Match 86',           'W Match 88',           '2026-07-07', '16:00:00', 'Atlanta'),
  ( 96, 'Round of 16', NULL, 'W Match 85',           'W Match 87',           '2026-07-07', '20:00:00', 'Vancouver'),

  -- ══════════════════════════════════════════════════════════
  -- QUARTER-FINALS (Jul 9–11)
  -- ══════════════════════════════════════════════════════════
  ( 97, 'Quarterfinals', NULL, 'W Match 89',         'W Match 90',           '2026-07-09', '20:00:00', 'Boston'),
  ( 98, 'Quarterfinals', NULL, 'W Match 93',         'W Match 94',           '2026-07-10', '19:00:00', 'Los Angeles'),
  ( 99, 'Quarterfinals', NULL, 'W Match 91',         'W Match 92',           '2026-07-11', '21:00:00', 'Miami'),
  (100, 'Quarterfinals', NULL, 'W Match 95',         'W Match 96',           '2026-07-12', '01:00:00', 'Kansas City'),

  -- ══════════════════════════════════════════════════════════
  -- SEMI-FINALS (Jul 14–15)
  -- ══════════════════════════════════════════════════════════
  (101, 'Semifinals',   NULL, 'W Match 97',          'W Match 98',           '2026-07-14', '19:00:00', 'Dallas'),
  (102, 'Semifinals',   NULL, 'W Match 99',          'W Match 100',          '2026-07-15', '19:00:00', 'Atlanta'),

  -- ══════════════════════════════════════════════════════════
  -- THIRD PLACE (Jul 18) — shares 'Final' round
  -- ══════════════════════════════════════════════════════════
  (103, 'Final',        NULL, 'L Match 101',         'L Match 102',          '2026-07-18', '21:00:00', 'Miami'),

  -- ══════════════════════════════════════════════════════════
  -- FINAL (Jul 19)
  -- ══════════════════════════════════════════════════════════
  (104, 'Final',        NULL, 'W Match 101',         'W Match 102',          '2026-07-19', '19:00:00', 'New York')

) AS m(num, rnd, grp, home, away, dt, tm, venue)
JOIN public.rounds r ON r.name = m.rnd;
