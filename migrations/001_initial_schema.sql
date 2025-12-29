-- Takumi Database Schema
-- Initial migration for skill verification platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT wallet_address_lowercase CHECK (wallet_address = LOWER(wallet_address))
);

CREATE INDEX idx_users_wallet ON users(wallet_address);

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  profile_id BIGINT UNIQUE NOT NULL,
  name VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL
);

CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX idx_profiles_profile_id ON profiles(profile_id);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id BIGINT NOT NULL REFERENCES profiles(profile_id),
  skill_id BIGINT UNIQUE NOT NULL,
  skill_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  evidence_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by VARCHAR(42),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL
);

CREATE INDEX idx_skills_profile_id ON skills(profile_id);
CREATE INDEX idx_skills_skill_id ON skills(skill_id);
CREATE INDEX idx_skills_verified ON skills(is_verified);
CREATE INDEX idx_skills_category ON skills(category);

-- Endorsements table
CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endorsement_id BIGINT UNIQUE NOT NULL,
  skill_id BIGINT NOT NULL REFERENCES skills(skill_id),
  endorser_address VARCHAR(42) NOT NULL,
  endorser_profile_id BIGINT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL
);

CREATE INDEX idx_endorsements_skill_id ON endorsements(skill_id);
CREATE INDEX idx_endorsements_endorser ON endorsements(endorser_address);
CREATE INDEX idx_endorsements_created_at ON endorsements(created_at DESC);

-- Verifiers table
CREATE TABLE verifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verifier_address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  website TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  reputation_score INTEGER DEFAULT 0,
  total_verifications INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL
);

CREATE INDEX idx_verifiers_address ON verifiers(verifier_address);
CREATE INDEX idx_verifiers_active ON verifiers(is_active);

-- Verification requests table
CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id BIGINT NOT NULL REFERENCES skills(skill_id),
  requester_address VARCHAR(42) NOT NULL,
  verifier_address VARCHAR(42),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  request_message TEXT,
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_verification_requests_skill_id ON verification_requests(skill_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_requests_verifier ON verification_requests(verifier_address);

-- Blockchain events log
CREATE TABLE blockchain_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name VARCHAR(100) NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  log_index INTEGER NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_hash, log_index)
);

CREATE INDEX idx_blockchain_events_block ON blockchain_events(block_number);
CREATE INDEX idx_blockchain_events_processed ON blockchain_events(processed);
CREATE INDEX idx_blockchain_events_contract ON blockchain_events(contract_address);
CREATE INDEX idx_blockchain_events_name ON blockchain_events(event_name);

-- Indexer state table
CREATE TABLE indexer_state (
  id SERIAL PRIMARY KEY,
  contract_address VARCHAR(42) UNIQUE NOT NULL,
  last_indexed_block BIGINT NOT NULL DEFAULT 0,
  last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_syncing BOOLEAN DEFAULT FALSE,
  error_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address VARCHAR(42) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user ON notifications(user_address);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- API keys table (for admin/service authentication)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verifiers_updated_at BEFORE UPDATE ON verifiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
