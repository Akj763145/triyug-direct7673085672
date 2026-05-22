-- Add extended profile fields to staffs table

ALTER TABLE public.staffs 
ADD COLUMN date_of_birth DATE,
ADD COLUMN permanent_address TEXT,
ADD COLUMN current_address TEXT,
ADD COLUMN government_id TEXT,
ADD COLUMN education_qualifications TEXT,
ADD COLUMN employment_history TEXT,
ADD COLUMN reference_contacts TEXT,
ADD COLUMN background_screening TEXT,
ADD COLUMN bank_account_details TEXT,
ADD COLUMN tax_declarations TEXT,
ADD COLUMN pension_accounts TEXT,
ADD COLUMN emergency_contact TEXT,
ADD COLUMN signed_contract BOOLEAN DEFAULT false,
ADD COLUMN equipment_requirements TEXT;
