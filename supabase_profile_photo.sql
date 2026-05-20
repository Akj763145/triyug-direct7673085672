-- Supabase Migration: Student Profile Photo Upload & Persistent Storage Setup
-- Run this script in your Supabase SQL Editor to enable the profile image feature,
-- create the storage bucket, and configure appropriate row-level security (RLS) policies.

-- ==========================================================
-- 1. DATABASE SCHEMA UPDATES
-- ==========================================================

-- Ensure 'photo_url' column exists in 'student_profiles' table (New Enrollment Workflow)
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Ensure 'photo_url' column exists legacy/alternative 'students' table (Roster Workflow)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Ensure RLS update policies are configured on 'student_profiles'
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public update access" ON student_profiles;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Allow public update access"
ON student_profiles FOR UPDATE
TO public
USING (true);


-- ==========================================================
-- 2. STORAGE CONFIGURATION
-- ==========================================================

-- Insert the 'student-documents' bucket into storage buckets if it doesn't exist
-- Mark the bucket as 'public' so URLs can be retrieved directly by users
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents', 
  'student-documents', 
  true, 
  5242880, -- 5MB limit
  '{"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}'
)
ON CONFLICT (id) DO NOTHING;


-- ==========================================================
-- 3. STORAGE SECURITY POLICIES (RLS ON storage.objects)
-- ==========================================================

-- Standard cleanup of policies to allow idempotency (safe, clean re-runs)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Display Policy" ON storage.objects;
    DROP POLICY IF EXISTS "Public Upload Policy" ON storage.objects;
    DROP POLICY IF EXISTS "Public Update Policy" ON storage.objects;
    DROP POLICY IF EXISTS "Public Delete Policy" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Enable SELECT (read) access so student photos are publicly viewable
CREATE POLICY "Public Display Policy" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'student-documents');

-- Enable INSERT (upload) access so students & parents can upload photos
CREATE POLICY "Public Upload Policy" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'student-documents');

-- Enable UPDATE (modify/overwrite) access for profile photo changes
CREATE POLICY "Public Update Policy" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'student-documents');

-- Enable DELETE access for deleting old profile pictures when replaced
CREATE POLICY "Public Delete Policy" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'student-documents');

-- ==========================================================
-- Verification Query: Paste this into your SQL editor to double-check
-- SELECT id, name, public FROM storage.buckets;
-- ==========================================================
