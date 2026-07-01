-- ============================================================
-- MIGRATION 9: Remove Acceptance & Inspection Reports (AIR)
-- Run this in Supabase SQL Editor.
--
-- AIR is not used in the GSO workflow. Dropping the table
-- removes the foreign key constraint that was blocking
-- deletion of Purchase Orders.
-- ============================================================

drop table if exists acceptance_inspection_reports cascade;

-- ============================================================
-- DONE. Purchase Orders can now be deleted without constraint errors.
-- ============================================================
