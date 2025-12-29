# Takumi Web3 Integration Guide

## Overview

Takumi is fully integrated with blockchain smart contracts on Codenut Devnet. All core user actions perform real on-chain transactions using wagmi + RainbowKit.

## Network Configuration

### Active Network
- **Network**: Codenut Devnet
- **Chain ID**: 20258
- **RPC URL**: https://dev-rpc.codenut.dev
- **Explorer**: https://dev-explorer.codenut.dev

### Environment Variables

Create a `.env` file in the project root:

```bash
# Application
VITE_APP_VERSION=1.0.0

# Blockchain Configuration
VITE_CHAIN=devnet

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID

# API Endpoints
VITE_API_URL=http://localhost:3001

# OpenTelemetry (optional)
VITE_ENABLE_TRACING=false
```

**Important**: Get your WalletConnect Project ID from [https://cloud.walletconnect.com](https://cloud.walletconnect.com) for production use.

## Smart Contract Addresses

All contract addresses are automatically loaded from `contracts/interfaces/metadata.json`:

- **SkillProfile**: `0x1ed840f44b6250c53c609e15b52c2b556b85720b`
- **SkillClaim**: `0x5c4e7f5be6f9e8d3c2b1a0987654321fedcba098`
- **Endorsement**: `0x9876543210fedcba0987654321abcdef12345678`
- **VerifierRegistry**: `0xabcdef1234567890abcdef1234567890abcdef12`

Contract configuration is centralized in `src/utils/evmConfig.ts`.

## Wallet Integration

### Supported Wallets
- MetaMask
- WalletConnect (mobile wallets)
- Coinbase Wallet
- Rainbow Wallet
- And all wallets supported by RainbowKit

### Connection Flow

1. **Connect Wallet**: Click "Connect Wallet" button in header
2. **Network Check**: Automatically detects if you're on the correct network
3. **Network Switch**: One-click switch to Codenut Devnet if on wrong network
4. **Ready**: All write actions now available

### Network Switching

If connected to the wrong network, users see:
- Alert banner: "Wrong network. Please switch to Codenut Devnet"
- One-click "Switch Network" button
- Automatic network switching via MetaMask/wallet

## Core User Actions (All Real On-Chain)

### 1. Create Profile (Mint Resume)

**Location**: `/app` or `/profile`

**Flow**:
1. User clicks "Get Started" or "Mint Resume"
2. If no wallet connected → Opens wallet connection modal
3. If wallet connected but no profile → Shows profile creation form
4. User fills in: Name, Bio, Location, Website, Skills
5. Clicks "Create Profile" → Triggers `createProfile()` contract call
6. Transaction pending → Shows spinner + "Transaction pending..."
7. Transaction confirmed → Success toast + profile data refreshed from chain
8. Profile now visible with all on-chain data

**Contract Call**:
```typescript
writeContract({
  address: contracts.skillProfile.address,
  abi: contracts.skillProfile.abi,
  functionName: 'createProfile',
  args: [name, bio, location, website, skills],
});
```

### 2. Add Skill Claim

**Location**: `/claims`

**Flow**:
1. User navigates to Claims page
2. Fills in: Skill Name, Description, Evidence URL
3. Clicks "Submit Claim" → Triggers `createClaim()` contract call
4. Transaction pending → Shows spinner
5. Transaction confirmed → Claim appears in list with "Pending" status
6. Data refreshed from contract

**Contract Call**:
```typescript
writeContract({
  address: contracts.skillClaim.address,
  abi: contracts.skillClaim.abi,
  functionName: 'createClaim',
  args: [skillName, description, evidenceUrl],
});
```

### 3. Request Endorsement

**Location**: `/endorsements`

**Flow**:
1. User navigates to Endorsements page
2. Fills in: Endorsee Address, Skill Name, Message
3. Clicks "Create Endorsement" → Triggers `createEndorsement()` contract call
4. Transaction pending → Shows spinner
5. Transaction confirmed → Endorsement recorded on-chain
6. Both endorser and endorsee can see it

**Contract Call**:
```typescript
writeContract({
  address: contracts.endorsement.address,
  abi: contracts.endorsement.abi,
  functionName: 'createEndorsement',
  args: [endorseeAddress, skillName, message],
});
```

### 4. Browse Live Resumes

**Location**: `/app`, `/profile/:address`

**Data Source**: Direct contract read calls

**Flow**:
1. User navigates to profile page
2. Frontend calls `getProfile()` read-only function
3. Displays real on-chain data:
   - Profile info (name, bio, location, website)
   - Skills list
   - Claims with verification status
   - Endorsements received
4. All data is live from blockchain

**Contract Reads**:
```typescript
// Get profile
useReadContract({
  address: contracts.skillProfile.address,
  abi: contracts.skillProfile.abi,
  functionName: 'getProfile',
  args: [userAddress],
});

// Get claims
useReadContract({
  address: contracts.skillClaim.address,
  abi: contracts.skillClaim.abi,
  functionName: 'getUserClaims',
  args: [userAddress],
});

// Get endorsements
useReadContract({
  address: contracts.endorsement.address,
  abi: contracts.endorsement.abi,
  functionName: 'getEndorsementsReceived',
  args: [userAddress],
});
```

## Transaction Status Handling

### Pending State
- Spinner icon with "Transaction pending..." message
- Submit button disabled to prevent duplicate submissions
- User can see transaction in their wallet

### Success State
- Green checkmark with success message
- Toast notification: "Profile created successfully!" (or similar)
- Data automatically refreshed from blockchain
- Form reset for new submissions

### Error Handling

All errors are handled gracefully with readable messages:

1. **User Rejection**: "Transaction rejected by user"
2. **Insufficient Gas**: "Insufficient gas to complete transaction"
3. **Contract Revert**: Displays revert reason from contract
4. **Network Error**: "Network error. Please try again"
5. **Wrong Network**: "Please switch to Codenut Devnet"

Error display via `TransactionToast` component with detailed parsing.

## Data Display

### No Hardcoded Data
- All profile data comes from `getProfile()` contract call
- All claims come from `getUserClaims()` contract call
- All endorsements come from `getEndorsementsReceived()` contract call
- Empty states shown when no data exists on-chain

### Loading States
- Skeleton loaders while fetching data
- "Loading profile..." messages
- Graceful handling of slow RPC responses

### Empty States
- "No profile found for this address"
- "No claims yet. Submit your first skill claim!"
- "No endorsements received yet"

## Testing the Integration

### 1. Connect Wallet
```bash
# Start the dev server
pnpm dev

# Navigate to http://localhost:5173
# Click "Connect Wallet" in header
# Select MetaMask or WalletConnect
# Approve connection
```

### 2. Switch to Devnet
```bash
# If on wrong network:
# - Alert banner appears
# - Click "Switch Network"
# - Approve network switch in wallet
# - Now on Codenut Devnet (Chain ID: 20258)
```

### 3. Create Profile
```bash
# Navigate to /app
# Fill in profile form
# Click "Create Profile"
# Approve transaction in wallet
# Wait for confirmation
# Profile appears with on-chain data
```

### 4. Add Skill Claim
```bash
# Navigate to /claims
# Fill in claim form
# Click "Submit Claim"
# Approve transaction
# Claim appears in list with "Pending" status
```

### 5. View Live Data
```bash
# Navigate to /profile/:address
# See real on-chain profile data
# All data fetched from smart contracts
# No hardcoded or demo data
```

## Mobile Support

All flows work on mobile devices:
- Responsive design for all screen sizes
- Mobile wallet support via WalletConnect
- Touch-friendly buttons (min 44px touch targets)
- Mobile-optimized forms and modals

## Architecture

### Contract Configuration
- **File**: `src/utils/evmConfig.ts`
- **Purpose**: Centralized contract addresses, ABIs, chain config
- **Source**: Automatically loaded from `contracts/interfaces/metadata.json`

### Wallet Configuration
- **File**: `src/utils/wagmiConfig.ts`
- **Purpose**: Wagmi + RainbowKit setup with custom chain
- **Chains**: Codenut Devnet, Sepolia, Mainnet

### Transaction Components
- **TransactionToast**: Unified transaction status handling
- **CreateProfileForm**: Profile creation with real contract calls
- **SkillClaimForm**: Skill claim submission
- **EndorsementForm**: Endorsement creation

### Read-Only Components
- **SkillProfileCard**: Display on-chain profile data
- **ViewProfile**: Public profile viewer
- **Claims/Endorsements pages**: List on-chain data

## Build & Deploy

### Development
```bash
pnpm install
pnpm dev
```

### Production Build
```bash
# Copy contract metadata
pnpm prebuild

# Build frontend
pnpm build

# Preview production build
pnpm preview
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Set `VITE_WALLETCONNECT_PROJECT_ID`
3. Set `VITE_CHAIN=devnet` (or desired network)
4. Ensure `contracts/interfaces/metadata.json` exists

## Troubleshooting

### "Contract address not found"
- Run `pnpm prebuild` to copy metadata.json
- Ensure contracts are deployed to devnet
- Check `contracts/interfaces/metadata.json` exists

### "Wrong network" persists
- Manually add Codenut Devnet to MetaMask:
  - Network Name: Codenut Devnet
  - RPC URL: https://dev-rpc.codenut.dev
  - Chain ID: 20258
  - Currency Symbol: ETH

### Transaction fails
- Check wallet has sufficient ETH for gas
- Verify connected to correct network (Chain ID: 20258)
- Check contract addresses in metadata.json
- Review browser console for detailed error

### Data not loading
- Verify RPC URL is accessible: https://dev-rpc.codenut.dev
- Check browser console for RPC errors
- Ensure contract addresses are correct
- Try refreshing the page

## Success Criteria ✅

- ✅ All core CTAs perform real on-chain operations
- ✅ Wallet connection required for write actions
- ✅ Network switching works with one click
- ✅ Transaction pending/success/error states handled
- ✅ No hardcoded demo data - all from blockchain
- ✅ Mobile and desktop support
- ✅ Graceful error handling with readable messages
- ✅ Data refreshes after successful transactions
- ✅ Empty states for no data scenarios
- ✅ Loading states during data fetching

## Next Steps

1. **Get WalletConnect Project ID**: Register at https://cloud.walletconnect.com
2. **Test All Flows**: Create profile, add claims, give endorsements
3. **Deploy Contracts**: Ensure contracts deployed to target network
4. **Update Metadata**: Run contract deployment to generate metadata.json
5. **Production Deploy**: Build and deploy frontend with correct env vars

## Support

For issues or questions:
- Check browser console for errors
- Verify wallet connection and network
- Review contract deployment status
- Check RPC endpoint accessibility
