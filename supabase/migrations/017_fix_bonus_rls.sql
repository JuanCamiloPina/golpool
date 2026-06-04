-- 017_fix_bonus_rls.sql
-- Fix bonus_predictions RLS: missing DELETE and UPDATE policies caused the
-- delete+insert save pattern to silently fail, leaving duplicate rows that
-- made picks appear to disappear on reload.

-- Allow users to delete their own bonus predictions (required by save flow)
CREATE POLICY "Users can delete their own bonus predictions"
  ON public.bonus_predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to update their own bonus predictions
CREATE POLICY "Users can update their own bonus predictions"
  ON public.bonus_predictions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Unique constraint prevents duplicate rows even if a bug re-introduces them
ALTER TABLE public.bonus_predictions
  ADD CONSTRAINT bonus_predictions_user_pool_question_unique
  UNIQUE (user_id, pool_id, question);
