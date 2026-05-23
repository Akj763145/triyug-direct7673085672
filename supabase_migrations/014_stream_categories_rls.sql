-- Enable RLS and add policies for stream_categories
ALTER TABLE public.stream_categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to stream_categories
CREATE POLICY "Allow public read access for stream_categories" ON public.stream_categories
    FOR SELECT USING (true);

-- Allow public insert access to stream_categories (Admin is implicitly accessing via API)
CREATE POLICY "Allow public insert access for stream_categories" ON public.stream_categories
    FOR INSERT WITH CHECK (true);

-- Allow public update access to stream_categories
CREATE POLICY "Allow public update access for stream_categories" ON public.stream_categories
    FOR UPDATE USING (true);

-- Allow public delete access to stream_categories
CREATE POLICY "Allow public delete access for stream_categories" ON public.stream_categories
    FOR DELETE USING (true);
