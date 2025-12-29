-- Migration to add created_by column and prepare for hashed API keys
-- This migration updates the api_keys table to support proper key management

-- Add created_by column to track who created the API key
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_by VARCHAR(42);

-- Add description column for better key management
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS description TEXT;

-- Add last_rotated_at for key rotation tracking
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMP WITH TIME ZONE;

-- Create index on created_by for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);

-- Update key_hash column comment to clarify it stores bcrypt hashes
COMMENT ON COLUMN api_keys.key_hash IS 'Bcrypt hash of the API key (never store plaintext keys)';

-- Add constraint to ensure key_hash is not empty
ALTER TABLE api_keys ADD CONSTRAINT key_hash_not_empty CHECK (length(key_hash) > 0);

-- IMPORTANT: After this migration, all existing API keys in key_hash column
-- are treated as plaintext and MUST be regenerated with proper hashing.
-- The application will handle this migration automatically on first use.
