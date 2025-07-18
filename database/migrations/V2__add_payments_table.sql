-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cession_id UUID NOT NULL REFERENCES cessions(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    notes VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Add indexes for better query performance
    CONSTRAINT payments_amount_check CHECK (amount > 0)
);

-- Add indexes
CREATE INDEX idx_payments_cession_id ON payments(cession_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Add trigger to update cession remaining balance and progress after payment
CREATE OR REPLACE FUNCTION update_cession_after_payment()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(12, 2);
    cession_total NUMERIC(12, 2);
BEGIN
    -- Calculate total payments for this cession
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE cession_id = NEW.cession_id;
    
    -- Get cession total amount
    SELECT total_loan_amount INTO cession_total
    FROM cessions
    WHERE id = NEW.cession_id;
    
    -- Update cession remaining balance and progress
    UPDATE cessions
    SET 
        remaining_balance = total_loan_amount - total_paid,
        current_progress = (total_paid / total_loan_amount * 100),
        updated_at = CURRENT_TIMESTAMP,
        status = CASE 
            WHEN total_paid >= total_loan_amount THEN 'FINISHED'
            ELSE status
        END
    WHERE id = NEW.cession_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_cession_after_payment_trigger
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_cession_after_payment();