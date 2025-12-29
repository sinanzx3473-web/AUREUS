#!/usr/bin/env tsx
/**
 * Script to generate and store a new API key
 * Usage: tsx scripts/generate-api-key.ts <name> [description] [expiresInDays]
 */

import dotenv from 'dotenv';
import { generateApiKey, hashApiKey } from '../src/utils/crypto';
import { query } from '../src/config/database';
import { logger } from '../src/utils/logger';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: tsx scripts/generate-api-key.ts <name> [description] [expiresInDays]');
    console.error('Example: tsx scripts/generate-api-key.ts "Production API Key" "Main production key" 365');
    process.exit(1);
  }

  const name = args[0];
  const description = args[1] || null;
  const expiresInDays = args[2] ? parseInt(args[2]) : null;

  try {
    console.log('Generating new API key...\n');

    // Generate API key
    const apiKey = generateApiKey('live');
    console.log('✓ Generated API key');

    // Hash the key
    const keyHash = await hashApiKey(apiKey);
    console.log('✓ Hashed API key');

    // Calculate expiration
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expiresInDays);
      expiresAt = expirationDate;
    }

    // Store in database
    const result = await query(
      `INSERT INTO api_keys (key_hash, name, description, created_by, expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, created_at, expires_at`,
      [keyHash, name, description, 'system', expiresAt]
    );

    const keyData = result.rows[0];
    console.log('✓ Stored in database\n');

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('API KEY GENERATED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nID:          ${keyData.id}`);
    console.log(`Name:        ${keyData.name}`);
    console.log(`Created:     ${keyData.created_at}`);
    console.log(`Expires:     ${keyData.expires_at || 'Never'}`);
    console.log('\n⚠️  IMPORTANT: Store this API key securely. It will NOT be shown again!\n');
    console.log(`API Key:     ${apiKey}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Usage: Include this key in the X-API-Key header for admin endpoints');
    console.log('Example: curl -H "X-API-Key: ' + apiKey + '" https://api.example.com/admin\n');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to generate API key', error);
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
