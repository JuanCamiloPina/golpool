-- 016_add_audit_log.sql
-- Extend audit_log table for prediction save logging.
-- The table already exists from schema.sql (created at project init).
-- This migration adds the columns needed for the new save flow.

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS pool_id     UUID        REFERENCES public.pools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload     JSONB,
  ADD COLUMN IF NOT EXISTS ip_address  TEXT;

CREATE INDEX IF NOT EXISTS audit_log_pool_id_idx    ON public.audit_log (pool_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);

-- Allow pool admins to read audit logs for their pools
-- (service role handles inserts via admin client, bypassing RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'audit_log'
      AND policyname = 'Pool admins can read audit logs'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Pool admins can read audit logs"
        ON public.audit_log FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.pools
            WHERE pools.id = audit_log.pool_id
              AND pools.owner_id = auth.uid()
          )
        );
    $pol$;
  END IF;
END;
$$;
