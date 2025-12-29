-- Migration: Wallet Pass System for Black Card Feature
-- Description: Tables for Apple Wallet pass generation and ZK-proof authentication

-- Table: user_tiers
-- Stores user tier levels (1=Bronze, 2=Silver, 3=Gold)
CREATE TABLE IF NOT EXISTS user_tiers (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  tier_level INTEGER NOT NULL DEFAULT 1,
  tier_name VARCHAR(50) NOT NULL DEFAULT 'Bronze',
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast tier lookups
CREATE INDEX IF NOT EXISTS idx_user_tiers_wallet ON user_tiers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_tiers_level ON user_tiers(tier_level);

-- Table: wallet_pass_proofs
-- Stores ZK-proof commitments for privacy-preserving authentication
CREATE TABLE IF NOT EXISTS wallet_pass_proofs (
  id SERIAL PRIMARY KEY,
  commitment VARCHAR(64) NOT NULL UNIQUE,
  wallet_address VARCHAR(42) NOT NULL,
  tier_level INTEGER NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for proof verification
CREATE INDEX IF NOT EXISTS idx_wallet_pass_proofs_commitment ON wallet_pass_proofs(commitment);
CREATE INDEX IF NOT EXISTS idx_wallet_pass_proofs_expires ON wallet_pass_proofs(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallet_pass_proofs_wallet ON wallet_pass_proofs(wallet_address);

-- Table: wallet_pass_downloads
-- Tracks when users download their Black Card
CREATE TABLE IF NOT EXISTS wallet_pass_downloads (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  downloaded_at TIMESTAMP DEFAULT NOW()
);

-- Index for download tracking
CREATE INDEX IF NOT EXISTS idx_wallet_pass_downloads_wallet ON wallet_pass_downloads(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_pass_downloads_date ON wallet_pass_downloads(downloaded_at);

-- Table: wallet_pass_verifications
-- Logs when QR codes are scanned at events
CREATE TABLE IF NOT EXISTS wallet_pass_verifications (
  id SERIAL PRIMARY KEY,
  commitment VARCHAR(64) NOT NULL,
  verified_at TIMESTAMP DEFAULT NOW(),
  event_name VARCHAR(255),
  event_location VARCHAR(255),
  verifier_id VARCHAR(255)
);

-- Index for verification logs
CREATE INDEX IF NOT EXISTS idx_wallet_pass_verifications_commitment ON wallet_pass_verifications(commitment);
CREATE INDEX IF NOT EXISTS idx_wallet_pass_verifications_date ON wallet_pass_verifications(verified_at);

-- Function: Update user tier based on activity
-- This can be called by other systems to promote users to Gold Tier
CREATE OR REPLACE FUNCTION update_user_tier(
  p_wallet_address VARCHAR(42),
  p_tier_level INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_tiers (wallet_address, tier_level, tier_name, updated_at)
  VALUES (
    LOWER(p_wallet_address),
    p_tier_level,
    CASE 
      WHEN p_tier_level = 1 THEN 'Bronze'
      WHEN p_tier_level = 2 THEN 'Silver'
      WHEN p_tier_level = 3 THEN 'Gold'
      ELSE 'Unknown'
    END,
    NOW()
  )
  ON CONFLICT (wallet_address) 
  DO UPDATE SET 
    tier_level = p_tier_level,
    tier_name = CASE 
      WHEN p_tier_level = 1 THEN 'Bronze'
      WHEN p_tier_level = 2 THEN 'Silver'
      WHEN p_tier_level = 3 THEN 'Gold'
      ELSE 'Unknown'
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Cleanup function: Remove expired proofs
CREATE OR REPLACE FUNCTION cleanup_expired_proofs() RETURNS VOID AS $$
BEGIN
  DELETE FROM wallet_pass_proofs WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add ENS name column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'ens_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ens_name VARCHAR(255);
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE user_tiers IS 'Stores user tier levels for Black Card eligibility';
COMMENT ON TABLE wallet_pass_proofs IS 'ZK-proof commitments for privacy-preserving authentication';
COMMENT ON TABLE wallet_pass_downloads IS 'Tracks Black Card wallet pass downloads';
COMMENT ON TABLE wallet_pass_verifications IS 'Logs QR code scans at physical events';
