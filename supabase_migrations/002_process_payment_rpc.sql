CREATE OR REPLACE FUNCTION process_installment_payment(
  p_invoice_id UUID,
  p_student_id UUID,
  p_amount DECIMAL(12,2),
  p_payment_method VARCHAR(50),
  p_reference_id VARCHAR(255),
  p_adjustment_amount DECIMAL(12,2),
  p_adjustment_title VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_current_total DECIMAL(12,2);
  v_amount_paid DECIMAL(12,2);
  v_new_status VARCHAR(50);
BEGIN
  -- 1. Create a ledger line item if there's an adjustment
  IF p_adjustment_amount <> 0 THEN
    INSERT INTO ledger_line_items (invoice_id, title, amount)
    VALUES (p_invoice_id, p_adjustment_title, p_adjustment_amount);
    
    UPDATE ledger_invoices
    SET total_amount = total_amount + p_adjustment_amount
    WHERE id = p_invoice_id;
  END IF;

  -- 2. Fetch current total of the invoice
  SELECT total_amount INTO v_current_total
  FROM ledger_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  -- 3. Log the actual transaction
  INSERT INTO ledger_transactions (
    invoice_id, student_id, amount, payment_method, reference_id, status
  )
  VALUES (
    p_invoice_id, p_student_id, p_amount, p_payment_method, p_reference_id, 'Success'
  ) RETURNING id INTO v_transaction_id;

  -- 4. Calculate total amount paid including this transaction
  SELECT COALESCE(SUM(amount), 0) INTO v_amount_paid
  FROM ledger_transactions
  WHERE invoice_id = p_invoice_id AND status = 'Success';

  -- 5. Determine the new status
  IF v_amount_paid >= v_current_total THEN
    v_new_status := 'Paid';
  ELSIF v_amount_paid > 0 THEN
    v_new_status := 'Partial';
  ELSE
    v_new_status := 'Unpaid'; -- Or overdue logic can be added here based on due_date
  END IF;

  -- 6. Update invoice status
  UPDATE ledger_invoices
  SET 
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'new_status', v_new_status,
    'amount_paid', v_amount_paid,
    'total_amount', v_current_total
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
