-- Database Performance Optimization Script
-- Adds indexes for improved search and query performance
-- Based on actual entity structure from Java classes

-- Indexes for Clients table (most critical for search performance)
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON clients(full_name);
CREATE INDEX IF NOT EXISTS idx_clients_worker_number ON clients(worker_number);

-- Composite indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_clients_fullname_cin ON clients(full_name, cin);

-- Indexes for Documents table
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

-- Indexes for Payments table 
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Indexes for Product table (singular, as per entity)
CREATE INDEX IF NOT EXISTS idx_product_name ON product(name);

-- Indexes for Jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_name ON jobs(name);

-- Indexes for Workplaces table
CREATE INDEX IF NOT EXISTS idx_workplaces_name ON workplaces(name);

-- Indexes for Item Category table
CREATE INDEX IF NOT EXISTS idx_item_category_name ON item_category(name);

-- Indexes for Expenses table
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

-- Indexes for Incomes table (plural as per entity)
CREATE INDEX IF NOT EXISTS idx_incomes_source ON incomes(source);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_amount ON incomes(amount);
CREATE INDEX IF NOT EXISTS idx_incomes_created_at ON incomes(created_at);

-- Indexes for Users table (authentication)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Indexes for Stock Movements table
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Indexes for Export Status table
CREATE INDEX IF NOT EXISTS idx_export_status_status ON export_status(status);

-- Performance monitoring indexes for cessions danger analysis
CREATE INDEX IF NOT EXISTS idx_cessions_danger_analysis ON cessions(client_id, status, start_date, remaining_balance);

-- Note: H2 doesn't support IF NOT EXISTS for constraints, so constraints are commented out
-- ALTER TABLE clients ADD CONSTRAINT uk_clients_cin UNIQUE (cin);
-- ALTER TABLE clients ADD CONSTRAINT uk_clients_worker_number UNIQUE (worker_number);
-- ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);
