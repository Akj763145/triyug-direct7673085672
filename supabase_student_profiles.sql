-- Supabase Migration: Advanced Student Profiles
-- Run this script in your Supabase SQL Editor to support the advanced enrollment wizard

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core & Demographics
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  blood_group TEXT,
  nationality TEXT DEFAULT 'Domestic',
  is_international BOOLEAN DEFAULT FALSE,
  passport_number TEXT,
  visa_status TEXT,
  mother_tongue TEXT,
  primary_language TEXT,
  
  -- Academic Details
  grade TEXT NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Pending', 'Active', 'Inactive', 'Graduated')),
  
  -- Parent / Guardian 1
  parent1_name TEXT,
  parent1_relation TEXT,
  parent1_occupation TEXT,
  parent1_income TEXT,
  parent1_email TEXT,
  parent1_contact TEXT,
  
  -- Parent / Guardian 2
  parent2_name TEXT,
  parent2_relation TEXT,
  parent2_occupation TEXT,
  parent2_income TEXT,
  parent2_email TEXT,
  parent2_contact TEXT,

  -- Address
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Academic History
  previous_school TEXT,
  last_grade_completed TEXT,
  reason_for_leaving TEXT,
  previous_gpa TEXT,
  
  -- Medical & Emergency
  allergies TEXT,
  medical_conditions TEXT,
  daily_medications TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relation TEXT,
  emergency_contact_number TEXT,

  -- Documents & Media
  photo_url TEXT,
  birth_certificate_url TEXT,
  transcript_url TEXT,
  medical_record_url TEXT,
  id_proof_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Cleanup existing policies to allow re-runs without errors
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Enable insert for everyone" ON student_profiles;
    DROP POLICY IF EXISTS "Allow authenticated full access to student_profiles" ON student_profiles;
    DROP POLICY IF EXISTS "Allow public read access" ON student_profiles;
    DROP POLICY IF EXISTS "Allow public update access" ON student_profiles;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 4. Create Policies

-- Allow anyone to submit an application (INSERT)
-- This covers unauthenticated users (anon role) and authenticated users
CREATE POLICY "Enable insert for everyone" 
ON student_profiles FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow everyone to see the student list (SELECT)
-- Useful for the dashboard if staff isn't logged in yet
CREATE POLICY "Allow public read access"
ON student_profiles FOR SELECT
TO public
USING (true);

-- Allow public UPDATE for editing profile
CREATE POLICY "Allow public update access"
ON student_profiles FOR UPDATE
TO public
USING (true);

-- Allow authenticated staff members full access (ALL)
CREATE POLICY "Allow authenticated full access to student_profiles" 
ON student_profiles FOR ALL 
TO authenticated 
USING (true);

-- 5. STORAGE BUCKET INSTRUCTION:
-- 1. Go to Supabase Dashboard -> Storage
-- 2. Create a new public bucket named 'student-documents'
-- 3. Set standard RLS policies for the bucket:
--    - SELECT: Allow public
--    - INSERT: Allow public
--    - DELETE/UPDATE: Allow authenticated
