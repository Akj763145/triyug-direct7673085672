import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const sql = `
CREATE OR REPLACE FUNCTION public.process_installment_payment_v4(
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
    v_adjustment_id TEXT;
    v_total_paid DECIMAL(12,2);
    v_total_discounts DECIMAL(12,2);
    v_total_late_fees DECIMAL(12,2);
    v_invoice_amount DECIMAL(12,2);
    v_student_name TEXT;
    v_new_status TEXT;
    v_net_invoice_amount DECIMAL(12,2);
BEGIN
    -- 1. Get Invoice Details
    SELECT amount, student_name INTO v_invoice_amount, v_student_name
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
    END IF;

    -- 2. Insert main payment transaction (if payment amount > 0)
    IF p_amount > 0 THEN
        v_transaction_id := 'TXN-' || extract(epoch FROM now())::bigint || '-' || FLOOR(RANDOM() * 1000)::integer;
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
    END IF;

    -- 3. Insert Adjustment transaction (if adjustment != 0)
    IF p_adjustment_amount IS NOT NULL AND p_adjustment_amount != 0 THEN
        v_adjustment_id := 'ADJ-' || extract(epoch FROM now())::bigint || '-' || FLOOR(RANDOM() * 1000)::integer;
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
            v_adjustment_id, 
            p_student_id,
            p_invoice_id,
            CURRENT_DATE, 
            p_adjustment_title || ' [Ref: ' || p_invoice_id || ']', 
            CASE WHEN p_adjustment_amount < 0 THEN 'Discount' ELSE 'Late Fee' END, 
            CASE WHEN p_adjustment_amount < 0 THEN 'Discount' ELSE 'Fees' END, 
            p_adjustment_amount,
            'Success',
            'SYSTEM'
        );
    END IF;

    -- 4. Calculate Net Invoice Amount (Original + Late Fees - Discounts)
    -- Total standard payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.transactions
    WHERE invoice_id = p_invoice_id 
      AND (status = 'Success' OR status = 'success')
      AND amount > 0
      AND type != 'Late Fee'
      AND type != 'Discount';
      
    -- Total discounts (negative amounts or type == 'Discount' or category == 'Discount')
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_discounts
    FROM public.transactions
    WHERE invoice_id = p_invoice_id 
      AND (status = 'Success' OR status = 'success')
      AND (amount < 0 OR type = 'Discount' OR category = 'Discount');

    -- Total late fees
    SELECT COALESCE(SUM(amount), 0) INTO v_total_late_fees
    FROM public.transactions
    WHERE invoice_id = p_invoice_id 
      AND (status = 'Success' OR status = 'success')
      AND (type = 'Late Fee' OR description LIKE '%Late Fee%');

    v_net_invoice_amount := v_invoice_amount + v_total_late_fees - v_total_discounts;

    -- 5. Determine New Status
    IF v_total_paid >= v_net_invoice_amount THEN
        v_new_status := 'Paid';
    ELSIF v_total_paid > 0 OR v_total_discounts > 0 THEN
        v_new_status := 'Partial';
    ELSE
        v_new_status := 'Unpaid';
    END IF;

    -- 6. Update Invoice Status
    UPDATE public.invoices 
    SET status = v_new_status 
    WHERE id = p_invoice_id;

    RETURN json_build_object(
        'status', 'success',
        'transaction_id', COALESCE(v_transaction_id, v_adjustment_id),
        'invoice_id', p_invoice_id,
        'new_status', v_new_status,
        'total_paid', v_total_paid,
        'total_discount', v_total_discounts,
        'total_late_fees', v_total_late_fees,
        'amount_due', GREATEST(0, v_net_invoice_amount - v_total_paid),
        'message', 'Payment processed as ' || v_new_status
    );
END;
$$ LANGUAGE plpgsql;
`;

async function main() {
  console.log("Applying RPC migration...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_string: sql });
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  console.log("Migration succeeded:", data);
}

main();
