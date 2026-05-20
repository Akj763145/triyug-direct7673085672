-- FINAL FIX: Student Attendance Migration
-- Ensures the table is named 'student_attendance' and includes 'created_at' and robust policies.

-- 1. Ensure the table exists with 'created_at'
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
    subject TEXT DEFAULT 'General',
    topics TEXT,
    marked_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add 'created_at' if it's missing (for older versions of the table)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_attendance' AND column_name='created_at') THEN
        ALTER TABLE public.student_attendance ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- 4. Robust Policy Management
-- We drop the policy first to avoid the "already exists" error
DROP POLICY IF EXISTS "Enable all for public" ON public.student_attendance;
CREATE POLICY "Enable all for public" ON public.student_attendance FOR ALL USING (true);

-- 5. UNIQUE Constraint (for upsert logic)
-- Dropping existing constraint if any, then recreating
ALTER TABLE public.student_attendance DROP CONSTRAINT IF EXISTS unique_attendance;
ALTER TABLE public.student_attendance ADD CONSTRAINT unique_attendance UNIQUE (student_id, date, subject);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.student_attendance(date);
