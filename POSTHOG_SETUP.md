# PostHog Analytics Setup

## Overview
PostHog is integrated for privacy-friendly analytics tracking. The implementation respects user privacy while providing essential growth metrics.

## Privacy-First Configuration
- **No autocapture**: Only explicitly tracked events are captured
- **No session recording**: User sessions are not recorded
- **Respect DNT**: Do Not Track browser settings are honored
- **Minimal data**: Only essential event data is tracked

## Tracked Events

### 1. Wallet Connected
**Event Name**: `Wallet Connected`

**Triggered**: When a user successfully connects their wallet

**Properties**:
- `wallet_type`: Name of the wallet connector (e.g., "MetaMask", "WalletConnect")
- `address_prefix`: First 6 characters of wallet address (for privacy)

**Location**: `src/components/WalletInfo.tsx`

### 2. Skill Verified
**Event Name**: `Skill Verified`

**Triggered**: When a user successfully submits a skill claim

**Properties**:
- `skill_name`: Name of the skill being verified
- `verification_method`: Whether evidence was provided (`with_evidence` or `without_evidence`)

**Location**: `src/components/SkillClaimForm.tsx`

### 3. Bounty Claimed
**Event Name**: `Bounty Claimed`

**Triggered**: When a user successfully claims a bounty reward

**Properties**:
- `bounty_id`: Unique identifier of the bounty
- `bounty_title`: Title of the bounty
- `reward`: Reward amount and token

**Location**: `src/hooks/useClaimBounty.ts`

### 4. Bounty Applied
**Event Name**: `Bounty Applied`

**Triggered**: When a user applies for a bounty

**Properties**:
- `bounty_id`: Unique identifier of the bounty
- `bounty_title`: Title of the bounty
- `reward`: Reward amount
- `category`: Bounty category
- `difficulty`: Difficulty level
- `required_tier`: Required verification tier

**Location**: `src/pages/Bounties.tsx`

## Setup Instructions

### 1. Get PostHog API Key
1. Sign up at [PostHog](https://app.posthog.com)
2. Create a new project
3. Copy your API key from Project Settings

### 2. Configure Environment Variables
Add to your `.env` file:

```bash
# PostHog Analytics
VITE_POSTHOG_API_KEY=phc_your_api_key_here
VITE_POSTHOG_HOST=https://app.posthog.com
```

### 3. Verify Integration
1. Start your development server
2. Open browser console
3. Look for "PostHog initialized" message
4. Perform tracked actions (connect wallet, submit skill claim)
5. Check PostHog dashboard for events

## Growth Metrics

### Key Metrics to Track
- **User Acquisition**: Track wallet connections over time
- **Engagement**: Monitor skill verification submissions
- **Monetization**: Track bounty claims and applications
- **Retention**: Analyze repeat user actions

### Example Investor Metrics
- "40% week-over-week growth in wallet connections"
- "500 skill verifications submitted this month"
- "Average 3.2 bounty applications per active user"
- "85% of users who connect wallet submit at least one skill claim"

## Custom Event Tracking

To add new events, use the `trackEvent` function:

```typescript
import { trackEvent } from '@/lib/posthog';

trackEvent('Custom Event Name', {
  property1: 'value1',
  property2: 'value2',
});
```

## User Identification (Optional)

For authenticated users, you can identify them:

```typescript
import { identifyUser } from '@/lib/posthog';

identifyUser(userId, {
  email: 'user@example.com',
  tier: 3,
  // other user properties
});
```

## Privacy Compliance

### GDPR Compliance
- Users can opt-out via browser DNT settings
- No personal data is collected without consent
- Only anonymized wallet prefixes are tracked

### Data Retention
- Configure retention policies in PostHog dashboard
- Recommended: 90 days for event data

## Troubleshooting

### Events Not Appearing
1. Check API key is set correctly
2. Verify PostHog is initialized (check console)
3. Ensure events are triggered (add console.log for debugging)
4. Check PostHog dashboard filters

### Development Mode
In development, PostHog logs initialization to console. In production, these logs are suppressed.

## Additional Resources
- [PostHog Documentation](https://posthog.com/docs)
- [Privacy Best Practices](https://posthog.com/docs/privacy)
- [Event Tracking Guide](https://posthog.com/docs/integrate/client/js)
