-- Shift all existing prediction_deadline values forward by 45 minutes.
-- Previously set to 15 min before first match; this makes them 1 hour before.

UPDATE public.rounds
SET prediction_deadline = prediction_deadline + interval '45 minutes'
WHERE prediction_deadline IS NOT NULL;
