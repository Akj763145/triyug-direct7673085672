-- ==========================================
-- SUPABASE MIGRATION: 017
-- Description: Dedicated Schema for Student Tag Persistence
-- Target Tables: public.student_tags, public.student_tag_assignments
-- Version: 1.0.0
-- Created: 2026-05-24
-- ==========================================

-- Enable the required UUID generation extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------------------------------------
-- 1. Table: student_tags (Master Registry of Tags)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#6366F1' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'), -- Rigid hex matches (e.g. #FF5733)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for rapid lookup by tag name
CREATE INDEX IF NOT EXISTS idx_student_tags_name ON public.student_tags(name);

-------------------------------------------------------------------------------
-- 2. Table: student_tag_assignments (Junction Bridge Table)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.student_tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (student_id, tag_id) -- Restricts duplicating the same tag assignment on a student
);

-- Optimize queries searching for all tags assigned to a specific student
CREATE INDEX IF NOT EXISTS idx_student_tag_assignments_student_id ON public.student_tag_assignments(student_id);
-- Optimize queries filtering students by specific tag ID
CREATE INDEX IF NOT EXISTS idx_student_tag_assignments_tag_id ON public.student_tag_assignments(tag_id);

-------------------------------------------------------------------------------
-- 3. Trigger: Auto-Update Timestamp Functionality
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_student_tags_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_student_tags_timestamp ON public.student_tags;
CREATE TRIGGER trg_update_student_tags_timestamp
    BEFORE UPDATE ON public.student_tags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_student_tags_timestamp();

-------------------------------------------------------------------------------
-- 4. Row Level Security (RLS) Configuration
-------------------------------------------------------------------------------
ALTER TABLE public.student_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Dynamic safe policy generation
DO $$ 
BEGIN
    -- RLS Policies for student_tags (Public/Anon read, Write allowed)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'student_tags' AND policyname = 'Allow public read access for student_tags'
    ) THEN
        CREATE POLICY "Allow public read access for student_tags" 
        ON public.student_tags FOR SELECT TO public USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'student_tags' AND policyname = 'Allow write access for student_tags'
    ) THEN
        CREATE POLICY "Allow write access for student_tags" 
        ON public.student_tags FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;

    -- RLS Policies for student_tag_assignments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'student_tag_assignments' AND policyname = 'Allow public read access for assignments'
    ) THEN
        CREATE POLICY "Allow public read access for assignments" 
        ON public.student_tag_assignments FOR SELECT TO public USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'student_tag_assignments' AND policyname = 'Allow write access for assignments'
    ) THEN
        CREATE POLICY "Allow write access for assignments" 
        ON public.student_tag_assignments FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
END $$;

-------------------------------------------------------------------------------
-- 5. Seed / Default Tags Bootstrapping
-------------------------------------------------------------------------------
INSERT INTO public.student_tags (name, color, description) VALUES
    ('Scholarship', '#10B981', 'Students receiving academic or merit scholarships. (Green)'),
    ('Honor Roll', '#F59E0B', 'Top tier achievers in terms of grade criteria. (Amber)'),
    ('Hosteller', '#3B82F6', 'Students residing in campus hostel accommodations. (Blue)'),
    ('Sports Team', '#EF4444', 'Representing the institute in athletic events. (Red)'),
    ('Bus User', '#14B8A6', 'Students utilizing institute transport routes. (Teal)'),
    ('Special Needs', '#8B5CF6', 'Students requiring special learning/examination accommodations. (Purple)'),
    ('Probation', '#6B7280', 'Students under special grade maintenance observation. (Gray)')
ON CONFLICT (name) DO NOTHING;
