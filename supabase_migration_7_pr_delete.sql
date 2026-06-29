-- ============================================================
-- MIGRATION 7: Allow admin to delete Purchase Requests
-- Run this in Supabase SQL Editor AFTER migrations 1-6.
--
-- Migration 5 added SELECT/INSERT/UPDATE policies for purchase_requests
-- but missed a DELETE policy entirely — with RLS enabled and no policy,
-- Postgres denies the operation by default, so deletes silently affected
-- zero rows. This adds the missing policy (admin-only, matching the rest
-- of the admin-managed tables).
-- ============================================================

create policy "admin delete purchase_requests" on purchase_requests
  for delete using (is_admin());

-- ============================================================
-- DONE. pr_items cascade-deletes automatically (already on delete
-- cascade in the schema), so no separate policy/cleanup needed there.
-- ============================================================
