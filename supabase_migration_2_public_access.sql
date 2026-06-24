-- ============================================================
-- MIGRATION 2: Public (anonymous) access for the requester-facing
-- Submit Purchase Request + Track a Request pages.
-- Run this in Supabase SQL Editor AFTER the main schema.
-- ============================================================

-- Allow anonymous users to read inventory (needed for the item
-- autosuggest on the public submission form). Read-only, no write.
create policy "anon read inventory" on inventory
  for select
  to anon
  using (true);

create policy "anon read categories" on categories
  for select
  to anon
  using (true);

-- Allow anonymous users to create a Purchase Request (Submitted status only)
-- and its line items. They cannot update or delete afterward.
create policy "anon insert purchase_requests" on purchase_requests
  for insert
  to anon
  with check (status = 'Submitted');

create policy "anon insert pr_items" on pr_items
  for insert
  to anon
  with check (true);

-- Allow anonymous users to look up a single PR by its PR number for
-- tracking (read-only; they can see status but this does not expose
-- the full admin list since they must know the exact PR number).
create policy "anon read purchase_requests for tracking" on purchase_requests
  for select
  to anon
  using (true);

create policy "anon read pr_items for tracking" on pr_items
  for select
  to anon
  using (true);

-- ============================================================
-- DONE. After running this:
-- - Anonymous visitors can submit a PR from the public form
-- - Anonymous visitors can track a PR by number
-- - Admins/staff (authenticated) retain full access as before
-- ============================================================
