-- ============================================================
-- ██████╗  █████╗ ███╗   ██╗ ██████╗ ███████╗██████╗
-- ██╔══██╗██╔══██╗████╗  ██║██╔════╝ ██╔════╝██╔══██╗
-- ██║  ██║███████║██╔██╗ ██║██║  ███╗█████╗  ██████╔╝
-- ██║  ██║██╔══██║██║╚██╗██║██║   ██║██╔══╝  ██╔══██╗
-- ██████╔╝██║  ██║██║ ╚████║╚██████╔╝███████╗██║  ██║
-- ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝
-- ============================================================
--
--  !! WARNING: THIS FILE DELETES ALL DATA !!
--
--  This script drops every GolPool table and recreates the
--  schema from scratch. ALL users, pools, predictions, and
--  every other record will be permanently destroyed.
--
--  ONLY use this in local / development environments when
--  you deliberately want to wipe the database and start over.
--
--  NEVER run this on a production database.
--
--  After running this file you must also run schema.sql to
--  recreate the tables, policies, triggers, and seed data.
--
-- ============================================================


-- ============================================================
-- STEP 1: DROP (reverse dependency order)
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists public.notifications      cascade;
drop table if exists public.audit_log          cascade;
drop table if exists public.bonus_predictions  cascade;
drop table if exists public.predictions        cascade;
drop table if exists public.matches            cascade;
drop table if exists public.pool_members       cascade;
drop table if exists public.rounds             cascade;
drop table if exists public.pools              cascade;
drop table if exists public.profiles           cascade;


-- ============================================================
-- STEP 2: Rebuild
-- Run supabase/schema.sql now to recreate everything.
-- ============================================================
