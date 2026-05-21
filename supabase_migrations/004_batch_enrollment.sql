-- Step 1: Add columns to student_profiles
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES public.batches(id),
ADD COLUMN IF NOT EXISTS installments_count INT DEFAULT 1;

-- Step 2: Create student_batches bridge table
CREATE TABLE IF NOT EXISTS public.student_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    installments_count INT NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
    amount_per_installment DECIMAL(12,2),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, batch_id)
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_student_batches_student_id ON public.student_batches(student_id);
CREATE INDEX IF NOT EXISTS idx_student_batches_batch_id ON public.student_batches(batch_id);

-- Step 2: Function to enroll a student and generate invoices automatically
CREATE OR REPLACE FUNCTION public.enroll_student_in_batch(
    p_student_id TEXT,
    p_batch_id TEXT,
    p_installments_count INT
)
RETURNS JSON AS $$
DECLARE
    v_batch_name VARCHAR(255);
    v_total_amount DECIMAL(12,2);
    v_student_name TEXT;
    v_grade TEXT;
    v_contact TEXT;
    v_status TEXT;
    v_installment_amount DECIMAL(12,2);
    v_due_date DATE;
    v_invoice_id TEXT;
    i INT;
    v_result JSON;
BEGIN
    -- 1. Validate batch exists and fetch details
    SELECT name, total_batch_amount 
    INTO v_batch_name, v_total_amount
    FROM public.batches 
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch % not found', p_batch_id;
    END IF;

    -- 2. Validate student exists in legacy students table (needed for FK relationships)
    SELECT name INTO v_student_name
    FROM public.students
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        -- Auto-sync a stub to public.students
        SELECT first_name || ' ' || last_name, grade, parent1_contact, status 
        INTO v_student_name, v_grade, v_contact, v_status
        FROM public.student_profiles WHERE student_id = p_student_id OR id::TEXT = p_student_id;
        
        INSERT INTO public.students (id, name, grade, contact, status)
        VALUES (p_student_id, v_student_name, v_grade, v_contact, v_status);
    END IF;

    -- 3. Calculate installment mathematics
    v_installment_amount := ROUND(v_total_amount / p_installments_count, 2);

    -- 4. Insert into bridge table
    INSERT INTO public.student_batches (student_id, batch_id, installments_count, amount_per_installment)
    VALUES (p_student_id, p_batch_id, p_installments_count, v_installment_amount)
    ON CONFLICT (student_id, batch_id) DO NOTHING;

    -- 5. Generate invoices 
    FOR i IN 1..p_installments_count LOOP
        -- Set due dates spanning over successive months
        v_due_date := CURRENT_DATE + ( (i - 1) * INTERVAL '1 month' );
        
        -- Generate unique invoice ID via sequence or random suffix
        v_invoice_id := 'INV-' || p_student_id || '-' || extract(epoch FROM now())::bigint || '-' || i;

        -- Insert invoice record into existing invoices table
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
        'invoices_created', p_installments_count
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Trigger to auto-enroll from student_profiles insert
CREATE OR REPLACE FUNCTION public.trigger_enroll_student_in_batch()
RETURNS TRIGGER AS $$
DECLARE
    -- The student ID generated might be in NEW.student_id (from serial) or NEW.id 
    -- Assuming `student_id` is the readable STU-1001 ID if we rely on it, but the students table uses TEXT.
    -- Let's use NEW.student_id which is STU-100X
BEGIN
    IF NEW.batch_id IS NOT NULL THEN
        -- We might need a small delay or ensure the "students" table sync has occurred
        -- OR we can just execute the enrollment logic passing NEW.student_id and NEW.batch_id
        PERFORM public.enroll_student_in_batch(COALESCE(NEW.student_id, NEW.id::TEXT), NEW.batch_id, NEW.installments_count);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_enroll_batch ON public.student_profiles;
CREATE TRIGGER trg_auto_enroll_batch
AFTER INSERT ON public.student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_enroll_student_in_batch();

-- Apply RLS safely for student_batches
ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anon" ON public.student_batches FOR ALL USING (true);
