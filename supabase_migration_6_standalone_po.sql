-- ============================================================
-- MIGRATION 6: Decouple Purchase Orders from Purchase Requests
-- Run this in Supabase SQL Editor AFTER migrations 1-5.
--
-- Purchase Orders are now created standalone (not auto-generated
-- from a Purchase Request's items). "PR No./s" becomes a free-text
-- reference field instead of being derived from the pr_id foreign key,
-- since one PO can reference multiple PRs (or none).
-- ============================================================

alter table purchase_orders add column if not exists pr_numbers text;

-- ============================================================
-- DONE. purchase_orders.pr_id is left untouched (still nullable) for
-- backward compatibility with existing POs that were generated from a
-- specific PR — new POs simply won't set it.
-- ============================================================
