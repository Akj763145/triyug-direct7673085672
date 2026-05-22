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
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for faster reads
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_created_at ON batches(created_at);

-- Trigger to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_batches_modtime
BEFORE UPDATE ON batches
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
