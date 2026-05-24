import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const sql = `
CREATE OR REPLACE FUNCTION public.enroll_student_in_batch(
    p_student_id TEXT,
    p_batch_id TEXT,
    p_installments_count INT
)
RETURNS JSON AS $$
DECLARE
    v_batch_name VARCHAR(255);
    v_total_amount DECIMAL(12,2);
    v_duration_months INT;
    v_student_name TEXT;
    v_grade TEXT;
    v_contact TEXT;
    v_status TEXT;
    v_installment_amount DECIMAL(12,2);
    v_gap_months FLOAT;
    v_due_date DATE;
    v_invoice_id TEXT;
    i INT;
    v_result JSON;
    
    -- Dynamic EMI Custom Variables
    v_policies JSONB;
    v_emi_policy JSONB;
    v_pct_array JSONB;
    v_pct NUMERIC;
    v_accumulated_amount DECIMAL(12,2) := 0;
BEGIN
    -- 1. Validate batch exists and fetch details (including installment_policies)
    SELECT name, total_batch_amount, duration_months, installment_policies
    INTO v_batch_name, v_total_amount, v_duration_months, v_policies
    FROM public.batches 
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch % not found', p_batch_id;
    END IF;

    -- 2. Validate student exists in legacy students table
    SELECT name INTO v_student_name
    FROM public.students
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        -- Auto-sync stub to public.students
        SELECT first_name || ' ' || last_name, grade, parent1_contact, status 
        INTO v_student_name, v_grade, v_contact, v_status
        FROM public.student_profiles WHERE student_id = p_student_id OR id::TEXT = p_student_id;
        
        INSERT INTO public.students (id, name, grade, contact, status)
        VALUES (p_student_id, v_student_name, v_grade, v_contact, v_status);
    END IF;

    -- Parse dynamic custom prices if defined for the installments count
    BEGIN
        SELECT value INTO v_emi_policy
        FROM jsonb_array_elements(COALESCE(v_policies, '[]'::jsonb))
        WHERE value->>'type' = 'emi_schemes'
        LIMIT 1;
        
        IF v_emi_policy IS NOT NULL THEN
            -- Check for custom price
            IF v_emi_policy->'prices' IS NOT NULL AND (v_emi_policy->'prices'->p_installments_count::text) IS NOT NULL THEN
                v_total_amount := (v_emi_policy->'prices'->>p_installments_count::text)::DECIMAL(12,2);
            END IF;
            -- Check for custom percentage splits
            IF v_emi_policy->'schemes' IS NOT NULL AND (v_emi_policy->'schemes'->p_installments_count::text) IS NOT NULL THEN
                v_pct_array := v_emi_policy->'schemes'->(p_installments_count::text);
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Guard against JSON parsing exceptions and fallback gracefully
        NULL;
    END;

    -- 3. Calculate gap months
    v_gap_months := v_duration_months::FLOAT / p_installments_count;
    
    -- 4. Calculate approximate installment amount (used for student_batches table record)
    v_installment_amount := ROUND(v_total_amount / p_installments_count, 2);

    -- 5. Insert into bridge table
    INSERT INTO public.student_batches (student_id, batch_id, installments_count, amount_per_installment)
    VALUES (p_student_id, p_batch_id, p_installments_count, v_installment_amount)
    ON CONFLICT (student_id, batch_id) DO UPDATE 
    SET installments_count = EXCLUDED.installments_count,
        amount_per_installment = EXCLUDED.amount_per_installment;

    -- 6. Generate invoices based on splits
    v_accumulated_amount := 0;
    FOR i IN 1..p_installments_count LOOP
        v_due_date := CURRENT_DATE + ( (i * v_gap_months) * INTERVAL '1 month' );
        
        -- Fallback to standard split if custom percentages are invalid or mismatched
        IF v_pct_array IS NOT NULL AND jsonb_typeof(v_pct_array) = 'array' AND jsonb_array_length(v_pct_array) = p_installments_count THEN
            IF i < p_installments_count THEN
                v_pct := (v_pct_array->>(i-1))::NUMERIC;
                v_installment_amount := ROUND(v_total_amount * (v_pct / 100.0), 2);
                v_accumulated_amount := v_accumulated_amount + v_installment_amount;
            ELSE
                v_installment_amount := v_total_amount - v_accumulated_amount;
            END IF;
        ELSE
            IF i < p_installments_count THEN
                v_installment_amount := ROUND(v_total_amount / p_installments_count, 2);
                v_accumulated_amount := v_accumulated_amount + v_installment_amount;
            ELSE
                v_installment_amount := v_total_amount - v_accumulated_amount;
            END IF;
        END IF;
        
        v_invoice_id := 'INV-' || p_student_id || '-' || extract(epoch FROM now())::bigint || '-' || i;

        -- Insert invoice record
        INSERT INTO public.invoices (
            id, 
            student_id, 
            student_name, 
            category, 
            amount, 
            due_date, 
            status
        ) VALUES (
            v_invoice_id,
            p_student_id,
            v_student_name,
            v_batch_name || ' - Installment ' || i,
            v_installment_amount,
            v_due_date,
            'Unpaid'
        );
    END LOOP;

    v_result := json_build_object(
        'status', 'success',
        'student_id', p_student_id,
        'batch_id', p_batch_id,
        'total_amount', v_total_amount,
        'invoices_created', p_installments_count
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
`;

async function main() {
  console.log("Applying RPC migration to update enroll_student_in_batch...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_string: sql });
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  console.log("Migration succeeded:", data);
}

main();
