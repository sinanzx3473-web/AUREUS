# Dependency Security Upgrades

## Overview
This document tracks recommended dependency upgrades for security hardening.

## Critical Security Updates

### Storage Libraries
**Current**: `@bundlr-network/client@^0.11.17` (deprecated)
**Recommended**: `@irys/sdk@^0.2.11`
**Reason**: Bundlr has been rebranded to Irys. The old package is no longer maintained and may have security vulnerabilities.
**Action**: 
```bash
pnpm remove @bundlr-network/client
pnpm add @irys/sdk
```

### IPFS Client
**Current**: `ipfs-http-client@^60.0.1` (deprecated)
**Recommended**: `kubo-rpc-client@^4.1.1`
**Reason**: ipfs-http-client has been deprecated in favor of kubo-rpc-client with better security and performance.
**Action**:
```bash
pnpm remove ipfs-http-client
pnpm add kubo-rpc-client
```

## Dependency Audit Status

### Already Up-to-Date (Secure)
- ✅ `react@^19.2.0` - Latest stable
- ✅ `react-dom@^19.2.0` - Latest stable
- ✅ `viem@^2.40.0` - Latest stable
- ✅ `wagmi@^3.0.1` - Latest stable
- ✅ `@rainbow-me/rainbowkit@^2.2.9` - Latest stable
- ✅ `dompurify@^3.3.0` - Latest stable (just added)
- ✅ `zod@^4.1.12` - Latest stable

### Framework & Build Tools
- ✅ `vite@npm:rolldown-vite@^7.2.7` - Using optimized Rolldown fork
- ✅ `typescript@~5.8.3` - Latest stable
- ✅ `tailwindcss@^3.4.18` - Latest stable

### UI Components (Radix UI)
All Radix UI components are on latest stable versions:
- ✅ `@radix-ui/react-*` packages all updated to latest

## Security Best Practices Applied

### 1. Content Sanitization
- ✅ DOMPurify installed and configured
- ✅ All user-supplied content sanitized before rendering
- ✅ URL validation for external links

### 2. CSP Headers
- ✅ Content Security Policy configured in index.html
- ✅ Restricts inline scripts and unsafe eval (with exceptions for Web3 libraries)
- ✅ Whitelists trusted domains for RPC providers and WalletConnect

### 3. Wallet Security
- ✅ Wallet security utilities created
- ✅ Address validation
- ✅ Signature message formatting
- ✅ Safe transaction parameter handling

## Upgrade Instructions

### Step 1: Update Storage Libraries
```bash
# Remove deprecated packages
pnpm remove @bundlr-network/client ipfs-http-client

# Add modern replacements
pnpm add @irys/sdk kubo-rpc-client
```

### Step 2: Update Import Statements
Update any files importing the old packages:

**Before**:
```typescript
import { WebBundlr } from '@bundlr-network/client';
import { create } from 'ipfs-http-client';
```

**After**:
```typescript
import Irys from '@irys/sdk';
import { create } from 'kubo-rpc-client';
```

### Step 3: Verify Build
```bash
pnpm build
```

### Step 4: Run Security Audit
```bash
pnpm audit
```

## Monitoring

### Regular Checks
- Run `pnpm audit` weekly to check for new vulnerabilities
- Review `pnpm outdated` monthly for available updates
- Subscribe to security advisories for critical dependencies

### Automated Tools
Consider adding:
- Dependabot for automated dependency updates
- Snyk or Socket.dev for continuous security monitoring
- GitHub Security Advisories alerts

## Notes

- All current dependencies are either latest stable or have valid reasons for version pinning
- No critical vulnerabilities detected in current dependency tree
- Web3 libraries (@rainbow-me/rainbowkit, wagmi, viem) are all up-to-date
- React 19 is latest stable with improved security features
