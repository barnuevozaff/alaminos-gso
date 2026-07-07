-- ============================================================
-- MIGRATION 11: Requisition and Issue Slip (RIS) feature
-- Run this in Supabase SQL Editor AFTER migrations 1-10.
--
-- Adds a second, independent workflow parallel to Purchase Requests:
-- the public/other-offices can requisition items already in GSO stock
-- (Appendix 48 form). This uses its OWN inventory table (ris_inventory),
-- separate from the `inventory` table used by Purchase Requests, but
-- shares the existing `categories` table for category labels.
-- ============================================================

-- ============================================================
-- 1. RIS INVENTORY (separate stock pool from `inventory`)
-- ============================================================
create table ris_inventory (
  id uuid primary key default gen_random_uuid(),
  item_code text unique,
  item_name text not null,
  category_id uuid references categories(id),
  unit text not null default 'piece',
  quantity numeric not null default 0,
  reorder_level numeric not null default 10,
  status text generated always as (
    case when quantity <= 0 then 'Out of Stock'
         when quantity <= reorder_level then 'Low Stock'
         else 'In Stock' end
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-generate stock numbers like RI-00001
create sequence ris_inventory_code_seq start 1;

create or replace function set_ris_item_code()
returns trigger as $$
begin
  if new.item_code is null then
    new.item_code := 'RI-' || lpad(nextval('ris_inventory_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_ris_item_code
  before insert on ris_inventory
  for each row execute function set_ris_item_code();

create trigger trg_ris_inventory_updated_at
  before update on ris_inventory
  for each row execute function moddatetime_simple();

-- ============================================================
-- 2. RIS STOCK MOVEMENTS (audit history for ris_inventory changes)
-- ============================================================
create table ris_stock_movements (
  id uuid primary key default gen_random_uuid(),
  ris_inventory_id uuid references ris_inventory(id) on delete cascade,
  movement_type text not null check (movement_type in ('In','Out','Adjustment','Transfer')),
  quantity numeric not null,
  reference text,
  performed_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- 3. REQUISITION AND ISSUE SLIPS (header)
-- ============================================================
create table requisition_issue_slips (
  id uuid primary key default gen_random_uuid(),
  ris_number text unique,
  ris_date date not null default current_date,
  office text not null,
  requester_id uuid references profiles(id),
  requester_name text not null,
  fund text,
  division text,
  fpp_code text,
  purpose text,
  status text not null default 'Submitted' check (status in ('Submitted','Approved','Rejected')),
  rejection_reason text,
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references profiles(id),
  created_at timestamptz default now()
);

create sequence ris_number_seq start 1;

create or replace function set_ris_number()
returns trigger as $$
begin
  if new.ris_number is null then
    new.ris_number := 'RIS-' || extract(year from current_date) || '-' ||
                       lpad(nextval('ris_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_ris_number
  before insert on requisition_issue_slips
  for each row execute function set_ris_number();

-- ============================================================
-- 4. RIS ITEMS (line items, linked to ris_inventory)
-- ============================================================
create table ris_items (
  id uuid primary key default gen_random_uuid(),
  ris_id uuid references requisition_issue_slips(id) on delete cascade,
  ris_inventory_id uuid references ris_inventory(id),
  stock_no text,
  description text not null,
  unit text not null,
  quantity numeric not null check (quantity > 0),
  issued_quantity numeric,
  remarks text,
  sort_order int default 0
);

-- ============================================================
-- 5. APPROVE / REJECT RPCs (mirrors approve/reject_purchase_request,
--    race-safe from the start — locks the parent row and checks status
--    before deducting stock)
-- ============================================================
create or replace function approve_requisition_issue_slip(p_ris_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_item record;
  v_current_qty numeric;
  v_current_status text;
  v_ris_number text;
begin
  if not is_admin() then
    raise exception 'Forbidden: admin only';
  end if;

  select status into v_current_status
  from requisition_issue_slips
  where id = p_ris_id
  for update;

  if v_current_status is null then
    raise exception 'Requisition and Issue Slip not found';
  end if;

  if v_current_status != 'Submitted' then
    raise exception 'Requisition and Issue Slip is already % — cannot approve again', v_current_status;
  end if;

  for v_item in
    select ri.id, ri.ris_inventory_id, ri.quantity, ri.description
    from ris_items ri
    where ri.ris_id = p_ris_id
      and ri.ris_inventory_id is not null
  loop
    select quantity into v_current_qty
    from ris_inventory
    where id = v_item.ris_inventory_id
    for update;

    if v_current_qty is null then
      raise exception 'RIS inventory item not found for "%"', v_item.description;
    end if;

    if v_current_qty < v_item.quantity then
      raise exception 'Insufficient stock for "%" — available: %, requested: %',
        v_item.description, v_current_qty, v_item.quantity;
    end if;

    update ris_inventory
      set quantity = quantity - v_item.quantity
      where id = v_item.ris_inventory_id;

    update ris_items
      set issued_quantity = v_item.quantity
      where id = v_item.id;

    insert into ris_stock_movements (ris_inventory_id, movement_type, quantity, reference, performed_by, notes)
      values (v_item.ris_inventory_id, 'Out', v_item.quantity,
              (select ris_number from requisition_issue_slips where id = p_ris_id),
              p_user_id, v_item.description);
  end loop;

  update requisition_issue_slips
    set status = 'Approved', decided_at = now(), decided_by = p_user_id
    where id = p_ris_id
    returning ris_number into v_ris_number;

  insert into audit_logs (action, description, performed_by)
    values ('RIS_APPROVED', 'Approved ' || v_ris_number, p_user_id);
end;
$$;

create or replace function reject_requisition_issue_slip(p_ris_id uuid, p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
as $$
declare
  v_current_status text;
  v_ris_number text;
begin
  if not is_admin() then
    raise exception 'Forbidden: admin only';
  end if;

  select status into v_current_status
  from requisition_issue_slips
  where id = p_ris_id
  for update;

  if v_current_status is null then
    raise exception 'Requisition and Issue Slip not found';
  end if;

  if v_current_status != 'Submitted' then
    raise exception 'Requisition and Issue Slip is already % — cannot reject again', v_current_status;
  end if;

  update requisition_issue_slips
    set status = 'Rejected', decided_at = now(), decided_by = p_user_id, rejection_reason = p_reason
    where id = p_ris_id
    returning ris_number into v_ris_number;

  insert into audit_logs (action, description, performed_by)
    values ('RIS_REJECTED', 'Rejected ' || v_ris_number, p_user_id);
end;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
alter table ris_inventory enable row level security;
alter table ris_stock_movements enable row level security;
alter table requisition_issue_slips enable row level security;
alter table ris_items enable row level security;

-- RIS inventory: anyone (including anon, for the public item-picker) can
-- read; only admin can write — same split as `inventory`.
create policy "anyone read ris_inventory" on ris_inventory
  for select
  using (true);

create policy "admin write ris_inventory" on ris_inventory
  for all using (is_admin()) with check (is_admin());

-- RIS stock movements: admin-only, matches `stock_movements`.
create policy "authenticated read ris_stock_movements" on ris_stock_movements
  for select using (auth.role() = 'authenticated');

create policy "admin write ris_stock_movements" on ris_stock_movements
  for all using (is_admin()) with check (is_admin());

-- Requisition and Issue Slips: staff see/create only their own (mirrors
-- purchase_requests); admin sees/manages all. Public submissions always
-- have requester_id null, so in practice only admins see the public queue
-- today — same behavior purchase_requests already has.
create policy "read own ris or admin" on requisition_issue_slips
  for select using (is_admin() or requester_id = auth.uid());

create policy "admin update ris" on requisition_issue_slips
  for update using (is_admin()) with check (is_admin());

create policy "admin delete ris" on requisition_issue_slips
  for delete using (is_admin());

create policy "read own ris_items or admin" on ris_items
  for select using (
    is_admin() or exists (
      select 1 from requisition_issue_slips r
      where r.id = ris_items.ris_id and r.requester_id = auth.uid()
    )
  );

-- Anonymous public submission (mirrors migration 2's PR policies)
create policy "anon insert requisition_issue_slips" on requisition_issue_slips
  for insert
  to anon
  with check (status = 'Submitted');

create policy "anon insert ris_items" on ris_items
  for insert
  to anon
  with check (true);

create policy "anon read requisition_issue_slips for tracking" on requisition_issue_slips
  for select
  to anon
  using (true);

create policy "anon read ris_items for tracking" on ris_items
  for select
  to anon
  using (true);

-- Authenticated (logged-in staff/admin) insert path, for parity with
-- purchase_requests' "insert own or admin" policy (not used by any admin
-- create-flow yet, but keeps the policy shape consistent and future-proof).
create policy "insert own ris or admin" on requisition_issue_slips
  for insert
  to authenticated
  with check (is_admin() or requester_id = auth.uid());

create policy "insert own ris_items or admin" on ris_items
  for insert
  to authenticated
  with check (
    is_admin() or exists (
      select 1 from requisition_issue_slips r
      where r.id = ris_items.ris_id and r.requester_id = auth.uid()
    )
  );

-- ============================================================
-- DONE. After running this:
-- - Admins can manage RIS inventory at /admin/ris-inventory
-- - The public can submit a RIS at /requisition-issue-slip and track it
--   at /track-ris
-- - Admins review/approve/reject submitted slips at /admin/ris — approving
--   deducts the requested quantities from ris_inventory (separate stock
--   pool from Purchase Request's `inventory` table) and writes to
--   ris_stock_movements + audit_logs, same as Purchase Requests do.
-- ============================================================
