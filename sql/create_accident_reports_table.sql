
-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS reports;

-- Drop table if it exists to avoid conflicts (uncomment if needed)
-- DROP TABLE IF EXISTS reports.accident_reports;

-- Create accident_reports table
CREATE TABLE reports.accident_reports (
    report_id VARCHAR(255) PRIMARY KEY,
    report_date TIMESTAMP WITH TIME ZONE,
    rcf_details JSONB NOT NULL,
    approval_status VARCHAR(50),
    prediction_result VARCHAR(50) DEFAULT 'Pending',
    logic_behind_prediction TEXT,
    predicted_on TIMESTAMP WITH TIME ZONE,
    criteria_version INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for improved query performance
CREATE INDEX idx_report_date ON reports.accident_reports (report_date);
CREATE INDEX idx_approval_status ON reports.accident_reports (approval_status);
CREATE INDEX idx_prediction_result ON reports.accident_reports (prediction_result);
CREATE INDEX idx_predicted_on ON reports.accident_reports (predicted_on);
CREATE INDEX idx_criteria_version ON reports.accident_reports (criteria_version);

-- Create a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION reports.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the timestamp on record update
CREATE TRIGGER update_accident_report_timestamp
BEFORE UPDATE ON reports.accident_reports
FOR EACH ROW
EXECUTE FUNCTION reports.update_timestamp();

-- Create full-text search index on rcf_details for better search performance
-- This requires converting jsonb to text first
CREATE INDEX idx_rcf_details_gin ON reports.accident_reports USING GIN (rcf_details);
CREATE INDEX idx_report_text_search ON reports.accident_reports USING GIN (to_tsvector('english', logic_behind_prediction));

-- Add comments to table and columns
COMMENT ON TABLE reports.accident_reports IS 'Stores accident reports with their evaluation status';
COMMENT ON COLUMN reports.accident_reports.report_id IS 'Unique identifier for the accident report';
COMMENT ON COLUMN reports.accident_reports.report_date IS 'Date when the accident was reported';
COMMENT ON COLUMN reports.accident_reports.rcf_details IS 'JSON structure containing the full accident report details';
COMMENT ON COLUMN reports.accident_reports.approval_status IS 'Original approval status from the source system';
COMMENT ON COLUMN reports.accident_reports.prediction_result IS 'AI-generated prediction result (Approved, Disapproved, Pending, etc.)';
COMMENT ON COLUMN reports.accident_reports.logic_behind_prediction IS 'Detailed explanation of the AI reasoning for the prediction';
COMMENT ON COLUMN reports.accident_reports.predicted_on IS 'Timestamp when the AI prediction was made';
COMMENT ON COLUMN reports.accident_reports.criteria_version IS 'Version number of criteria used for evaluation';
COMMENT ON COLUMN reports.accident_reports.created_at IS 'Timestamp when this record was created';
COMMENT ON COLUMN reports.accident_reports.updated_at IS 'Timestamp when this record was last updated';

-- Add foreign key constraint (optional - only if criteria versioning is in same database)
-- Uncomment if you want referential integrity between accident reports and criteria versions
/*
ALTER TABLE reports.accident_reports
ADD CONSTRAINT fk_criteria_version
FOREIGN KEY (criteria_version)
REFERENCES criteria.criteria_versions (version)
ON DELETE SET NULL;
*/
