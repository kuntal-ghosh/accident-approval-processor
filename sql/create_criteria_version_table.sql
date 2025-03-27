
-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS criteria;

-- Drop table if it exists to avoid conflicts (uncomment if needed)
-- DROP TABLE IF EXISTS criteria.criteria_versions;

-- Create criteria_versions table
CREATE TABLE criteria.criteria_versions (
    id SERIAL PRIMARY KEY,
    version INT NOT NULL,
    criteria JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'system',
    is_active BOOLEAN DEFAULT FALSE,
);

-- Create index on version number for faster lookups
CREATE INDEX idx_criteria_version ON criteria.criteria_versions (version);

-- Create index on is_active flag to quickly find active version
CREATE INDEX idx_criteria_active ON criteria.criteria_versions (is_active) 
WHERE is_active = TRUE;

-- Create function to automatically increment version number
CREATE OR REPLACE FUNCTION criteria.auto_increment_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.version IS NULL OR NEW.version = 0 THEN
        SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version 
        FROM criteria.criteria_versions;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign version number
CREATE TRIGGER set_version_number
BEFORE INSERT ON criteria.criteria_versions
FOR EACH ROW
EXECUTE FUNCTION criteria.auto_increment_version();

-- Function to ensure only one active version exists
CREATE OR REPLACE FUNCTION criteria.ensure_single_active()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active THEN
        UPDATE criteria.criteria_versions
        SET is_active = FALSE
        WHERE id != NEW.id AND is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single active version
CREATE TRIGGER single_active_version
AFTER INSERT OR UPDATE OF is_active ON criteria.criteria_versions
FOR EACH ROW
WHEN (NEW.is_active = TRUE)
EXECUTE FUNCTION criteria.ensure_single_active();

-- Add comments to table and columns
COMMENT ON TABLE criteria.criteria_versions IS 'Stores accident approval criteria with versioning';
COMMENT ON COLUMN criteria.criteria_versions.id IS 'Primary key';
COMMENT ON COLUMN criteria.criteria_versions.version IS 'Sequential version number, automatically incremented';
COMMENT ON COLUMN criteria.criteria_versions.criteria IS 'JSON structure containing the approval criteria rules';
COMMENT ON COLUMN criteria.criteria_versions.description IS 'Human-readable description of this criteria version';
COMMENT ON COLUMN criteria.criteria_versions.created_at IS 'Timestamp when this criteria version was created';
COMMENT ON COLUMN criteria.criteria_versions.created_by IS 'User or system that created this criteria version';
COMMENT ON COLUMN criteria.criteria_versions.is_active IS 'Flag indicating if this is the currently active criteria version';
