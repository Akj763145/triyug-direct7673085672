-- Add expected arrival time to staffs table
ALTER TABLE public.staffs ADD COLUMN IF NOT EXISTS expected_arrival_time TIME DEFAULT '09:00:00';
