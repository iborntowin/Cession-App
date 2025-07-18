-- PostgreSQL Schema for Cession Management App

-- Extension for UUID generation if not enabled
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: clients
-- Stores information about the clients whose wage garnishments are managed.
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    cin VARCHAR(8) UNIQUE NOT NULL, -- Tunisian National ID Card number
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    worker_number VARCHAR(10) UNIQUE -- Worker number, exactly 10 digits
);

-- Table: documents
-- Stores metadata about uploaded documents and links them to clients or cessions.
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- Link to the client
    cession_id UUID, -- Nullable, as some documents belong only to clients (ID, Job Card)
    document_type VARCHAR(50) NOT NULL, -- e.g., 'NATIONAL_ID', 'JOB_CARD', 'CESSION_CONTRACT'
    file_name VARCHAR(255) NOT NULL, -- Original file name
    storage_path VARCHAR(1024) NOT NULL UNIQUE, -- Path or key in the cloud storage (e.g., Supabase Storage)
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: cessions
-- Stores details about each wage garnishment (cession sur salaire).
CREATE TABLE cessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contract_document_id UUID UNIQUE REFERENCES documents(id) ON DELETE SET NULL, -- Link to the specific cession contract document
    total_loan_amount NUMERIC(12, 2) NOT NULL,
    monthly_deduction NUMERIC(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE, -- Can be calculated or set
    expected_payoff_date DATE, -- Auto-calculated
    remaining_balance NUMERIC(12, 2), -- Auto-calculated
    bank_or_agency VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- e.g., 'ACTIVE', 'FINISHED', 'PENDING'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint from documents to cessions after cessions table is created
-- This avoids circular dependency issues during creation.
ALTER TABLE documents
ADD CONSTRAINT fk_cession
FOREIGN KEY (cession_id) REFERENCES cessions(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX idx_clients_cin ON clients(cin);
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_cession_id ON documents(cession_id);
CREATE INDEX idx_cessions_client_id ON cessions(client_id);
CREATE INDEX idx_cessions_status ON cessions(status);
CREATE INDEX idx_cessions_start_date ON cessions(start_date);

-- Trigger function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cessions_updated_at
BEFORE UPDATE ON cessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Note: Supabase handles UUID generation and timestamps automatically if using their interface/libraries,
-- but defining them explicitly ensures schema clarity and portability.
-- Ensure the 'uuid-ossp' extension is enabled in your Supabase PostgreSQL instance.

-- Change CIN column to VARCHAR(8)
ALTER TABLE clients ALTER COLUMN cin TYPE VARCHAR(8);

-- If worker_number column exists and is not VARCHAR(10):
ALTER TABLE clients ALTER COLUMN worker_number TYPE VARCHAR(10);

-- If worker_number column does not exist, add it:
-- ALTER TABLE clients ADD COLUMN worker_number VARCHAR(10) UNIQUE;

