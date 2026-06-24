-- ============================================================
-- MIGRATION 3:
-- 1. Live-pricing view for PR/PO items (always reflects current
--    Inventory price, never a frozen snapshot)
-- 2. Admin-configurable PDF signatories (Mayor, GSO, Treasurer)
-- 3. Supporting indexes for category filtering
-- Run this in Supabase SQL Editor AFTER migrations 1 and 2.
-- ============================================================

-- ---------- 1. Live pricing view ----------
-- pr_items still stores quantity and a reference to inventory_id.
-- unit_cost/total_cost stored on the row are historical fallback only
-- (used for custom/off-catalog items with no inventory_id).
-- This view always prefers the CURRENT inventory price when available.
create or replace view pr_items_live as
select
  pri.id,
  pri.pr_id,
  pri.inventory_id,
  pri.sort_order,
  coalesce(inv.item_name, pri.item_description) as item_description,
  coalesce(inv.unit, pri.unit) as unit,
  pri.quantity,
  coalesce(inv.unit_cost, pri.unit_cost) as unit_cost,
  pri.quantity * coalesce(inv.unit_cost, pri.unit_cost) as total_cost,
  inv.item_code as item_code
from pr_items pri
left join inventory inv on inv.id = pri.inventory_id;

create or replace view po_items_live as
select
  poi.id,
  poi.po_id,
  poi.sort_order,
  poi.stock_property_no,
  coalesce(inv.item_name, poi.description) as description,
  coalesce(inv.unit, poi.unit) as unit,
  poi.quantity,
  coalesce(inv.unit_cost, poi.unit_cost) as unit_cost,
  poi.quantity * coalesce(inv.unit_cost, poi.unit_cost) as amount
from po_items poi
left join inventory inv on inv.item_code = poi.stock_property_no;

-- Allow anon + authenticated to read these views (RLS on base tables
-- still applies underneath since views run with the caller's permissions)
grant select on pr_items_live to anon, authenticated;
grant select on po_items_live to anon, authenticated;

-- ---------- 2. Admin-configurable signatories ----------
create table if not exists pdf_signatories (
  id int primary key default 1,
  municipal_mayor text,
  general_services_officer text,
  municipal_treasurer text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into pdf_signatories (id, municipal_mayor, general_services_officer, municipal_treasurer)
values (1, 'Hon. ERICSON R. LOPEZ', 'FLORENTINO J. DESTACAMENTO', 'ROWENA C. LANDICHO')
on conflict (id) do nothing;

alter table pdf_signatories enable row level security;

create policy "anyone can read signatories" on pdf_signatories
  for select to anon, authenticated using (true);

create policy "authenticated can update signatories" on pdf_signatories
  for update to authenticated using (true);

-- ---------- 3. Indexes to support category filtering & search ----------
create index if not exists idx_inventory_category on inventory(category_id);
create index if not exists idx_inventory_name on inventory(item_name);

-- ============================================================
-- DONE.
-- ============================================================
