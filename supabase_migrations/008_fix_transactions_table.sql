-- 1. Add missing columns to transactions table to support student history and UI mapping
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Success';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. Update the RPC to version 3 with proper columns and student association
CREATE OR REPLACE FUNCTION public.process_installment_payment_v3(
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
    -- 1. Get Invoice Details
    SELECT amount, status, student_name INTO v_invoice_amount, v_curr_status, v_student_name
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
    END IF;

    -- 2. Update Invoice to Paid
    UPDATE public.invoices 
    SET status = 'Paid' 
    WHERE id = p_invoice_id;

    -- 3. Create Transaction record associated with student and invoice
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
        CURRENT_DATE, 
        'Fee Payment: ' || p_invoice_id || ' (' || COALESCE(v_student_name, 'Student') || ')', 
        'Income', 
        'Fees', 
        p_amount,
        'Success',
        p_payment_method
    );

    RETURN json_build_object(
        'status', 'success',
        'transaction_id', v_transaction_id,
        'invoice_id', p_invoice_id,
        'message', 'Payment processed and ledger updated'
    );
END;
$$ LANGUAGE plpgsql;
