-- Migration: Add export_status table for tracking data export history
-- Date: 2025-07-15

CREATE TABLE export_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    export_timestamp TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'IN_PROGRESS')),
    supabase_url VARCHAR(1000),
    file_name VARCHAR(255) NOT NULL,
    record_count INTEGER,
    cession_count INTEGER,
    error_message VARCHAR(2000),
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on export_timestamp for faster queries
CREATE INDEX idx_export_status_timestamp ON export_status(export_timestamp DESC);

-- Create index on status for filtering
CREATE INDEX idx_export_status_status ON export_status(status);

-- Add comment to table
COMMENT ON TABLE export_status IS 'Tracks the history of data exports to Supabase Storage for mobile client synchronization';
COMMENT ON COLUMN export_status.export_timestamp IS 'When the export operation was performed';
COMMENT ON COLUMN export_status.status IS 'Status of the export: SUCCESS, FAILED, or IN_PROGRESS';
COMMENT ON COLUMN export_status.supabase_url IS 'Public URL of the exported file in Supabase Storage';
COMMENT ON COLUMN export_status.file_name IS 'Name of the exported file';
COMMENT ON COLUMN export_status.record_count IS 'Number of client records in the export';
COMMENT ON COLUMN export_status.cession_count IS 'Number of cession records in the export';
COMMENT ON COLUMN export_status.error_message IS 'Error message if export failed';
COMMENT ON COLUMN export_status.file_size_bytes IS 'Size of the exported file in bytes';