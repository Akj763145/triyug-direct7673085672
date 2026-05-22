-- Ensure staff_document bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff_document', 'staff_document', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for staff_document bucket
CREATE POLICY "Public Access staff_document" ON storage.objects FOR SELECT USING ( bucket_id = 'staff_document' );
CREATE POLICY "Public Upload staff_document" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'staff_document' );
CREATE POLICY "Public Update staff_document" ON storage.objects FOR UPDATE USING ( bucket_id = 'staff_document' );
CREATE POLICY "Public Delete staff_document" ON storage.objects FOR DELETE USING ( bucket_id = 'staff_document' );

-- Ensure student-documents bucket policies are also set if they aren't already
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access student-documents" ON storage.objects FOR SELECT USING ( bucket_id = 'student-documents' );
CREATE POLICY "Public Upload student-documents" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'student-documents' );
CREATE POLICY "Public Update student-documents" ON storage.objects FOR UPDATE USING ( bucket_id = 'student-documents' );
CREATE POLICY "Public Delete student-documents" ON storage.objects FOR DELETE USING ( bucket_id = 'student-documents' );

-- Fix document_categories RLS to allow INSERT/UPDATE/DELETE properly for anon
DROP POLICY IF EXISTS "Enable all for anon" ON public.document_categories;
CREATE POLICY "Enable all for anon" ON public.document_categories FOR ALL USING (true) WITH CHECK (true);
