-- Add student_attendance if it does not exist
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    subject TEXT DEFAULT 'General',
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
    marked_by TEXT,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, date, subject)
);

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'student_attendance' 
        AND policyname = 'Enable all for anon'
    ) THEN
        CREATE POLICY "Enable all for anon" ON public.student_attendance FOR ALL USING (true);
    END IF;
END $$;
