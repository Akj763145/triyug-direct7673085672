-- Add profile picture to staff
ALTER TABLE public.staffs ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- We already ensured sequences for Staff ('EMP-') and Batch ('BAT-') in previous steps or natively.
-- Wait, let's explicitly make sure Batch is working:
-- 1. Create the sequence
CREATE SEQUENCE IF NOT EXISTS batch_seq START 1001;

-- 2. Drop the foreign keys that depend on batches(id) temporarily
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_batch_id_fkey;
ALTER TABLE public.student_batches DROP CONSTRAINT IF EXISTS student_batches_batch_id_fkey;

-- 3. Alter batches table id column type to TEXT
ALTER TABLE public.batches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.batches ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 4. Re-add foreign keys
ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;
ALTER TABLE public.student_batches ADD CONSTRAINT student_batches_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

-- 5. Create trigger to auto-generate BAT-XXXX for new batches
CREATE OR REPLACE FUNCTION generate_batch_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' OR length(NEW.id) > 10 THEN
        NEW.id := 'BAT-' || nextval('batch_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_batch_id ON public.batches;
CREATE TRIGGER trg_generate_batch_id
BEFORE INSERT ON public.batches
FOR EACH ROW
EXECUTE FUNCTION generate_batch_id();
