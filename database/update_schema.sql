-- Add job field to clients table
ALTER TABLE clients ADD COLUMN job VARCHAR(255);

-- Add personal_address field to cessions table for PDF generation
ALTER TABLE cessions ADD COLUMN personal_address TEXT;

-- Add item_description field to cessions table for PDF generation
ALTER TABLE cessions ADD COLUMN item_description TEXT;
