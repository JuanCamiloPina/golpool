ALTER TABLE public.pools
  ADD COLUMN IF NOT EXISTS auto_approve boolean NOT NULL DEFAULT false;
