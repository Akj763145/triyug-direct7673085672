-- Migration 019: Add receipt_url and ensure table exists with proper columns
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure receipt_url column exists if table was already created
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Disable Row Level Security on expenses for seamless developer preview/testing
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
