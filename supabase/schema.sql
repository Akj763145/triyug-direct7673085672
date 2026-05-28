-- Supabase Schema for Triyuga Classes

-- Enable UUID extension (optional, if you want uuid instead of custom text IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------------------------------------
-- 1. Students Table
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    contact TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-------------------------------------------------------------------------------
-- 2. Staff Table
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    contact TEXT NOT NULL,
    department TEXT NOT NULL,
    salary NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-------------------------------------------------------------------------------
-- 3. Invoices Table
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-------------------------------------------------------------------------------
-- 4. Transactions Table (Ledger)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-------------------------------------------------------------------------------
-- 5. Resources Table
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-------------------------------------------------------------------------------
-- 6. Activity Logs Table
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    time TEXT NOT NULL,
    "user" TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-------------------------------------------------------------------------------
-- 7. Users Table (Simple Auth)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- In production, use hashed passwords or Supabase Auth
    full_name TEXT,
    role TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.users (username, password, full_name, role) VALUES
    ('admin', 'admin123', 'System Administrator', 'Admin')
ON CONFLICT (username) DO NOTHING;

-------------------------------------------------------------------------------
-- 8. Role Permissions Table
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role TEXT PRIMARY KEY,
    permissions JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.role_permissions (role, permissions) VALUES
    ('Admin', '{"dashboard": true, "students": true, "staff": true, "batches": true, "fees": true, "ledger": true, "resources": true}'),
    ('Receptionist', '{"dashboard": true, "students": true, "staff": false, "batches": false, "fees": true, "ledger": false, "resources": true}')
ON CONFLICT (role) DO NOTHING;

-------------------------------------------------------------------------------
-- 9. Row Level Security (RLS) configuration (Optional)
-------------------------------------------------------------------------------
-- By default, allowing public anon access for this proof-of-concept. 
-- In a real production app, you would lock this down via policies.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for anon" ON public.students;
CREATE POLICY "Enable all for anon" ON public.students FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.staff;
CREATE POLICY "Enable all for anon" ON public.staff FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.invoices;
CREATE POLICY "Enable all for anon" ON public.invoices FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.transactions;
CREATE POLICY "Enable all for anon" ON public.transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.resources;
CREATE POLICY "Enable all for anon" ON public.resources FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.activity_logs;
CREATE POLICY "Enable all for anon" ON public.activity_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.users;
CREATE POLICY "Enable all for anon" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.role_permissions;
CREATE POLICY "Enable all for anon" ON public.role_permissions FOR ALL USING (true);
