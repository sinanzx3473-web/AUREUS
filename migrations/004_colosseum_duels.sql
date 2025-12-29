-- Migration: Create colosseum_duels table for tracking competitive coding duels
-- This table stores duel data indexed from TheColosseum smart contract events

CREATE TABLE IF NOT EXISTS colosseum_duels (
  id SERIAL PRIMARY KEY,
  duel_id BIGINT NOT NULL UNIQUE,
  challenger VARCHAR(42) NOT NULL,
  opponent VARCHAR(42) NOT NULL,
  wager_amount NUMERIC(78, 0) NOT NULL,
  skill_tag VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  challenger_solution TEXT,
  opponent_solution TEXT,
  winner VARCHAR(42),
  winner_payout NUMERIC(78, 0),
  dao_fee NUMERIC(78, 0),
  burned_amount NUMERIC(78, 0),
  judge_reasoning TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  tx_hash VARCHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('Pending', 'Active', 'Judging', 'Resolved', 'Cancelled'))
);

-- Indexes for efficient querying
CREATE INDEX idx_colosseum_challenger ON colosseum_duels(challenger);
CREATE INDEX idx_colosseum_opponent ON colosseum_duels(opponent);
CREATE INDEX idx_colosseum_winner ON colosseum_duels(winner);
CREATE INDEX idx_colosseum_status ON colosseum_duels(status);
CREATE INDEX idx_colosseum_skill_tag ON colosseum_duels(skill_tag);
CREATE INDEX idx_colosseum_created_at ON colosseum_duels(created_at DESC);

-- Composite index for user duel history
CREATE INDEX idx_colosseum_user_duels ON colosseum_duels(challenger, opponent, status);

-- Comments
COMMENT ON TABLE colosseum_duels IS 'Stores competitive coding duel data from TheColosseum smart contract';
COMMENT ON COLUMN colosseum_duels.duel_id IS 'Unique duel ID from smart contract';
COMMENT ON COLUMN colosseum_duels.wager_amount IS 'Amount staked by each participant in wei';
COMMENT ON COLUMN colosseum_duels.status IS 'Current status: Pending, Active, Judging, Resolved, Cancelled';
COMMENT ON COLUMN colosseum_duels.judge_reasoning IS 'AI analysis from AgentOracle explaining the verdict';
