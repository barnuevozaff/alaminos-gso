-- ============================================================
-- MIGRATION 15: Auto-generated Serial No. for the RSMI
-- (Report of Supplies and Materials Issued) print preview
-- Run this in Supabase SQL Editor AFTER migration 14.
--
-- The RSMI report itself isn't a stored record (it's computed on
-- the fly from ris_items for a chosen date range), but the printed
-- form still needs a unique Serial No. like RIS/PO documents do.
-- This adds a sequence + RPC that hands out the next serial —
-- admin-only, same guard as approve/reject RPCs.
-- ============================================================

create sequence if not exists rsmi_serial_seq start 1;

create or replace function next_rsmi_serial()
returns text
language plpgsql
security definer
as $$
begin
  if not is_admin() then
    raise exception 'Forbidden: admin only';
  end if;

  return 'RSMI-' || extract(year from current_date) || '-' ||
         lpad(nextval('rsmi_serial_seq')::text, 5, '0');
end;
$$;

-- ============================================================
-- DONE. Admins get a fresh serial (e.g. RSMI-2026-00001) each time
-- they open the RSMI print preview at /admin/rsmi-report.
-- ============================================================
