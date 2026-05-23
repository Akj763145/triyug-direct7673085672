CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.stream_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.stream_categories (name) VALUES 
('Science (PCM/PCB)'),
('Commerce'),
('Arts / Humanities'),
('Foundation (Class 6-10)')
ON CONFLICT DO NOTHING;