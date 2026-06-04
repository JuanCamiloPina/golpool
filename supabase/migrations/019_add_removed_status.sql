ALTER TABLE public.pool_members
  DROP CONSTRAINT IF EXISTS pool_members_status_check;

ALTER TABLE public.pool_members
  ADD CONSTRAINT pool_members_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'removed'));
