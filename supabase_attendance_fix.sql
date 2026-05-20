-- Fix Attendance table UNIQUE constraint
ALTER TABLE public.student_attendance 
ADD CONSTRAINT unique_attendance UNIQUE (student_id, date, subject);
