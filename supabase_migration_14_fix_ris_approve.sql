-- ============================================================
-- MIGRATION 14: Fix "INSERT has more target columns than expressions"
-- error when approving a Requisition and Issue Slip
-- Run this in Supabase SQL Editor AFTER migration 13.
--
-- Bug: approve_requisition_issue_slip's insert into ris_stock_movements
-- listed 6 columns (ris_inventory_id, movement_type, quantity, reference,
-- performed_by, notes) but only supplied 5 values — the quantity value
-- was missing entirely. This replaces the function with the corrected
-- version (adds v_item.quantity back into the values list).
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

-- ============================================================
-- DONE. Approving a submitted RIS now correctly deducts stock and
-- records the movement without the column-count error.
-- ============================================================
