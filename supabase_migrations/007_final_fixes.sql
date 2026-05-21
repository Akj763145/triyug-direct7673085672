-- 1. Fix Legacy Triggers to prevent Duplicate "STU-" IDs
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL THEN
    IF NEW.id LIKE 'STU-%' THEN
      NEW.student_id := NEW.id;
    ELSE
      NEW.student_id := 'STU-' || nextval('student_id_seq')::TEXT;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the V2 Payment Processor (uses TEXT instead of UUID)
CREATE OR REPLACE FUNCTION public.process_installment_payment_v2(
    p_invoice_id TEXT,
    p_student_id TEXT,
    p_amount DECIMAL(12,2),
    p_payment_method TEXT,
    p_reference_id TEXT,
    p_adjustment_amount DECIMAL(12,2),
    p_adjustment_title TEXT
)
RETURNS JSON AS $$
DECLARE
    v_transaction_id TEXT;
    v_curr_status TEXT;
    v_invoice_amount DECIMAL(12,2);
    v_student_name TEXT;
BEGIN
    SELECT amount, status, student_name INTO v_invoice_amount, v_curr_status, v_student_name
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
    END IF;

    UPDATE public.invoices SET status = 'Paid' WHERE id = p_invoice_id;

    v_transaction_id := 'TXN-' || extract(epoch FROM now())::bigint;

    INSERT INTO public.transactions (
        id, date, description, type, category, amount
    )
    VALUES (
        v_transaction_id, CURRENT_DATE, 'Payment for ' || p_invoice_id || ' by ' || COALESCE(v_student_name, p_student_id), 'Income', 'Fees', p_amount
    );

    RETURN json_build_object(
        'status', 'success',
        'transaction_id', v_transaction_id,
        'invoice_id', p_invoice_id
    );
END;
$$ LANGUAGE plpgsql;
