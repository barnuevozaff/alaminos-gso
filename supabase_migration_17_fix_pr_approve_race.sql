-- ============================================================
-- MIGRATION 17: Fix a real race condition in approve_purchase_request
-- Run this in the Supabase SQL Editor.
--
-- Bug: the function locks the purchase_requests row (FOR UPDATE) before
-- checking its status, which correctly prevents the SAME PR from being
-- approved twice concurrently. But inside the item loop it reads
-- inventory.quantity with a plain SELECT (no lock) before checking
-- "sufficient stock" and deducting. If two DIFFERENT purchase requests
-- that reference the SAME inventory item are approved at nearly the same
-- time, both can read the same stale quantity, both pass the sufficiency
-- check, and both deduct — driving stock negative even though each
-- individual check said "sufficient". migration_14_fix_ris_approve.sql
-- already added `FOR UPDATE` to the equivalent RIS approval RPC; this
-- brings the PR approval RPC in line with that same fix.
-- ============================================================

CREATE OR REPLACE FUNCTION approve_purchase_request(p_pr_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_current_qty numeric;
  v_current_status text;
BEGIN
  -- Only admins may call this
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- Lock the PR row and check status atomically to prevent race conditions
  SELECT status INTO v_current_status
  FROM purchase_requests
  WHERE id = p_pr_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Purchase request not found';
  END IF;

  IF v_current_status != 'Submitted' THEN
    RAISE EXCEPTION 'Purchase request is already % — cannot approve again', v_current_status;
  END IF;

  -- Deduct inventory for each line item
  FOR v_item IN
    SELECT pi.inventory_id, pi.quantity, pi.item_description
    FROM pr_items pi
    WHERE pi.pr_id = p_pr_id
      AND pi.inventory_id IS NOT NULL
  LOOP
    -- Lock the inventory row before checking/deducting, so two different
    -- PRs referencing the same item can't both read the same stale
    -- quantity and both pass the sufficiency check.
    SELECT quantity INTO v_current_qty
    FROM inventory
    WHERE id = v_item.inventory_id
    FOR UPDATE;

    IF v_current_qty IS NULL THEN
      RAISE EXCEPTION 'Inventory item not found for "%"', v_item.item_description;
    END IF;

    IF v_current_qty < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%" — available: %, requested: %',
        v_item.item_description, v_current_qty, v_item.quantity;
    END IF;

    UPDATE inventory
    SET quantity = quantity - v_item.quantity
    WHERE id = v_item.inventory_id;

    INSERT INTO stock_movements (inventory_id, movement_type, quantity, reference, performed_by)
    VALUES (v_item.inventory_id, 'Out', v_item.quantity,
            (SELECT pr_number FROM purchase_requests WHERE id = p_pr_id),
            p_user_id);
  END LOOP;

  -- Mark approved
  UPDATE purchase_requests
  SET status = 'Approved',
      decided_at = now(),
      decided_by = p_user_id
  WHERE id = p_pr_id;

  -- Audit log
  INSERT INTO audit_logs (action, description, performed_by)
  VALUES ('PR_APPROVED',
          'Approved ' || (SELECT pr_number FROM purchase_requests WHERE id = p_pr_id),
          p_user_id);
END;
$$;

-- ============================================================
-- DONE. Approving a PR now locks the referenced inventory rows before
-- checking/deducting stock, closing the cross-PR race window.
-- ============================================================
