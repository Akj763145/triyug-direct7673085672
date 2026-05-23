ALTER TABLE batches ADD COLUMN IF NOT EXISTS installment_policies JSONB DEFAULT '[]';
