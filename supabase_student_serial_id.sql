-- Supabase Migration: Short Serial Student ID
-- Adds a human-readable, serial student ID (e.g., STU-1001) to the tables.

-- 1. Create a sequence for the numeric part of the Student ID
CREATE SEQUENCE IF NOT EXISTS student_id_seq START 1001;

-- 2. Add student_id column to student_profiles
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE DEFAULT ('STU-' || nextval('student_id_seq')::TEXT);

-- 3. Add student_id column to students (legacy/roster table)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE DEFAULT ('STU-' || nextval('student_id_seq')::TEXT);

-- 4. Create a function to ensure student_id is generated correctly if not provided
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL THEN
    NEW.student_id := 'STU-' || nextval('student_id_seq')::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach triggers to both tables (cleanup first for idempotency)
DROP TRIGGER IF EXISTS trg_generate_student_id ON student_profiles;
CREATE TRIGGER trg_generate_student_id
BEFORE INSERT ON student_profiles
FOR EACH ROW
EXECUTE FUNCTION generate_student_id();

DROP TRIGGER IF EXISTS trg_generate_student_id_old ON students;
CREATE TRIGGER trg_generate_student_id_old
BEFORE INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION generate_student_id();

-- 6. Backfill existing records if they have null student_ids
UPDATE student_profiles SET student_id = 'STU-' || nextval('student_id_seq')::TEXT WHERE student_id IS NULL;
UPDATE students SET student_id = 'STU-' || nextval('student_id_seq')::TEXT WHERE student_id IS NULL;
