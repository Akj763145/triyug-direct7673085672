-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by TEXT
);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for public" ON public.holidays FOR ALL USING (true);
