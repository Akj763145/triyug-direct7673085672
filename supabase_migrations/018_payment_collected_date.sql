CREATE OR REPLACE FUNCTION public.process_installment_payment_v5(
    p_invoice_id TEXT,
    p_student_id TEXT,
    p_amount DECIMAL(12,2),
    p_payment_method TEXT,
    p_reference_id TEXT,
    p_adjustment_amount DECIMAL(12,2),
    p_adjustment_title TEXT,
    p_payment_date DATE
)
RETURNS JSON AS $$
DECLARE
    v_transaction_id TEXT;
    v_total_paid DECIMAL(12,2);
    v_invoice_amount DECIMAL(12,2);
    v_student_name TEXT;
    v_new_status TEXT;
    v_actual_date DATE;
BEGIN
    v_actual_date := COALESCE(p_payment_date, CURRENT_DATE);

    -- 1. Get Invoice Details
    SELECT amount, student_name INTO v_invoice_amount, v_student_name
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
    END IF;

    -- 2. Calculate Total Paid (including current payment)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.transactions
    WHERE invoice_id = p_invoice_id AND (status = 'Success' OR status = 'success');
    
    v_total_paid := v_total_paid + p_amount;

    -- 3. Determine New Status
    IF v_total_paid >= v_invoice_amount THEN
        v_new_status := 'Paid';
    ELSE
        v_new_status := 'Partial';
    END IF;

    -- 4. Update Invoice Status
    UPDATE public.invoices 
    SET status = v_new_status 
    WHERE id = p_invoice_id;

    -- 5. Create Transaction record associated with student and invoice
    v_transaction_id := 'TXN-' || extract(epoch FROM now())::bigint;

    INSERT INTO public.transactions (
        id, 
        student_id,
        invoice_id,
        date, 
        description, 
        type, 
        category, 
        amount,
        status,
        payment_method
    )
    VALUES (
        v_transaction_id, 
        p_student_id,
        p_invoice_id,
        v_actual_date, 
        'Payment for ' || v_student_name, 
        'Income', 
        'Fees', 
        p_amount,
        'Success',
        p_payment_method
    );

    RETURN json_build_object(
        'status', 'success',
        'invoice_id', p_invoice_id,
        'transaction_id', v_transaction_id,
        'total_paid', v_total_paid,
        'invoice_amount', v_invoice_amount,
        'new_status', v_new_status
    );
END;
$$ LANGUAGE plpgsql;
