-- ==========================================
-- SUPABASE MIGRATION & SCHEMATICS
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
-- This table persists the master list of available tags/categories.
-- Features name uniqueness, hex colors for frontend indicators, and descriptions.
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
-- Binds tags to student entities. Utilizes a bridge format to allow 
-- a many-to-many relationship (a student can have many tags, and a tag can have many students).
-- Cascades deletion of students or tags to prevent dangling or orphaned associations.
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
-- Ensures the `updated_at` column modifies itself whenever a tag is updated on the database level.
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
-- Standard protection of schemas, allowing seamless operations for the client.
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
-- Populates default tags commonly used in academic institutes.
-- Avoids duplicate inserts dynamically with ON CONFLICT resolution.
INSERT INTO public.student_tags (name, color, description) VALUES
    ('Scholarship', '#10B981', 'Students receiving academic or merit scholarships. (Green)'),
    ('Honor Roll', '#F59E0B', 'Top tier achievers in terms of grade criteria. (Amber)'),
    ('Hosteller', '#3B82F6', 'Students residing in campus hostel accommodations. (Blue)'),
    ('Sports Team', '#EF4444', 'Representing the institute in athletic events. (Red)'),
    ('Bus User', '#14B8A6', 'Students utilizing institute transport routes. (Teal)'),
    ('Special Needs', '#8B5CF6', 'Students requiring special learning/examination accommodations. (Purple)'),
    ('Probation', '#6B7280', 'Students under special grade maintenance observation. (Gray)')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- CLIENT USAGE & REFERENCE CHEAT-SHEET
-- ==========================================
/*
  1. QUERY ALL TAGS ON A SPECIFIC STUDENT (e.g., 'STU-1001'):
     ---------------------------------------------------------
     SELECT st.id, st.name, st.color, st.description
     FROM public.student_tags st
     JOIN public.student_tag_assignments sta ON st.id = sta.tag_id
     WHERE sta.student_id = 'STU-1001';

  2. FIND ALL STUDENTS WITH A SPECIFIC TAG NAME:
     --------------------------------------------
     SELECT s.*
     FROM public.students s
     JOIN public.student_tag_assignments sta ON s.id = sta.student_id
     JOIN public.student_tags st ON st.id = sta.tag_id
     WHERE st.name = 'Scholarship';

  3. ASSIGN A TAG TO A STUDENT:
     --------------------------
     INSERT INTO public.student_tag_assignments (student_id, tag_id)
     VALUES (
         'STU-1001', 
         (SELECT id FROM public.student_tags WHERE name = 'Scholarship')
     ) ON CONFLICT (student_id, tag_id) DO NOTHING;

  4. DELETE/UNASSIGN A TAG:
     -----------------------
     DELETE FROM public.student_tag_assignments
     WHERE student_id = 'STU-1001' 
       AND tag_id = (SELECT id FROM public.student_tags WHERE name = 'Scholarship');
*/
