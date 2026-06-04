-- ============================================================
-- Migration 022 — Fix knockout match schedule with correct
--                 official ET kickoff times and venues.
-- All times stored as UTC (ET = UTC-4 in summer).
-- Replaces migration 021 data entirely.
-- ============================================================

-- ── 1. Delete existing knockout matches ──────────────────────

DELETE FROM public.matches
WHERE round_id IN (
  SELECT id FROM public.rounds WHERE order_index >= 4
);

-- ── 2. Update knockout round deadlines ───────────────────────
-- 1 hour before the first match of each round (UTC).

UPDATE public.rounds SET prediction_deadline = '2026-06-28 18:00:00+00'
WHERE name = 'Round of 32';       -- 1h before M73 Jun 28 19:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-07-04 16:00:00+00'
WHERE name = 'Round of 16';       -- 1h before M89 Jul 4 17:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-07-09 19:00:00+00'
WHERE name = 'Quarterfinals';     -- 1h before M97 Jul 9 20:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-07-14 22:00:00+00'
WHERE name = 'Semifinals';        -- 1h before M101 Jul 14 23:00 UTC

UPDATE public.rounds SET prediction_deadline = '2026-07-18 21:00:00+00'
WHERE name = 'Final';             -- 1h before M103 Jul 18 22:00 UTC

-- ── 3. Insert corrected knockout matches ─────────────────────

INSERT INTO public.matches (round_id, home_team, away_team, match_date, venue)
SELECT r.id, m.home, m.away, m.dt::timestamptz, m.venue
FROM (VALUES

  -- ── ROUND OF 32 (Jun 28 – Jul 4) ─────────────────────────
  -- M73  Jun 28 3pm ET  → 19:00 UTC
  ('Round of 32', 'RU Group A',         'RU Group B',           '2026-06-28 19:00:00+00', 'SoFi Stadium, Los Angeles'),
  -- M76  Jun 29 1pm ET  → 17:00 UTC
  ('Round of 32', 'W Group C',          'RU Group F',           '2026-06-29 17:00:00+00', 'NRG Stadium, Houston'),
  -- M74  Jun 29 4:30pm ET → 20:30 UTC
  ('Round of 32', 'W Group E',          'Best 3rd A/B/C/D/F',  '2026-06-29 20:30:00+00', 'Gillette Stadium, Boston'),
  -- M75  Jun 29 9pm ET  → 01:00 UTC Jun 30
  ('Round of 32', 'W Group F',          'RU Group C',           '2026-06-30 01:00:00+00', 'Estadio BBVA, Monterrey'),
  -- M78  Jun 30 1pm ET  → 17:00 UTC
  ('Round of 32', 'RU Group E',         'RU Group I',           '2026-06-30 17:00:00+00', 'AT&T Stadium, Dallas'),
  -- M77  Jun 30 5pm ET  → 21:00 UTC
  ('Round of 32', 'W Group I',          'Best 3rd C/D/F/G/H',  '2026-06-30 21:00:00+00', 'MetLife Stadium, New York'),
  -- M79  Jun 30 9pm ET  → 01:00 UTC Jul 1
  ('Round of 32', 'W Group A',          'Best 3rd C/E/F/H/I',  '2026-07-01 01:00:00+00', 'Estadio Azteca, Mexico City'),
  -- M80  Jul 1 12pm ET  → 16:00 UTC
  ('Round of 32', 'W Group L',          'Best 3rd E/H/I/J/K',  '2026-07-01 16:00:00+00', 'Mercedes-Benz Stadium, Atlanta'),
  -- M82  Jul 1 4pm ET   → 20:00 UTC
  ('Round of 32', 'W Group G',          'Best 3rd A/E/H/I/J',  '2026-07-01 20:00:00+00', 'Lumen Field, Seattle'),
  -- M81  Jul 1 8pm ET   → 00:00 UTC Jul 2
  ('Round of 32', 'W Group D',          'Best 3rd B/E/F/I/J',  '2026-07-02 00:00:00+00', 'Levi''s Stadium, San Francisco'),
  -- M84  Jul 2 3pm ET   → 19:00 UTC
  ('Round of 32', 'W Group H',          'RU Group J',           '2026-07-02 19:00:00+00', 'SoFi Stadium, Los Angeles'),
  -- M83  Jul 2 7pm ET   → 23:00 UTC
  ('Round of 32', 'RU Group K',         'RU Group L',           '2026-07-02 23:00:00+00', 'BMO Field, Toronto'),
  -- M85  Jul 2 11pm ET  → 03:00 UTC Jul 3
  ('Round of 32', 'W Group B',          'Best 3rd E/F/G/I/J',  '2026-07-03 03:00:00+00', 'BC Place, Vancouver'),
  -- M88  Jul 3 2pm ET   → 18:00 UTC
  ('Round of 32', 'RU Group D',         'RU Group G',           '2026-07-03 18:00:00+00', 'Hard Rock Stadium, Miami'),
  -- M86  Jul 3 6pm ET   → 22:00 UTC
  ('Round of 32', 'W Group J',          'RU Group H',           '2026-07-03 22:00:00+00', 'Arrowhead Stadium, Kansas City'),
  -- M87  Jul 3 9:30pm ET → 01:30 UTC Jul 4
  ('Round of 32', 'W Group K',          'Best 3rd D/E/I/J/L',  '2026-07-04 01:30:00+00', 'AT&T Stadium, Dallas'),

  -- ── ROUND OF 16 (Jul 4–7) ────────────────────────────────
  -- M89  Jul 4 1pm ET   → 17:00 UTC
  ('Round of 16', 'W Match 74',         'W Match 75',           '2026-07-04 17:00:00+00', 'NRG Stadium, Houston'),
  -- M90  Jul 4 5pm ET   → 21:00 UTC
  ('Round of 16', 'W Match 73',         'W Match 76',           '2026-07-04 21:00:00+00', 'Lincoln Financial Field, Philadelphia'),
  -- M91  Jul 5 4pm ET   → 20:00 UTC
  ('Round of 16', 'W Match 77',         'W Match 80',           '2026-07-05 20:00:00+00', 'MetLife Stadium, East Rutherford'),
  -- M92  Jul 5 8pm ET   → 00:00 UTC Jul 6
  ('Round of 16', 'W Match 78',         'W Match 79',           '2026-07-06 00:00:00+00', 'Estadio Azteca, Mexico City'),
  -- M93  Jul 6 3pm ET   → 19:00 UTC
  ('Round of 16', 'W Match 81',         'W Match 84',           '2026-07-06 19:00:00+00', 'AT&T Stadium, Dallas'),
  -- M94  Jul 6 5pm ET   → 21:00 UTC
  ('Round of 16', 'W Match 82',         'W Match 83',           '2026-07-06 21:00:00+00', 'Lumen Field, Seattle'),
  -- M95  Jul 7 12pm ET  → 16:00 UTC
  ('Round of 16', 'W Match 85',         'W Match 88',           '2026-07-07 16:00:00+00', 'Mercedes-Benz Stadium, Atlanta'),
  -- M96  Jul 7 4pm ET   → 20:00 UTC
  ('Round of 16', 'W Match 86',         'W Match 87',           '2026-07-07 20:00:00+00', 'BC Place, Vancouver'),

  -- ── QUARTER-FINALS (Jul 9–11) ─────────────────────────────
  -- M97  Jul 9 4pm ET   → 20:00 UTC
  ('Quarterfinals', 'W Match 89',       'W Match 90',           '2026-07-09 20:00:00+00', 'Gillette Stadium, Boston'),
  -- M98  Jul 10 3pm ET  → 19:00 UTC
  ('Quarterfinals', 'W Match 91',       'W Match 92',           '2026-07-10 19:00:00+00', 'SoFi Stadium, Los Angeles'),
  -- M99  Jul 11 3pm ET  → 19:00 UTC
  ('Quarterfinals', 'W Match 93',       'W Match 94',           '2026-07-11 19:00:00+00', 'AT&T Stadium, Dallas'),
  -- M100 Jul 11 7pm ET  → 23:00 UTC
  ('Quarterfinals', 'W Match 95',       'W Match 96',           '2026-07-11 23:00:00+00', 'Hard Rock Stadium, Miami'),

  -- ── SEMI-FINALS (Jul 14–15) ───────────────────────────────
  -- M101 Jul 14 7pm ET  → 23:00 UTC
  ('Semifinals',  'W Match 97',         'W Match 98',           '2026-07-14 23:00:00+00', 'AT&T Stadium, Dallas'),
  -- M102 Jul 15 7pm ET  → 23:00 UTC
  ('Semifinals',  'W Match 99',         'W Match 100',          '2026-07-15 23:00:00+00', 'Mercedes-Benz Stadium, Atlanta'),

  -- ── THIRD PLACE (Jul 18) — 'Final' round ─────────────────
  -- M103 Jul 18 6pm ET  → 22:00 UTC
  ('Final',       'L Match 101',        'L Match 102',          '2026-07-18 22:00:00+00', 'Hard Rock Stadium, Miami'),

  -- ── FINAL (Jul 19) ───────────────────────────────────────
  -- M104 Jul 19 3pm ET  → 19:00 UTC
  ('Final',       'W Match 101',        'W Match 102',          '2026-07-19 19:00:00+00', 'MetLife Stadium, New Jersey')

) AS m(rnd, home, away, dt, venue)
JOIN public.rounds r ON r.name = m.rnd;
