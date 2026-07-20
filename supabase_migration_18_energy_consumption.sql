-- ============================================================
-- MIGRATION 18: Energy Consumption module
-- Run this in Supabase SQL Editor AFTER migrations 1-17.
--
-- New, independent domain (electricity account/bill monitoring) — not
-- connected to Purchase Requests, RIS, Inventory, or Facility Booking.
-- Admin-only: accounts and their monthly bills are entered manually by
-- the GSO administrator. No public-facing page for this module.
-- ============================================================

-- ============================================================
-- 1. ENERGY ACCOUNTS
-- ============================================================
create table energy_accounts (
  id uuid primary key default gen_random_uuid(),
  account_number text not null unique,
  account_name text,
  location text not null,
  meter_number text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. ENERGY BILLS (one row per account per billing month)
-- ============================================================
create table energy_bills (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references energy_accounts(id) on delete cascade not null,
  billing_month int not null check (billing_month between 1 and 12),
  billing_year int not null check (billing_year between 2000 and 2100),
  amount numeric(12,2) not null check (amount >= 0),
  remarks text,
  created_at timestamptz default now(), -- "Date Added"
  unique (account_id, billing_month, billing_year)
);

create index energy_bills_account_period_idx on energy_bills (account_id, billing_year, billing_month);

-- ============================================================
-- 3. RLS — admin-only, both tables (no public read/write policy,
--    unlike facilities which the public booking form reads directly)
-- ============================================================
alter table energy_accounts enable row level security;
alter table energy_bills enable row level security;

create policy "admin all energy_accounts" on energy_accounts
  for all using (is_admin()) with check (is_admin());

create policy "admin all energy_bills" on energy_bills
  for all using (is_admin()) with check (is_admin());
