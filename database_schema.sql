-- Data Schema Phase 2 for Educational Institute Ledger System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: fee_templates
-- Acts as blueprints for recurring batches (e.g. "Computer Science 101 - Q1 Fee")
CREATE TABLE IF NOT EXISTS fee_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    base_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: ledger_invoices
-- The demands. Associated with a student.
CREATE TABLE IF NOT EXISTS ledger_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL, -- references students.id
    template_id UUID,         -- references fee_templates.id
    title VARCHAR(255) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Upcoming', 'Unpaid', 'Partial', 'Paid', 'Overdue')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('Primary', 'Incidental')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: ledger_line_items
-- Negative items for discounts, positive for late fees/base amounts.
CREATE TABLE IF NOT EXISTS ledger_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES ledger_invoices(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL, -- Negative for scholarships, positive for fees
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: ledger_transactions
-- The receipts. Supports omnichannel with reference tracking for checks/upi.
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES ledger_invoices(id) ON DELETE SET NULL,
    student_id UUID NOT NULL, -- references students.id
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('UPI', 'Cash', 'Cheque', 'Card', 'Bank Transfer', 'Online Gateway')),
    reference_id VARCHAR(255),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Success', 'Failed', 'Pending')),
    idempotency_key VARCHAR(255) UNIQUE, -- to prevent duplicate charges in digital payments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexing
CREATE INDEX IF NOT EXISTS idx_ledger_invoices_student_id ON ledger_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_student_id ON ledger_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_invoice_id ON ledger_transactions(invoice_id);

-- Optional CRON execution for Late Fees logic (handled via pg_cron or external serverless function)
/*
SELECT cron.schedule('0 0 * * *', $$
  -- Logic to run daily and add late fee line items for overdue invoices
$$);
*/
