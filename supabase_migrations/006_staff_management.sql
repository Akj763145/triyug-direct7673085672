-- Staff Management Schema

CREATE TABLE IF NOT EXISTS public.designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.staffs (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Leave')),
    date_of_joining DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.staff_designations (
    staff_id TEXT REFERENCES public.staffs(id) ON DELETE CASCADE,
    designation_id UUID REFERENCES public.designations(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, designation_id)
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT REFERENCES public.staffs(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Half Day')),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    UNIQUE(staff_id, date)
);

-- ID Generation sequence for Staff
CREATE SEQUENCE IF NOT EXISTS staff_seq START 1001;

CREATE OR REPLACE FUNCTION generate_staff_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        NEW.id := 'EMP-' || nextval('staff_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_staff_id ON public.staffs;
CREATE TRIGGER trg_generate_staff_id
BEFORE INSERT ON public.staffs
FOR EACH ROW
EXECUTE FUNCTION generate_staff_id();

-- RLS
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for anon" ON public.designations FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.staffs FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.staff_designations FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON public.staff_attendance FOR ALL USING (true);
