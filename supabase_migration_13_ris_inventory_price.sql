-- ============================================================
-- MIGRATION 13: RIS Inventory gets a Price field (replacing the
-- Reorder Level input in the Add/Edit form)
-- Run this in Supabase SQL Editor AFTER migration 12.
--
-- The Reorder Level column stays in the database (it's still used
-- internally by the low-stock status calculation, defaulting to 10)
-- but is no longer shown/editable in the RIS Inventory form — replaced
-- with a Price (unit cost) field, same concept as Purchase Request's
-- inventory.
-- ============================================================

alter table ris_inventory add column if not exists unit_cost numeric not null default 0;

-- ============================================================
-- DONE. RIS Inventory items can now have a price, shown in the
-- inventory list and Add/Edit form at /admin/ris-inventory.
-- ============================================================
