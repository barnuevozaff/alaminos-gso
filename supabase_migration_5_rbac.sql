-- ============================================================
-- MIGRATION 5: Real role-based access control (staff vs admin)
-- Run this in Supabase SQL Editor AFTER migrations 1-4.
--
-- Staff: can create Purchase Requests and see only their own;
--        view-only on Inventory/Categories; no access at all to
--        Purchase Orders, AIR, Audit Logs, Settings.
-- Admin: unrestricted, as today.
-- ============================================================

-- ---------- Helper: is the current user an admin? ----------
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ---------- PURCHASE REQUESTS ----------
drop policy if exists "authenticated read purchase_requests" on purchase_requests;
drop policy if exists "authenticated write purchase_requests" on purchase_requests;

create policy "read own or admin" on purchase_requests
  for select
  using (is_admin() or requester_id = auth.uid());

create policy "insert own or admin" on purchase_requests
  for insert
  with check (is_admin() or requester_id = auth.uid());

create policy "update own draft or admin" on purchase_requests
  for update
  using (is_admin() or (requester_id = auth.uid() and status = 'Draft'))
  with check (is_admin() or (requester_id = auth.uid() and status in ('Draft', 'Submitted')));

-- ---------- PR ITEMS (scoped through parent PR ownership) ----------
drop policy if exists "authenticated read pr_items" on pr_items;
drop policy if exists "authenticated write pr_items" on pr_items;

create policy "read own pr_items or admin" on pr_items
  for select
  using (
    is_admin() or exists (
      select 1 from purchase_requests pr
      where pr.id = pr_items.pr_id and pr.requester_id = auth.uid()
    )
  );

create policy "insert own draft pr_items or admin" on pr_items
  for insert
  with check (
    is_admin() or exists (
      select 1 from purchase_requests pr
      where pr.id = pr_items.pr_id and pr.requester_id = auth.uid() and pr.status = 'Draft'
    )
  );

create policy "update own draft pr_items or admin" on pr_items
  for update
  using (
    is_admin() or exists (
      select 1 from purchase_requests pr
      where pr.id = pr_items.pr_id and pr.requester_id = auth.uid() and pr.status = 'Draft'
    )
  );

create policy "delete own draft pr_items or admin" on pr_items
  for delete
  using (
    is_admin() or exists (
      select 1 from purchase_requests pr
      where pr.id = pr_items.pr_id and pr.requester_id = auth.uid() and pr.status = 'Draft'
    )
  );

-- ---------- INVENTORY (view-only for staff) ----------
drop policy if exists "authenticated write inventory" on inventory;

create policy "admin write inventory" on inventory
  for all
  using (is_admin())
  with check (is_admin());

-- ---------- CATEGORIES (view-only for staff) ----------
drop policy if exists "authenticated write categories" on categories;

create policy "admin write categories" on categories
  for all
  using (is_admin())
  with check (is_admin());

-- ---------- PURCHASE ORDERS / PO ITEMS / AIR / AUDIT LOGS (admin-only, no staff access at all) ----------
drop policy if exists "authenticated read purchase_orders" on purchase_orders;
drop policy if exists "authenticated write purchase_orders" on purchase_orders;
create policy "admin only purchase_orders" on purchase_orders
  for all using (is_admin()) with check (is_admin());

drop policy if exists "authenticated read po_items" on po_items;
drop policy if exists "authenticated write po_items" on po_items;
create policy "admin only po_items" on po_items
  for all using (is_admin()) with check (is_admin());

drop policy if exists "authenticated read air" on acceptance_inspection_reports;
drop policy if exists "authenticated write air" on acceptance_inspection_reports;
create policy "admin only air" on acceptance_inspection_reports
  for all using (is_admin()) with check (is_admin());

drop policy if exists "authenticated read audit_logs" on audit_logs;
drop policy if exists "authenticated write audit_logs" on audit_logs;
create policy "admin only audit_logs" on audit_logs
  for all using (is_admin()) with check (is_admin());

-- ---------- PDF SIGNATORIES ----------
-- Public/anon read stays as-is (the public Track Request page's PDF download
-- depends on it) — only tighten who can change the signatory names.
drop policy if exists "authenticated can update signatories" on pdf_signatories;
create policy "admin can update signatories" on pdf_signatories
  for update to authenticated using (is_admin());

-- ---------- APPROVE / REJECT: admin-only ----------
-- (builds on the stock-sufficiency check already added to approve_purchase_request
-- earlier — this adds the missing role check on top of it)
create or replace function approve_purchase_request(p_pr_id uuid, p_user_id uuid)
returns void as $$
declare
  v_pr_number text;
  item record;
  v_current_qty numeric;
begin
  if not is_admin() then
    raise exception 'Only admins can approve purchase requests';
  end if;

  for item in
    select pri.inventory_id, pri.quantity, pri.item_description
    from pr_items pri
    where pri.pr_id = p_pr_id and pri.inventory_id is not null
  loop
    select quantity into v_current_qty from inventory where id = item.inventory_id for update;

    if v_current_qty < item.quantity then
      raise exception 'Insufficient stock for "%": available %, requested %',
        item.item_description, v_current_qty, item.quantity;
    end if;

    update inventory
      set quantity = quantity - item.quantity
      where id = item.inventory_id;

    insert into stock_movements (inventory_id, movement_type, quantity, reference, performed_by, notes)
      values (item.inventory_id, 'Out', item.quantity, 'PR Approval', p_user_id, item.item_description);
  end loop;

  update purchase_requests
    set status = 'Approved', decided_at = now(), decided_by = p_user_id
    where id = p_pr_id
    returning pr_number into v_pr_number;

  insert into audit_logs (action, description, performed_by)
    values ('PR_APPROVED', 'Approved ' || v_pr_number, p_user_id);
end;
$$ language plpgsql security definer;

create or replace function reject_purchase_request(p_pr_id uuid, p_user_id uuid, p_reason text)
returns void as $$
declare
  v_pr_number text;
begin
  if not is_admin() then
    raise exception 'Only admins can reject purchase requests';
  end if;

  update purchase_requests
    set status = 'Rejected', decided_at = now(), decided_by = p_user_id, rejection_reason = p_reason
    where id = p_pr_id
    returning pr_number into v_pr_number;

  insert into audit_logs (action, description, performed_by)
    values ('PR_REJECTED', 'Rejected ' || v_pr_number, p_user_id);
end;
$$ language plpgsql security definer;

-- ============================================================
-- DONE. After running this:
-- - Staff accounts only see/create their own Purchase Requests.
-- - Staff can view Inventory/Categories but not add/edit/delete.
-- - Staff have no data access to Purchase Orders, AIR, Audit Logs,
--   or Settings (pdf_signatories writes) at all.
-- - Only admin can approve/reject, even by calling the RPC directly.
--
-- NOTE: until the matching frontend changes (Step 2) are applied,
-- a staff user may still SEE buttons for admin-only actions (Generate
-- PO, Issue PO, Approve/Reject, etc.) — clicking them will now fail
-- with a clear permission error instead of silently succeeding. This
-- is expected and temporary.
-- ============================================================
