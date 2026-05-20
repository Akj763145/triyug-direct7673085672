-- Supabase Migration: Student Attendance
-- Adds a table to track daily attendance for students.

CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL, -- Can be UUID from profiles or STU-ID from legacy
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
    subject TEXT,
    topics TEXT,
    marked_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Allow all access for proof-of-concept (simplify for preview)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Enable all for public" ON public.student_attendance;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Enable all for public" ON public.student_attendance FOR ALL USING (true);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.student_attendance(date);
