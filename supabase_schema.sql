-- ============================================================
-- ALAMINOS GSO — Purchase Request & Inventory Management System
-- Complete Supabase schema
-- Run this entire file in Supabase SQL Editor (one paste, one run)
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('admin','staff')),
  department text,
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    new.raw_user_meta_data->>'department'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 2. CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into categories (name) values
  ('Office Supplies'), ('Cleaning Supplies'), ('Electrical Supplies'),
  ('IT Equipment'), ('Others');

-- ============================================================
-- 3. INVENTORY
-- ============================================================
create table inventory (
  id uuid primary key default gen_random_uuid(),
  item_code text unique,
  item_name text not null,
  category_id uuid references categories(id),
  unit text not null default 'piece',
  quantity numeric not null default 0,
  unit_cost numeric not null default 0,
  reorder_level numeric not null default 10,
  status text generated always as (
    case when quantity <= 0 then 'Out of Stock'
         when quantity <= reorder_level then 'Low Stock'
         else 'In Stock' end
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-generate item codes like ITM-00001
create sequence inventory_code_seq start 1;

create or replace function set_item_code()
returns trigger as $$
begin
  if new.item_code is null then
    new.item_code := 'ITM-' || lpad(nextval('inventory_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_item_code
  before insert on inventory
  for each row execute function set_item_code();

-- updated_at helper (must be defined before the trigger that uses it)
create or replace function moddatetime_simple()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_inventory_updated_at
  before update on inventory
  for each row execute function moddatetime_simple();

-- ============================================================
-- 4. STOCK MOVEMENTS (audit history for inventory changes)
-- ============================================================
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references inventory(id) on delete cascade,
  movement_type text not null check (movement_type in ('In','Out','Adjustment','Transfer')),
  quantity numeric not null,
  reference text,
  performed_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- 5. PURCHASE REQUESTS
-- ============================================================
create table purchase_requests (
  id uuid primary key default gen_random_uuid(),
  pr_number text unique,
  pr_date date not null default current_date,
  department text not null,
  requester_id uuid references profiles(id),
  requester_name text not null,
  purpose text,
  fund text default 'General Fund',
  status text not null default 'Draft' check (status in ('Draft','Submitted','Approved','Rejected','Completed')),
  rejection_reason text,
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references profiles(id),
  created_at timestamptz default now()
);

create sequence pr_number_seq start 1;

create or replace function set_pr_number()
returns trigger as $$
begin
  if new.pr_number is null then
    new.pr_number := 'PR-' || extract(year from current_date) || '-' ||
                      lpad(nextval('pr_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_pr_number
  before insert on purchase_requests
  for each row execute function set_pr_number();

-- ============================================================
-- 6. PURCHASE REQUEST ITEMS (line items, optionally linked to inventory)
-- ============================================================
create table pr_items (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid references purchase_requests(id) on delete cascade,
  inventory_id uuid references inventory(id),
  item_code text,
  item_description text not null,
  unit text not null,
  quantity numeric not null check (quantity > 0),
  unit_cost numeric not null default 0,
  total_cost numeric generated always as (quantity * unit_cost) stored,
  sort_order int default 0
);

-- ============================================================
-- 7. PURCHASE ORDERS (maps to "PURCHASE ORDER" sheet in template)
-- ============================================================
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text unique,
  pr_id uuid references purchase_requests(id),
  po_date date not null default current_date,
  supplier text,
  address text default 'ALAMINOS, LAGUNA',
  tin text,
  contact_number text,
  mode_of_procurement text,
  place_of_delivery text default 'Municipality of Alaminos, Laguna',
  delivery_term text default '7 working Days',
  date_of_delivery date,
  payment_term text default 'Cash',
  bac_resolution_no text,
  bac_series_year text,
  status text not null default 'Draft' check (status in ('Draft','Issued','Acknowledged')),
  mayor_name text default 'Hon. ERICSON R. LOPEZ',
  bac_secretary_name text default 'NEMIA B. MONZONES',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create sequence po_number_seq start 1;

create or replace function set_po_number()
returns trigger as $$
begin
  if new.po_number is null then
    new.po_number := 'PO-' || extract(year from current_date) || '-' ||
                       lpad(nextval('po_number_seq')::text, 5, '0');
  end if;
  if new.bac_series_year is null then
    new.bac_series_year := extract(year from current_date)::text;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_po_number
  before insert on purchase_orders
  for each row execute function set_po_number();

-- ============================================================
-- 8. PURCHASE ORDER ITEMS
-- ============================================================
create table po_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid references purchase_orders(id) on delete cascade,
  stock_property_no text,
  unit text not null,
  description text not null,
  quantity numeric not null check (quantity > 0),
  unit_cost numeric not null default 0,
  amount numeric generated always as (quantity * unit_cost) stored,
  sort_order int default 0
);

-- ============================================================
-- 9. ACCEPTANCE AND INSPECTION REPORTS (AIR — maps to "AIR" sheet)
-- ============================================================
create table acceptance_inspection_reports (
  id uuid primary key default gen_random_uuid(),
  air_number text unique,
  po_id uuid references purchase_orders(id),
  air_date date not null default current_date,
  requisitioning_office text,
  invoice_no text,
  invoice_date date,
  acceptance_type text check (acceptance_type in ('Complete','Partial')) default 'Complete',
  partial_notes text,
  recipient_name text default 'DIVINA GLORIA M. PAMPOLINA',
  recipient_title text default 'Supply Officer III',
  inspector_1_name text default 'CHRISTIAN V. SABINOSA',
  inspector_1_title text default 'MDRRMO III',
  inspector_2_name text default 'CYRIL ANDREA V. MISTA',
  inspector_2_title text default 'Agriculturist II',
  inspector_3_name text default 'KERR P. ESPINOZA',
  inspector_3_title text default 'Information System Analyst I',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create sequence air_number_seq start 1;

create or replace function set_air_number()
returns trigger as $$
begin
  if new.air_number is null then
    new.air_number := 'AIR-' || extract(year from current_date) || '-' ||
                        lpad(nextval('air_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_air_number
  before insert on acceptance_inspection_reports
  for each row execute function set_air_number();

-- ============================================================
-- 10. AUDIT LOGS
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  description text not null,
  performed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- 11. BUSINESS LOGIC FUNCTIONS
-- ============================================================

-- Approve PR: deducts stock for linked inventory items + logs audit + writes stock_movements
create or replace function approve_purchase_request(p_pr_id uuid, p_user_id uuid)
returns void as $$
declare
  v_pr_number text;
  item record;
  v_current_qty numeric;
begin
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
  update purchase_requests
    set status = 'Rejected', decided_at = now(), decided_by = p_user_id, rejection_reason = p_reason
    where id = p_pr_id
    returning pr_number into v_pr_number;

  insert into audit_logs (action, description, performed_by)
    values ('PR_REJECTED', 'Rejected ' || v_pr_number, p_user_id);
end;
$$ language plpgsql security definer;

-- ============================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table inventory enable row level security;
alter table stock_movements enable row level security;
alter table purchase_requests enable row level security;
alter table pr_items enable row level security;
alter table purchase_orders enable row level security;
alter table po_items enable row level security;
alter table acceptance_inspection_reports enable row level security;
alter table audit_logs enable row level security;

-- All authenticated users can read everything (internal single-org system)
create policy "authenticated read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "authenticated read categories" on categories for select using (auth.role() = 'authenticated');
create policy "authenticated read inventory" on inventory for select using (auth.role() = 'authenticated');
create policy "authenticated read stock_movements" on stock_movements for select using (auth.role() = 'authenticated');
create policy "authenticated read purchase_requests" on purchase_requests for select using (auth.role() = 'authenticated');
create policy "authenticated read pr_items" on pr_items for select using (auth.role() = 'authenticated');
create policy "authenticated read purchase_orders" on purchase_orders for select using (auth.role() = 'authenticated');
create policy "authenticated read po_items" on po_items for select using (auth.role() = 'authenticated');
create policy "authenticated read air" on acceptance_inspection_reports for select using (auth.role() = 'authenticated');
create policy "authenticated read audit_logs" on audit_logs for select using (auth.role() = 'authenticated');

-- Authenticated users can write (single internal org; role-specific restriction can be tightened later)
create policy "authenticated write categories" on categories for all using (auth.role() = 'authenticated');
create policy "authenticated write inventory" on inventory for all using (auth.role() = 'authenticated');
create policy "authenticated write stock_movements" on stock_movements for all using (auth.role() = 'authenticated');
create policy "authenticated write purchase_requests" on purchase_requests for all using (auth.role() = 'authenticated');
create policy "authenticated write pr_items" on pr_items for all using (auth.role() = 'authenticated');
create policy "authenticated write purchase_orders" on purchase_orders for all using (auth.role() = 'authenticated');
create policy "authenticated write po_items" on po_items for all using (auth.role() = 'authenticated');
create policy "authenticated write air" on acceptance_inspection_reports for all using (auth.role() = 'authenticated');
create policy "authenticated write audit_logs" on audit_logs for all using (auth.role() = 'authenticated');
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- ============================================================
-- 13. SEED INVENTORY (optional starter data, safe to delete)
-- ============================================================
insert into inventory (item_name, category_id, unit, quantity, unit_cost, reorder_level)
select 'Bond Paper', id, 'ream', 23, 180.00, 10 from categories where name = 'Office Supplies';

insert into inventory (item_name, category_id, unit, quantity, unit_cost, reorder_level)
select 'Paper Clip Big', id, 'piece', 36, 5.00, 10 from categories where name = 'Office Supplies';

-- ============================================================
-- DONE. After running this, create your first admin user via
-- Supabase Authentication tab, then run:
--   update profiles set role = 'admin' where id = '<the-user-uuid>';
-- ============================================================
