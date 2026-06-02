-- ============================================================
-- Migration 014 — Member removal + pool archiving
-- ============================================================


-- ── Feature 1: Pool owner can delete predictions when removing a member ──
--
-- The pool_members DELETE policy already exists from schema.sql:
-- "Users and owners can remove memberships" covers owner deletion.
-- We only need DELETE policies for the linked prediction tables.

create policy "Pool owners can delete member predictions"
  on public.predictions for delete
  using (
    exists (
      select 1 from public.pools
      where id = predictions.pool_id and owner_id = auth.uid()
    )
  );

create policy "Pool owners can delete member bonus predictions"
  on public.bonus_predictions for delete
  using (
    exists (
      select 1 from public.pools
      where id = bonus_predictions.pool_id and owner_id = auth.uid()
    )
  );


-- ── Feature 2: Soft-delete (archive) pools ────────────────────────────
--
-- Archived pools are hidden from all member-facing views but no data
-- is deleted — the pool and all its predictions remain queryable by
-- the owner through the admin interface if needed later.

alter table public.pools
  add column if not exists is_archived boolean not null default false;
