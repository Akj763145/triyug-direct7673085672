-- Step 1: Database Schema for Batch & Installment Management

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_batch_amount DECIMAL(12,2) NOT NULL CHECK (total_batch_amount >= 0),
    duration_months INT NOT NULL DEFAULT 1 CHECK (duration_months >= 1),
    min_installments INT NOT NULL DEFAULT 1 CHECK (min_installments >= 1),
    max_installments INT NOT NULL DEFAULT 1 CHECK (max_installments >= min_installments),
    faculty_assign VARCHAR(255),
    thumbnail TEXT,
    total_seats INT DEFAULT 0,
    available_seats INT DEFAULT 0,
    subject VARCHAR(255),
    stream_category VARCHAR(255),
    board_target VARCHAR(255),
    teaching_medium VARCHAR(255),
    timing VARCHAR(255),
    batch_mode VARCHAR(255),
    curriculum_modules JSONB,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist in case the table was created previously without them
ALTER TABLE batches 
    ADD COLUMN IF NOT EXISTS faculty_assign VARCHAR(255),
    ADD COLUMN IF NOT EXISTS thumbnail TEXT,
    ADD COLUMN IF NOT EXISTS total_seats INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS available_seats INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stream_category VARCHAR(255),
    ADD COLUMN IF NOT EXISTS board_target VARCHAR(255),
    ADD COLUMN IF NOT EXISTS teaching_medium VARCHAR(255),
    ADD COLUMN IF NOT EXISTS timing VARCHAR(255),
    ADD COLUMN IF NOT EXISTS batch_mode VARCHAR(255),
    ADD COLUMN IF NOT EXISTS curriculum_modules JSONB;


-- Indexing for faster reads
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);

-- Trigger to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_batches_modtime ON batches;
CREATE TRIGGER update_batches_modtime
BEFORE UPDATE ON batches
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
