-- Staff Ledger / Salary Management Schema

CREATE TABLE IF NOT EXISTS public.staff_salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT REFERENCES public.staffs(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- e.g., 'May 2026'
    amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Paid', 'Partial')),
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.staff_salary_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salary_id UUID REFERENCES public.staff_salaries(id) ON DELETE CASCADE,
    staff_id TEXT REFERENCES public.staffs(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT,
    reference_id TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anon" ON public.staff_salaries FOR ALL USING (true);

ALTER TABLE public.staff_salary_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anon" ON public.staff_salary_transactions FOR ALL USING (true);
