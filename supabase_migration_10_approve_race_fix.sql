-- Migration 10: Guard approve_purchase_request against concurrent calls
-- Run this in the Supabase SQL Editor.
-- Problem: Two admins approving the same PR simultaneously would deduct stock twice
--          because the function didn't check if the PR was already approved.
-- Fix: Add an idempotency check at the top of the RPC that raises an error
--      if the PR is not in 'Submitted' status.

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
    SELECT quantity INTO v_current_qty
    FROM inventory
    WHERE id = v_item.inventory_id;

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
