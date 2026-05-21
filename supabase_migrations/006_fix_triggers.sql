CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL THEN
    -- If id already looks like STU-xx, use it
    IF NEW.id LIKE 'STU-%' THEN
      NEW.student_id := NEW.id;
    ELSE
      NEW.student_id := 'STU-' || nextval('student_id_seq')::TEXT;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
