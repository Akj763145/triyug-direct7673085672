-- Dedicated Authentication Setup for Triyuga Classes
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create the Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Note: In a real production app, use Supabase Auth (auth.users)
    full_name TEXT,
    role TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert the default Admin user
-- Change 'admin123' if you want a different password
INSERT INTO public.users (username, password, full_name, role)
VALUES ('admin', 'admin123', 'System Administrator', 'Admin')
ON CONFLICT (username) DO NOTHING;

-- 3. Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Create a policy to allow the frontend to read/verify users 
-- (Public access for this specific table for simplicity in this demo)
DROP POLICY IF EXISTS "Enable all for anon" ON public.users;
CREATE POLICY "Enable all for anon" ON public.users FOR ALL USING (true);
