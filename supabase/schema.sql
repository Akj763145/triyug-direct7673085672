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

-- Insert mock data
INSERT INTO public.students (id, name, grade, contact, status) VALUES
    ('STU-1001', 'Aarav Sharma', '10th Grade', '+91 9876543210', 'Active'),
    ('STU-1002', 'Priya Patel', '12th Grade', '+91 9876543211', 'Active'),
    ('STU-1003', 'Rohan Gupta', '11th Grade', '+91 9876543212', 'Active'),
    ('STU-1004', 'Neha Singh', '9th Grade', '+91 9876543213', 'Graduated'),
    ('STU-1005', 'Vikram Mehta', '10th Grade', '+91 9876543214', 'Active')
ON CONFLICT (id) DO NOTHING;

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

-- Insert mock data
INSERT INTO public.staff (id, name, role, contact, department, salary) VALUES
    ('STF-201', 'Dr. Anil Kumar', 'Teacher', '+91 9998887770', 'Mathematics', 75000),
    ('STF-202', 'Sunita Verma', 'Admin', '+91 9998887771', 'Office', 45000),
    ('STF-203', 'Ravi Desai', 'Teacher', '+91 9998887772', 'Physics', 70000),
    ('STF-204', 'Pooja Reddy', 'Teacher', '+91 9998887773', 'Chemistry', 68000)
ON CONFLICT (id) DO NOTHING;

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

-- Insert mock data
INSERT INTO public.invoices (id, student_id, student_name, category, amount, due_date, status) VALUES
    ('INV-501', 'STU-1001', 'Aarav Sharma', 'Tuition', 15000, '2023-11-15', 'Paid'),
    ('INV-502', 'STU-1002', 'Priya Patel', 'Lab Fee', 5000, '2023-11-20', 'Unpaid'),
    ('INV-503', 'STU-1003', 'Rohan Gupta', 'Tuition', 15000, '2023-11-25', 'Partial')
ON CONFLICT (id) DO NOTHING;


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

-- Insert mock data
INSERT INTO public.transactions (id, date, description, type, category, amount) VALUES
    ('TXN-901', '2023-10-01', 'Tuition Collection - Sep', 'Income', 'Fees', 450000),
    ('TXN-902', '2023-10-05', 'Staff Payroll - Sep', 'Expense', 'Payroll', 258000),
    ('TXN-903', '2023-10-12', 'Internet Bill', 'Expense', 'Utilities', 5000),
    ('TXN-904', '2023-10-15', 'New Projector Purchase', 'Expense', 'Resources', 35000),
    ('TXN-905', '2023-10-28', 'Lab Fee Collection', 'Income', 'Fees', 80000)
ON CONFLICT (id) DO NOTHING;


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

-- Insert mock data
INSERT INTO public.resources (id, name, category, status, location) VALUES
    ('RES-001', 'Epson Projector 4K', 'Physical', 'Available', 'Room 101'),
    ('RES-002', 'Physics Lab Kits', 'Physical', 'In Use', 'Lab A'),
    ('RES-003', 'Zoom Pro License', 'Digital', 'Available', 'Global'),
    ('RES-004', 'MacBook Pro M2', 'Physical', 'Damaged', 'IT Office')
ON CONFLICT (id) DO NOTHING;


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

-- Insert mock data
INSERT INTO public.activity_logs (id, action, module, time, "user") VALUES
    (1, 'Added new student', 'Students', '2 hours ago', 'Admin'),
    (2, 'Generated payroll for Oct', 'Staff', '4 hours ago', 'Finance'),
    (3, 'Checked out Epson Projector', 'Resources', '1 day ago', 'Dr. Anil Kumar'),
    (4, 'Recorded payment for INV-501', 'Fees', '2 days ago', 'Finance'),
    (5, 'Updated grade for STU-1002', 'Students', '3 days ago', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- Restart sequence for activity_logs
SELECT setval('activity_logs_id_seq', (SELECT MAX(id) FROM activity_logs));

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
-- 8. Row Level Security (RLS) configuration (Optional)
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

CREATE POLICY "Enable all for anon" ON public.students FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.staff FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.resources FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.activity_logs FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.users FOR ALL USING (true);
