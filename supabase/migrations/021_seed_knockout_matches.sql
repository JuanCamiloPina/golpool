-- ============================================================
-- Migration 021 — Seed all knockout stage matches
--                 Round of 32, Round of 16, Quarterfinals,
--                 Semifinals, Third Place, and Final.
-- All match times are stored in UTC (+00).
-- home_team / away_team use bracket placeholders:
--   W Group X  = Winner of Group X
--   RU Group X = Runner-up of Group X
--   Best 3rd (X/Y/…) = Best third-placed from those groups
--   W Match NN = Winner of Match NN
--   L Match NN = Loser of Match NN (Third Place only)
-- Safe to run multiple times — skips insert if R32 already seeded.
-- ============================================================

-- ── 1. Update knockout round deadlines ───────────────────────
-- 1 hour before the first match of each round (UTC).

UPDATE public.rounds
SET prediction_deadline = '2026-06-28 18:00:00+00'  -- 1h before M73 (19:00 UTC)
WHERE name = 'Round of 32';

UPDATE public.rounds
SET prediction_deadline = '2026-07-05 18:00:00+00'  -- 1h before M89 (19:00 UTC)
WHERE name = 'Round of 16';

UPDATE public.rounds
SET prediction_deadline = '2026-07-10 18:00:00+00'  -- 1h before M97 (19:00 UTC)
WHERE name = 'Quarterfinals';

UPDATE public.rounds
SET prediction_deadline = '2026-07-14 22:00:00+00'  -- 1h before M101 (23:00 UTC)
WHERE name = 'Semifinals';

UPDATE public.rounds
SET prediction_deadline = '2026-07-18 22:00:00+00'  -- 1h before M103 Third Place (23:00 UTC)
WHERE name = 'Final';

-- ── 2. Insert knockout matches ────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.rounds r ON r.id = m.round_id
    WHERE r.name = 'Round of 32'
    LIMIT 1
  ) THEN
    RAISE NOTICE 'Knockout matches already seeded — skipping insert.';
    RETURN;
  END IF;

  INSERT INTO public.matches (round_id, home_team, away_team, match_date, venue)
  SELECT r.id, m.home, m.away, m.dt::timestamptz, 'TBD'
  FROM (VALUES

    -- ── Round of 32 (Jun 28 – Jul 3) ─────────────────────────
    -- M73
    ('Round of 32', 'RU Group A',          'RU Group B',            '2026-06-28 19:00:00+00'),
    -- M74
    ('Round of 32', 'W Group E',           'Best 3rd (A/B/C/D/F)', '2026-06-28 22:00:00+00'),
    -- M75
    ('Round of 32', 'W Group F',           'RU Group C',            '2026-06-29 19:00:00+00'),
    -- M76
    ('Round of 32', 'W Group C',           'RU Group F',            '2026-06-29 22:00:00+00'),
    -- M77
    ('Round of 32', 'W Group I',           'Best 3rd (C/D/F/G/H)', '2026-06-30 17:00:00+00'),
    -- M78
    ('Round of 32', 'RU Group E',          'RU Group I',            '2026-06-30 20:00:00+00'),
    -- M79
    ('Round of 32', 'W Group A',           'Best 3rd (C/E/F/H/I)', '2026-06-30 23:00:00+00'),
    -- M80
    ('Round of 32', 'W Group L',           'Best 3rd (E/H/I/J/K)', '2026-07-01 17:00:00+00'),
    -- M81
    ('Round of 32', 'W Group D',           'Best 3rd (B/E/F/I/J)', '2026-07-01 20:00:00+00'),
    -- M82
    ('Round of 32', 'W Group G',           'Best 3rd (A/E/H/I/J)', '2026-07-01 23:00:00+00'),
    -- M83
    ('Round of 32', 'RU Group K',          'RU Group L',            '2026-07-02 17:00:00+00'),
    -- M84
    ('Round of 32', 'W Group H',           'RU Group J',            '2026-07-02 20:00:00+00'),
    -- M85
    ('Round of 32', 'W Group B',           'Best 3rd (E/F/G/I/J)', '2026-07-02 23:00:00+00'),
    -- M86
    ('Round of 32', 'W Group J',           'RU Group H',            '2026-07-03 17:00:00+00'),
    -- M87
    ('Round of 32', 'W Group K',           'Best 3rd (D/E/I/J/L)', '2026-07-03 20:00:00+00'),
    -- M88
    ('Round of 32', 'RU Group D',          'RU Group G',            '2026-07-03 23:00:00+00'),

    -- ── Round of 16 (Jul 5–8) ────────────────────────────────
    -- M89
    ('Round of 16', 'W Match 73',          'W Match 76',            '2026-07-05 19:00:00+00'),
    -- M90
    ('Round of 16', 'W Match 74',          'W Match 75',            '2026-07-05 22:00:00+00'),
    -- M91
    ('Round of 16', 'W Match 77',          'W Match 80',            '2026-07-06 19:00:00+00'),
    -- M92
    ('Round of 16', 'W Match 78',          'W Match 79',            '2026-07-06 22:00:00+00'),
    -- M93
    ('Round of 16', 'W Match 81',          'W Match 84',            '2026-07-07 19:00:00+00'),
    -- M94
    ('Round of 16', 'W Match 82',          'W Match 83',            '2026-07-07 22:00:00+00'),
    -- M95
    ('Round of 16', 'W Match 85',          'W Match 88',            '2026-07-08 19:00:00+00'),
    -- M96
    ('Round of 16', 'W Match 86',          'W Match 87',            '2026-07-08 22:00:00+00'),

    -- ── Quarter-finals (Jul 10–11) ────────────────────────────
    -- M97
    ('Quarterfinals', 'W Match 89',        'W Match 90',            '2026-07-10 19:00:00+00'),
    -- M98
    ('Quarterfinals', 'W Match 91',        'W Match 92',            '2026-07-10 22:00:00+00'),
    -- M99
    ('Quarterfinals', 'W Match 93',        'W Match 94',            '2026-07-11 19:00:00+00'),
    -- M100
    ('Quarterfinals', 'W Match 95',        'W Match 96',            '2026-07-11 22:00:00+00'),

    -- ── Semi-finals (Jul 14–15) ───────────────────────────────
    -- M101
    ('Semifinals',  'W Match 97',          'W Match 98',            '2026-07-14 23:00:00+00'),
    -- M102
    ('Semifinals',  'W Match 99',          'W Match 100',           '2026-07-15 23:00:00+00'),

    -- ── Third Place (Jul 18) — shares 'Final' round ──────────
    -- M103
    ('Final',       'L Match 101',         'L Match 102',           '2026-07-18 23:00:00+00'),

    -- ── Final (Jul 19) ───────────────────────────────────────
    -- M104
    ('Final',       'W Match 101',         'W Match 102',           '2026-07-19 19:00:00+00')

  ) AS m(rnd, home, away, dt)
  JOIN public.rounds r ON r.name = m.rnd;

END $$;
