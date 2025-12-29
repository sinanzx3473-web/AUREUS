# AUREUS Black Card - Apple Wallet Pass System

## Overview

The Black Card is an exclusive Apple Wallet pass for Gold Tier (Tier 3) developers. It features:
- **Matte black design** with gold AUREUS logo
- **ENS name** and tier level display
- **ZK-proof QR code** for privacy-preserving event authentication
- **Zero-knowledge verification** that proves Gold Tier status without revealing wallet address

## Architecture

### Backend Components

1. **WalletPassService** (`src/services/walletPass.service.ts`)
   - Generates `.pkpass` files using `passkit-generator`
   - Creates ZK-proof tokens for QR codes
   - Verifies QR codes at events
   - Manages eligibility checks

2. **WalletPassController** (`src/controllers/walletPass.controller.ts`)
   - `/api/v1/wallet-pass/:address/eligibility` - Check Gold Tier eligibility
   - `/api/v1/wallet-pass/:address/download` - Download .pkpass file
   - `/api/v1/wallet-pass/verify` - Verify QR code at events
   - `/api/v1/wallet-pass/:address/stats` - Get download/scan statistics

3. **Database Tables** (Migration `005_wallet_pass.sql`)
   - `user_tiers` - Stores user tier levels (1=Bronze, 2=Silver, 3=Gold)
   - `wallet_pass_proofs` - ZK-proof commitments for privacy-preserving auth
   - `wallet_pass_downloads` - Tracks when users download their Black Card
   - `wallet_pass_verifications` - Logs QR code scans at events

### Frontend Components

1. **BlackCard Page** (`src/pages/BlackCard.tsx`)
   - Displays eligibility status
   - Shows Black Card features
   - Download button for .pkpass file
   - Statistics dashboard (downloads, event scans)

2. **Profile Integration** (`src/pages/Profile.tsx`)
   - "Black Card" button in profile header
   - Routes to `/profile/black-card`

## ZK-Proof Privacy System

### How It Works

1. **Proof Generation**
   - When a user downloads their Black Card, a cryptographic commitment is created
   - The commitment is a hash of: `wallet_address + tier_level + session_id`
   - This commitment is stored in the database with an expiration (30 days)
   - The QR code contains: `{ proof, publicSignals, timestamp, expiresAt }`

2. **Event Verification**
   - Event organizers scan the QR code
   - The system verifies the proof exists in the database
   - Returns: `{ valid: true, tierLevel: 3 }` **WITHOUT** revealing the wallet address
   - Optionally logs the verification with event details

3. **Privacy Guarantees**
   - The wallet address is **never** included in the QR code
   - Multiple scans cannot be correlated to the same user (fresh session IDs)
   - Event organizers only learn: "This person is Gold Tier"
   - The user's identity remains private

### Production ZK-SNARK Integration

In production, replace the current commitment scheme with actual ZK-SNARKs:

```typescript
// Use libraries like snarkjs, circom, or semaphore
import { generateProof, verifyProof } from 'snarkjs';

// Generate proof that user is in Gold Tier set without revealing which address
const proof = await generateProof(circuit, {
  privateInputs: { walletAddress, tierLevel },
  publicInputs: { tierThreshold: 3 }
});
```

## Apple Wallet Setup

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Pass Type ID Certificate**
   - Create at: https://developer.apple.com/account/resources/identifiers/list/passTypeId
   - Download as `.p12` file
   - Convert to `.pem`: `openssl pkcs12 -in pass.p12 -out signerCert.pem -clcerts -nokeys`
   - Extract key: `openssl pkcs12 -in pass.p12 -out signerKey.pem -nocerts -nodes`

3. **WWDR Certificate**
   - Download from: https://www.apple.com/certificateauthority/
   - Save as `WWDR.pem`

### Environment Variables

```bash
# Apple Wallet Configuration
APPLE_PASS_TYPE_ID=pass.com.aureus.blackcard
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_WWDR_CERT=/path/to/WWDR.pem
APPLE_SIGNER_CERT=/path/to/signerCert.pem
APPLE_SIGNER_KEY=/path/to/signerKey.pem
APPLE_CERT_PASSPHRASE=your_passphrase
```

### Pass Assets

Create the following assets in `backend/pass-models/black-card/`:

1. **icon.png** (29x29px) - AUREUS logo
2. **icon@2x.png** (58x58px) - AUREUS logo retina
3. **logo.png** (160x50px) - AUREUS wordmark
4. **logo@2x.png** (320x100px) - AUREUS wordmark retina
5. **strip.png** (375x123px) - QR code background (auto-generated)
6. **strip@2x.png** (750x246px) - QR code background retina (auto-generated)

**Design Guidelines:**
- Background: Matte black (#000000)
- Logo: Gold foil (#D4AF37)
- Typography: Clean, modern sans-serif
- QR code: Gold on black for premium look

## Tier System Integration

### Promoting Users to Gold Tier

Use the database function to update user tiers:

```sql
-- Promote user to Gold Tier
SELECT update_user_tier('0x1234...', 3);

-- Check current tier
SELECT tier_level, tier_name FROM user_tiers WHERE wallet_address = '0x1234...';
```

### Automatic Tier Calculation

Integrate with your existing systems to automatically promote users:

```typescript
// Example: Promote based on Colosseum wins
const colosseumWins = await getColosseumWins(walletAddress);
if (colosseumWins >= 10) {
  await query('SELECT update_user_tier($1, 3)', [walletAddress]);
}

// Example: Promote based on skill endorsements
const endorsementCount = await getEndorsementCount(walletAddress);
if (endorsementCount >= 50) {
  await query('SELECT update_user_tier($1, 3)', [walletAddress]);
}
```

## API Usage Examples

### Check Eligibility

```bash
curl https://api.aureus.dev/api/v1/wallet-pass/0x1234.../eligibility
```

Response:
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "tierRequired": 3,
    "tierName": "Gold"
  }
}
```

### Download Black Card

```bash
curl -O https://api.aureus.dev/api/v1/wallet-pass/0x1234.../download
```

Returns: `aureus-black-card.pkpass` file

### Verify QR Code at Event

```bash
curl -X POST https://api.aureus.dev/api/v1/wallet-pass/verify \
  -H "Content-Type: application/json" \
  -d '{
    "zkToken": "eyJwcm9vZiI6IjAx...",
    "eventName": "ETHGlobal Hackathon",
    "eventLocation": "San Francisco",
    "verifierId": "organizer-123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "tierLevel": 3,
    "message": "Verified Gold Tier (Level 3) developer"
  }
}
```

## Security Considerations

1. **Certificate Security**
   - Store Apple certificates in secure environment variables or secrets manager
   - Never commit certificates to version control
   - Rotate certificates before expiration

2. **ZK-Proof Expiration**
   - Proofs expire after 30 days
   - Run cleanup function regularly: `SELECT cleanup_expired_proofs();`
   - Consider shorter expiration for high-security events

3. **Rate Limiting**
   - Implement rate limits on download endpoint to prevent abuse
   - Limit verification requests per IP address

4. **Audit Logging**
   - All verifications are logged in `wallet_pass_verifications`
   - Monitor for suspicious patterns (same proof scanned many times)

## Testing

### Development Mode

In development, the service returns mock `.pkpass` files if certificates are not configured:

```typescript
if (process.env.NODE_ENV === 'development') {
  logger.warn('Development mode: Returning mock .pkpass file');
  return Buffer.from('MOCK_PKPASS_FILE_FOR_DEVELOPMENT');
}
```

### Test User Setup

```sql
-- Create test Gold Tier user
INSERT INTO user_tiers (wallet_address, tier_level, tier_name)
VALUES ('0xtest...', 3, 'Gold');

-- Verify eligibility
SELECT * FROM user_tiers WHERE wallet_address = '0xtest...';
```

## Troubleshooting

### "Failed to generate Black Card"

1. Check Apple certificates are properly configured
2. Verify pass model directory exists: `backend/pass-models/black-card/`
3. Ensure all required assets (icon, logo) are present
4. Check certificate permissions and passphrase

### "User is not eligible"

1. Verify user tier in database: `SELECT * FROM user_tiers WHERE wallet_address = '0x...'`
2. Promote user if needed: `SELECT update_user_tier('0x...', 3)`
3. Check tier calculation logic in your application

### QR Code Verification Fails

1. Check proof hasn't expired (30 days)
2. Verify proof exists in database: `SELECT * FROM wallet_pass_proofs WHERE commitment = '...'`
3. Run cleanup to remove expired proofs: `SELECT cleanup_expired_proofs();`

## Future Enhancements

1. **Google Wallet Support**
   - Add Google Pay pass generation
   - Use same ZK-proof system

2. **Dynamic Pass Updates**
   - Update pass when tier changes
   - Push notifications for new achievements

3. **Advanced ZK-SNARKs**
   - Integrate circom circuits
   - Support more complex proofs (skill verification, reputation scores)

4. **NFC Support**
   - Enable tap-to-verify at events
   - Integrate with physical access control systems

## Resources

- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [passkit-generator Documentation](https://www.npmjs.com/package/passkit-generator)
- [ZK-SNARK Resources](https://github.com/matter-labs/awesome-zero-knowledge-proofs)
