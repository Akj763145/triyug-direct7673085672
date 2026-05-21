-- Phase 1 & 2: Ledger Architecture & Installment Mapping Schema

-- ENUMS
CREATE TYPE ledger_invoice_status AS ENUM ('Upcoming', 'Unpaid', 'Partial', 'Paid', 'Overdue');
CREATE TYPE ledger_invoice_type AS ENUM ('Primary', 'Incidental');
CREATE TYPE ledger_transaction_method AS ENUM ('UPI', 'Cash', 'Cheque', 'Card', 'Bank Transfer');
CREATE TYPE ledger_transaction_status AS ENUM ('Success', 'Failed', 'Pending');

-- TABLE: Fee Templates (The Rules)
CREATE TABLE fee_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- e.g. "Computer Science 101"
    base_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE: Ledger Invoices (The Demands)
CREATE TABLE ledger_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    template_id UUID REFERENCES fee_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL, -- e.g. "Tuition Fee (Q1)"
    total_amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status ledger_invoice_status DEFAULT 'Upcoming',
    type ledger_invoice_type DEFAULT 'Primary',
    parent_invoice_id UUID REFERENCES ledger_invoices(id) ON DELETE CASCADE, -- For grouping installments under a parent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE: Ledger Line Items (Discounts, Scholarships, Penalties)
CREATE TABLE ledger_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES ledger_invoices(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- e.g. "Merit Scholarship" or "Late Fee"
    amount DECIMAL(10, 2) NOT NULL, -- Can be negative for discounts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE: Ledger Transactions (The Receipts)
CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES ledger_invoices(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ledger_transaction_method NOT NULL,
    reference_id VARCHAR(255), -- Check number, UPI Txn ID, etc.
    status ledger_transaction_status DEFAULT 'Success',
    idempotency_key VARCHAR(255) UNIQUE, -- To prevent duplicate payments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_ledger_invoices_student_id ON ledger_invoices(student_id);
CREATE INDEX idx_ledger_transactions_invoice_id ON ledger_transactions(invoice_id);
CREATE INDEX idx_ledger_transactions_student_id ON ledger_transactions(student_id);
