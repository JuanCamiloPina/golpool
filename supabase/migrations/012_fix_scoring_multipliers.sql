-- ============================================================
-- Migration 012 — Fix knockout scoring multipliers to ×2
-- ============================================================
-- Previous schema had escalating multipliers per round
-- (R32=2, R16=3, QF=4, SF=5, Final=10).
--
-- Correct rule: ALL knockout rounds use ×2.
-- Base points (×1): correct result=5, each goal=2, goal diff=1
-- Knockout (×2):    correct result=10, each goal=4, goal diff=2
-- ============================================================

update public.rounds
set scoring_multiplier = 2
where name in (
  'Round of 32',
  'Round of 16',
  'Quarterfinals',
  'Semifinals',
  'Final'
);
