-- ============================================================
-- MIGRATION 16: Facility Reservation module
-- Run this in Supabase SQL Editor AFTER migrations 1-15.
--
-- New, independent domain (facility booking/scheduling) — not connected
-- to Purchase Requests, RIS, or Inventory. The public reserves a facility
-- for a date/time; every submission is auto-confirmed (no approval step),
-- as long as it doesn't overlap an existing booking for that facility.
-- Admins can only monitor (list + calendar) — no accept/reject anywhere.
-- ============================================================

-- ============================================================
-- 1. FACILITIES (simple lookup list)
-- ============================================================
create table facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into facilities (name) values
  ('Gym 1'), ('Gym 2'), ('Covered Court'), ('Conference Room'), ('Multi-purpose Hall');

-- ============================================================
-- 2. FACILITY RESERVATIONS (header)
-- ============================================================
create table facility_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text unique,
  facility_id uuid references facilities(id) not null,
  borrower_name text not null,
  contact_number text not null,
  organization text,
  purpose text not null,
  notes text,
  reservation_date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  created_at timestamptz default now()
);

-- Auto-generate reservation numbers like RES-2026-00001
create sequence facility_reservation_number_seq start 1;

create or replace function set_facility_reservation_number()
returns trigger as $$
begin
  if new.reservation_number is null then
    new.reservation_number := 'RES-' || extract(year from current_date) || '-' ||
                                lpad(nextval('facility_reservation_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_facility_reservation_number
  before insert on facility_reservations
  for each row execute function set_facility_reservation_number();

-- ============================================================
-- 3. FACILITY RESERVATION ITEMS (manually-typed "items to borrow" —
--    NOT connected to the inventory table, pure free text + quantity)
-- ============================================================
create table facility_reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references facility_reservations(id) on delete cascade,
  item_name text not null,
  quantity numeric not null check (quantity > 0),
  sort_order int default 0
);

-- ============================================================
-- 4. CREATE-RESERVATION RPC — atomic overlap check + insert.
--    Mirrors approve_purchase_request's race-condition guard: locks the
--    rows for this facility/date before checking for a time overlap, so
--    two simultaneous submissions for the same slot can't both succeed.
--    This is the ONLY write path for facility_reservations — there is no
--    direct anon/authenticated insert policy below, unlike Purchase
--    Requests/RIS, because this flow specifically needs atomicity, not
--    just a status check-constraint.
-- ============================================================
create or replace function create_facility_reservation(
  p_facility_id uuid,
  p_date date,
  p_start time,
  p_end time,
  p_borrower text,
  p_contact text,
  p_org text,
  p_purpose text,
  p_notes text,
  p_items jsonb  -- [{ "item_name": "Basketball", "quantity": 2 }, ...]
)
returns facility_reservations
language plpgsql
security definer
as $$
declare
  v_conflict_id uuid;
  v_res facility_reservations;
begin
  if p_end <= p_start then
    raise exception 'End time must be after start time.';
  end if;

  -- Lock existing rows for this facility/date so a concurrent submission
  -- for the same slot has to wait for this transaction to finish.
  perform 1 from facility_reservations
    where facility_id = p_facility_id and reservation_date = p_date
    for update;

  select id into v_conflict_id
    from facility_reservations
    where facility_id = p_facility_id
      and reservation_date = p_date
      and start_time < p_end
      and end_time > p_start
    limit 1;

  if v_conflict_id is not null then
    raise exception 'This facility is already reserved during the selected schedule.';
  end if;

  insert into facility_reservations (
    facility_id, reservation_date, start_time, end_time,
    borrower_name, contact_number, organization, purpose, notes
  ) values (
    p_facility_id, p_date, p_start, p_end,
    p_borrower, p_contact, nullif(p_org, ''), p_purpose, nullif(p_notes, '')
  )
  returning * into v_res;

  insert into facility_reservation_items (reservation_id, item_name, quantity, sort_order)
    select v_res.id, t.item->>'item_name', (t.item->>'quantity')::numeric, (t.ord - 1)::int
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(item, ord);

  return v_res;
end;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
alter table facilities enable row level security;
alter table facility_reservations enable row level security;
alter table facility_reservation_items enable row level security;

-- Facilities: everyone can read (public dropdown + admin filters). No
-- public write; only admins could manage the list if ever needed later.
create policy "anyone read facilities" on facilities
  for select using (true);

create policy "admin write facilities" on facilities
  for all using (is_admin()) with check (is_admin());

-- Facility reservations: everyone can read (both calendars, public and
-- admin, need to see existing bookings). No insert/update policy for
-- anon or authenticated — writes only happen through the
-- create_facility_reservation() RPC above (security definer bypasses
-- RLS for its own insert). Admins get an explicit delete policy in case
-- a booking ever needs manual removal.
create policy "anyone read facility_reservations" on facility_reservations
  for select using (true);

create policy "admin delete facility_reservations" on facility_reservations
  for delete using (is_admin());

create policy "anyone read facility_reservation_items" on facility_reservation_items
  for select using (true);

-- ============================================================
-- DONE. After running this:
-- - Public books a facility at /reserve-facility (calendar preview + form,
--   auto-confirmed on submit, no approval step)
-- - Admins monitor at /admin/facility-reservations (table) and
--   /admin/facility-calendar (weekly calendar, view-only)
-- - Double-booking the same facility/time is rejected atomically by
--   create_facility_reservation()
-- ============================================================
