-- Create document categories table
CREATE TABLE IF NOT EXISTS public.document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'Student' or 'Staff'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial categories
INSERT INTO public.document_categories (name, type) VALUES
    ('Academic', 'Student'),
    ('Legal', 'Student'),
    ('ID Proof', 'Student'),
    ('Joining Letter', 'Staff'),
    ('Experience Certificate', 'Staff'),
    ('ID Proof', 'Staff'),
    ('Degree', 'Staff')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anon" ON public.document_categories FOR ALL USING (true);
