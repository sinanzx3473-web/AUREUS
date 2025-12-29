import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    address: string;
    isAdmin: boolean;
    profileId?: string;
    apiKeyId?: string;
    permissions?: string[];
  } & JwtPayload;
}

export interface Profile {
  id: string;
  wallet_address: string;
  profile_id: number;
  name?: string;
  bio?: string;
  avatar_url?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  block_number: number;
  transaction_hash: string;
}

export interface Skill {
  id: string;
  profile_id: number;
  skill_id: number;
  skill_name: string;
  category?: string;
  description?: string;
  evidence_url?: string;
  metadata: Record<string, any>;
  is_verified: boolean;
  verified_at?: Date;
  verified_by?: string;
  created_at: Date;
  updated_at: Date;
  block_number: number;
  transaction_hash: string;
}

export interface Endorsement {
  id: string;
  endorsement_id: number;
  skill_id: number;
  endorser_address: string;
  endorser_profile_id?: number;
  rating: number;
  comment?: string;
  metadata: Record<string, any>;
  created_at: Date;
  block_number: number;
  transaction_hash: string;
}

export interface Verifier {
  id: string;
  verifier_address: string;
  name: string;
  organization?: string;
  website?: string;
  is_active: boolean;
  reputation_score: number;
  total_verifications: number;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  block_number: number;
  transaction_hash: string;
}

export interface BlockchainEvent {
  id: string;
  event_name: string;
  contract_address: string;
  block_number: number;
  transaction_hash: string;
  log_index: number;
  event_data: Record<string, any>;
  processed: boolean;
  created_at: Date;
}

export interface Notification {
  id: string;
  user_address: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: Date;
  read_at?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IndexerConfig {
  contractAddress: string;
  startBlock: number;
  batchSize: number;
  pollInterval: number;
}

export interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: number;
}
