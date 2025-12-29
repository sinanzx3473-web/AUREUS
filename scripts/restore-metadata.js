#!/usr/bin/env node
/**
 * Metadata Restoration Script
 * Re-uploads profile metadata to IPFS/Arweave from database cache
 */

const { Pool } = require('pg');
const axios = require('axios');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'takumi',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// API configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';

async function restoreMetadata() {
  console.log('Starting metadata restoration...\n');

  try {
    // Find profiles with missing or corrupted metadata
    const result = await pool.query(`
      SELECT 
        id,
        wallet_address,
        metadata_cache,
        metadata_uri,
        created_at
      FROM profiles
      WHERE metadata_cache IS NOT NULL
      AND (
        metadata_uri IS NULL 
        OR metadata_uri = ''
        OR created_at > NOW() - INTERVAL '7 days'
      )
      ORDER BY created_at DESC
      LIMIT 100
    `);

    console.log(`Found ${result.rows.length} profiles to restore\n`);

    let successCount = 0;
    let failCount = 0;

    for (const profile of result.rows) {
      try {
        console.log(`Processing profile ${profile.id}...`);

        // Parse metadata cache
        const metadata = JSON.parse(profile.metadata_cache);

        // Re-upload to IPFS
        const uploadResponse = await axios.post(
          `${API_URL}/api/v1/storage/upload`,
          {
            data: metadata,
            storage: 'ipfs',
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const newUri = uploadResponse.data.uri;
        console.log(`  ✓ Uploaded to: ${newUri}`);

        // Update database with new URI
        await pool.query(
          'UPDATE profiles SET metadata_uri = $1 WHERE id = $2',
          [newUri, profile.id]
        );

        console.log(`  ✓ Database updated\n`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Failed to restore profile ${profile.id}:`, error.message);
        failCount++;
      }
    }

    console.log('\n========================================');
    console.log('Metadata Restoration Summary');
    console.log('========================================');
    console.log(`Total profiles: ${result.rows.length}`);
    console.log(`Successfully restored: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Fatal error during metadata restoration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run restoration
restoreMetadata().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
