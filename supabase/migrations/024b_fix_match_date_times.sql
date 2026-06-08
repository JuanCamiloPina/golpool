-- ============================================================
-- Migration 024b — Combine match_date + match_time into a
--                  single correct UTC timestamptz.
--
-- Migration 023 stored match_date as just the date (midnight
-- UTC). This update folds the time back in so match_date
-- becomes the full UTC kickoff timestamp.
-- ============================================================

UPDATE public.matches
SET match_date = (match_date::date::text || 'T' || match_time::text || '+00:00')::timestamptz
WHERE match_time IS NOT NULL;
