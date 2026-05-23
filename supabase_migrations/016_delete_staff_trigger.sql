-- Trigger to clean up faculty assignments in batches table when a staff is deleted.
CREATE OR REPLACE FUNCTION clean_deleted_staff_from_batches()
RETURNS TRIGGER AS $$
DECLARE
    deleted_name TEXT;
    batch_rec RECORD;
    new_faculty TEXT;
BEGIN
    deleted_name := trim(both ' ' from (COALESCE(OLD.first_name, '') || ' ' || COALESCE(OLD.last_name, '')));
    deleted_name := trim(both ' ' from deleted_name);
    
    IF deleted_name = '' THEN
        RETURN OLD;
    END IF;

    FOR batch_rec IN 
        SELECT id, faculty_assign 
        FROM public.batches 
        WHERE faculty_assign IS NOT NULL AND faculty_assign <> ''
    LOOP
        -- If the faculty_assign contains the deleted name
        IF position(deleted_name in batch_rec.faculty_assign) > 0 THEN
            -- We split by comma, filter out the deleted name, and merge back
            SELECT string_agg(trim(both ' ' from val), ', ')
            INTO new_faculty
            FROM regexp_split_to_table(batch_rec.faculty_assign, ',') AS val
            WHERE trim(both ' ' from val) <> deleted_name;
            
            -- Update the batches table
            UPDATE public.batches 
            SET faculty_assign = COALESCE(new_faculty, '') 
            WHERE id = batch_rec.id;
        END IF;
    END LOOP;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clean_deleted_staff_from_batches ON public.staffs;
CREATE TRIGGER trg_clean_deleted_staff_from_batches
AFTER DELETE ON public.staffs
FOR EACH ROW
EXECUTE FUNCTION clean_deleted_staff_from_batches();
