-- ============================================================
-- MIGRATION 12: RIS gets its own Categories (not shared with
-- Purchase Request's `categories` table)
-- Run this in Supabase SQL Editor AFTER migration 11.
--
-- Migration 11 pointed ris_inventory.category_id at the existing
-- `categories` table. This migration gives RIS its own separate
-- `ris_categories` table (same add/edit/delete logic as `categories`,
-- just its own data) and repoints ris_inventory to it.
-- ============================================================

create table ris_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into ris_categories (name) values
  ('Office Supplies'), ('Cleaning Supplies'), ('Electrical Supplies'),
  ('IT Equipment'), ('Others');

-- Repoint ris_inventory.category_id from `categories` to `ris_categories`.
-- Safe to run even if ris_inventory already has rows referencing
-- `categories` ids — those ids won't match any ris_categories row, so
-- the column is nulled out first to avoid an orphaned-reference error.
update ris_inventory set category_id = null;

alter table ris_inventory drop constraint if exists ris_inventory_category_id_fkey;
alter table ris_inventory add constraint ris_inventory_category_id_fkey
  foreign key (category_id) references ris_categories(id);

alter table ris_categories enable row level security;

create policy "anyone read ris_categories" on ris_categories
  for select
  using (true);

create policy "admin write ris_categories" on ris_categories
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- DONE. RIS Inventory items now categorize against ris_categories,
-- managed at /admin/ris-categories — completely separate from the
-- Purchase Request `categories` table.
-- ============================================================
