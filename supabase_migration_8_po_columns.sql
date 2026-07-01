-- ============================================================
-- MIGRATION 8: Add missing purchase_orders columns
-- Run this in Supabase SQL Editor.
--
-- Adds pr_numbers, mayor_name, and bac_secretary_name columns
-- to purchase_orders. Safe to run even if some columns already exist.
-- ============================================================

alter table purchase_orders add column if not exists pr_numbers text;

alter table purchase_orders add column if not exists mayor_name text default 'Hon. ERICSON R. LOPEZ';

alter table purchase_orders add column if not exists bac_secretary_name text default 'NEMIA B. MONZONES';

-- ============================================================
-- DONE.
-- ============================================================
