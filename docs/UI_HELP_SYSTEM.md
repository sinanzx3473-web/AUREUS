# UI Help System & Tooltips Documentation

## Overview

This document specifies the in-app help system, tooltips, error messages, and user guidance for the Takumi platform. It ensures users have contextual help at every step of their journey.

---

## Table of Contents

1. [Help System Architecture](#help-system-architecture)
2. [Tooltip Specifications](#tooltip-specifications)
3. [Error Messages](#error-messages)
4. [Onboarding Flow](#onboarding-flow)
5. [Contextual Help](#contextual-help)
6. [Help Center](#help-center)
7. [Implementation Guide](#implementation-guide)

---

## Help System Architecture

### Components

```
UI Help System
├── Tooltips (hover/focus hints)
├── Info Icons (click for detailed help)
├── Inline Help Text (always visible guidance)
├── Error Messages (validation and system errors)
├── Onboarding Tour (first-time user guide)
├── Help Center (searchable documentation)
└── Contextual Tutorials (step-by-step guides)
```

### Design Principles

1. **Progressive Disclosure**: Show basic info by default, detailed help on demand
2. **Contextual**: Help appears where and when users need it
3. **Non-intrusive**: Doesn't block primary workflows
4. **Accessible**: Keyboard navigable, screen reader friendly
5. **Consistent**: Uniform styling and behavior across platform

---

## Tooltip Specifications

### Tooltip Component

```typescript
// src/components/Tooltip.tsx
interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
  delay?: number;
  trigger?: 'hover' | 'click' | 'focus';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  maxWidth = 300,
  delay = 200,
  trigger = 'hover'
}) => {
  // Implementation using Radix UI or similar
};
```

### Wallet Connection Tooltips

**Connect Wallet Button**:
```typescript
<Tooltip content="Connect your Ethereum wallet to access Takumi features">
  <Button>Connect Wallet</Button>
</Tooltip>
```

**Network Selector**:
```typescript
<Tooltip content="Select the blockchain network. Sepolia is recommended for testing.">
  <NetworkSelector />
</Tooltip>
```

**Wallet Address Display**:
```typescript
<Tooltip content="Your connected wallet address. Click to copy.">
  <AddressDisplay address={address} />
</Tooltip>
```

### Profile Creation Tooltips

**Name Field**:
```typescript
<Tooltip content="Your display name (max 100 characters). This will be visible to all users.">
  <Input 
    label="Name"
    placeholder="Enter your name"
  />
</Tooltip>
```

**Bio Field**:
```typescript
<Tooltip content="Tell others about yourself (max 1000 characters). Include your expertise, interests, and professional background.">
  <Textarea 
    label="Bio"
    placeholder="Describe yourself..."
  />
</Tooltip>
```

**Metadata URI**:
```typescript
<Tooltip 
  content={
    <div>
      <p>Your profile metadata is stored on IPFS for decentralization.</p>
      <ul>
        <li>Permanent and censorship-resistant</li>
        <li>Accessible from any IPFS gateway</li>
        <li>Automatically uploaded when you save</li>
      </ul>
    </div>
  }
  maxWidth={400}
>
  <InfoIcon />
</Tooltip>
```

### Skill Claim Tooltips

**Skill Name**:
```typescript
<Tooltip content="The skill you want to claim (e.g., 'Solidity', 'React', 'UI Design')">
  <Input label="Skill Name" />
</Tooltip>
```

**Proficiency Level**:
```typescript
<Tooltip 
  content={
    <div>
      <p><strong>Beginner:</strong> Learning the basics</p>
      <p><strong>Intermediate:</strong> Can work independently</p>
      <p><strong>Advanced:</strong> Expert-level knowledge</p>
      <p><strong>Expert:</strong> Industry-recognized authority</p>
    </div>
  }
>
  <Select label="Proficiency Level" />
</Tooltip>
```

**Evidence URI**:
```typescript
<Tooltip 
  content="Link to proof of your skill (GitHub repo, portfolio, certificate, etc.). Must be a valid URL."
  maxWidth={350}
>
  <Input 
    label="Evidence URL"
    placeholder="https://github.com/yourname/project"
  />
</Tooltip>
```

**Gas Estimate**:
```typescript
<Tooltip 
  content={
    <div>
      <p>Estimated transaction cost: {gasEstimate} ETH</p>
      <p>This fee goes to blockchain validators, not Takumi.</p>
      <a href="/docs/faq#gas-fees">Learn more about gas fees</a>
    </div>
  }
>
  <GasEstimate value={gasEstimate} />
</Tooltip>
```

### Endorsement Tooltips

**Endorsee Address**:
```typescript
<Tooltip content="The Ethereum address of the person you're endorsing. Must be a valid address.">
  <Input 
    label="Endorsee Address"
    placeholder="0x..."
  />
</Tooltip>
```

**Skill to Endorse**:
```typescript
<Tooltip content="Select the skill you're endorsing. You can only endorse skills the user has claimed.">
  <Select label="Skill" />
</Tooltip>
```

**Comment**:
```typescript
<Tooltip content="Optional: Add a comment explaining why you're endorsing this skill (max 500 characters)">
  <Textarea 
    label="Comment (optional)"
    placeholder="I worked with this person on..."
  />
</Tooltip>
```

**Verifier Badge**:
```typescript
<Tooltip content="This endorsement is from a verified verifier, giving it higher credibility.">
  <VerifiedBadge />
</Tooltip>
```

---

## Error Messages

### Validation Errors

**Empty Required Field**:
```typescript
{
  field: 'name',
  message: 'Name is required',
  type: 'required'
}
```

**Field Too Long**:
```typescript
{
  field: 'bio',
  message: 'Bio must be 1000 characters or less (currently 1250)',
  type: 'maxLength',
  details: { max: 1000, current: 1250 }
}
```

**Invalid Format**:
```typescript
{
  field: 'address',
  message: 'Invalid Ethereum address format. Must start with 0x and be 42 characters.',
  type: 'format',
  example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
}
```

### Transaction Errors

**User Rejected**:
```typescript
<ErrorMessage
  title="Transaction Rejected"
  message="You rejected the transaction in your wallet. No changes were made."
  action={
    <Button onClick={retry}>Try Again</Button>
  }
/>
```

**Insufficient Gas**:
```typescript
<ErrorMessage
  title="Insufficient Gas"
  message={`You need at least ${requiredGas} ETH to complete this transaction. Your balance: ${userBalance} ETH.`}
  action={
    <Button onClick={openFaucet}>Get Testnet ETH</Button>
  }
  severity="error"
/>
```

**Contract Paused**:
```typescript
<ErrorMessage
  title="Service Temporarily Unavailable"
  message="The smart contract is currently paused for maintenance. Please try again later."
  severity="warning"
  dismissible={false}
/>
```

**Wrong Network**:
```typescript
<ErrorMessage
  title="Wrong Network"
  message={`Please switch to ${expectedNetwork} in your wallet. Currently connected to ${currentNetwork}.`}
  action={
    <Button onClick={switchNetwork}>Switch Network</Button>
  }
  severity="error"
/>
```

### System Errors

**API Error**:
```typescript
<ErrorMessage
  title="Connection Error"
  message="Unable to connect to Takumi servers. Please check your internet connection and try again."
  action={
    <Button onClick={retry}>Retry</Button>
  }
  severity="error"
/>
```

**IPFS Upload Failed**:
```typescript
<ErrorMessage
  title="Upload Failed"
  message="Failed to upload metadata to IPFS. This might be a temporary issue."
  action={
    <>
      <Button onClick={retry}>Retry Upload</Button>
      <Button variant="secondary" onClick={useDifferentGateway}>
        Try Different Gateway
      </Button>
    </>
  }
  severity="error"
/>
```

---

## Onboarding Flow

### First-Time User Tour

**Step 1: Welcome**
```typescript
<OnboardingStep
  title="Welcome to Takumi!"
  content="Takumi is a decentralized platform for verifying professional skills on the blockchain."
  image="/images/onboarding/welcome.svg"
  actions={
    <>
      <Button onClick={nextStep}>Get Started</Button>
      <Button variant="text" onClick={skipTour}>Skip Tour</Button>
    </>
  }
/>
```

**Step 2: Connect Wallet**
```typescript
<OnboardingStep
  title="Connect Your Wallet"
  content="You'll need an Ethereum wallet like MetaMask to use Takumi. Don't have one? We'll help you set it up."
  highlight="connect-wallet-button"
  actions={
    <>
      <Button onClick={connectWallet}>Connect Wallet</Button>
      <Button variant="secondary" onClick={setupWallet}>
        Setup Wallet
      </Button>
    </>
  }
/>
```

**Step 3: Create Profile**
```typescript
<OnboardingStep
  title="Create Your Profile"
  content="Your profile is stored on the blockchain and IPFS, making it permanent and portable."
  highlight="create-profile-section"
  actions={
    <Button onClick={nextStep}>Create Profile</Button>
  }
/>
```

**Step 4: Claim Skills**
```typescript
<OnboardingStep
  title="Claim Your Skills"
  content="Add skills to your profile with evidence. Verifiers can then endorse your claims."
  highlight="add-skill-button"
  actions={
    <Button onClick={nextStep}>Add First Skill</Button>
  }
/>
```

**Step 5: Get Endorsements**
```typescript
<OnboardingStep
  title="Get Endorsed"
  content="Share your profile with colleagues and employers to receive endorsements that boost your credibility."
  actions={
    <>
      <Button onClick={shareProfile}>Share Profile</Button>
      <Button variant="secondary" onClick={finishTour}>
        Finish Tour
      </Button>
    </>
  }
/>
```

### Progress Indicator

```typescript
<OnboardingProgress
  steps={[
    { id: 'welcome', label: 'Welcome', completed: true },
    { id: 'wallet', label: 'Connect Wallet', completed: true },
    { id: 'profile', label: 'Create Profile', completed: false },
    { id: 'skills', label: 'Add Skills', completed: false },
    { id: 'endorsements', label: 'Get Endorsed', completed: false }
  ]}
  currentStep="profile"
/>
```

---

## Contextual Help

### Profile Completeness Widget

```typescript
<ProfileCompleteness
  score={65}
  suggestions={[
    {
      title: 'Add a bio',
      description: 'Tell others about yourself',
      action: () => navigateTo('/profile/edit'),
      completed: false
    },
    {
      title: 'Claim your first skill',
      description: 'Add skills with evidence',
      action: () => navigateTo('/claims/new'),
      completed: false
    },
    {
      title: 'Get an endorsement',
      description: 'Share your profile to get endorsed',
      action: () => navigateTo('/share'),
      completed: false
    }
  ]}
/>
```

### Empty States with Guidance

**No Skills Yet**:
```typescript
<EmptyState
  icon={<SkillIcon />}
  title="No skills claimed yet"
  description="Start building your verifiable skill profile by claiming your first skill."
  action={
    <Button onClick={() => navigateTo('/claims/new')}>
      Claim Your First Skill
    </Button>
  }
  helpLink="/docs/how-to-claim-skills"
/>
```

**No Endorsements**:
```typescript
<EmptyState
  icon={<EndorsementIcon />}
  title="No endorsements yet"
  description="Share your profile with colleagues to receive endorsements."
  action={
    <Button onClick={shareProfile}>Share Profile</Button>
  }
  secondaryAction={
    <Button variant="text" onClick={() => navigateTo('/docs/endorsements')}>
      Learn About Endorsements
    </Button>
  }
/>
```

### Inline Help Sections

**Gas Fee Explanation**:
```typescript
<InlineHelp
  title="What are gas fees?"
  content={
    <div>
      <p>Gas fees are transaction costs paid to blockchain validators.</p>
      <ul>
        <li>Fees vary based on network congestion</li>
        <li>Takumi doesn't receive any gas fees</li>
        <li>Use testnets for free transactions</li>
      </ul>
      <a href="/docs/faq#gas-fees">Learn more</a>
    </div>
  }
  collapsible
  defaultExpanded={false}
/>
```

**IPFS Explanation**:
```typescript
<InlineHelp
  title="Why IPFS?"
  content={
    <div>
      <p>IPFS (InterPlanetary File System) provides:</p>
      <ul>
        <li>Decentralized storage</li>
        <li>Content addressing (files identified by hash)</li>
        <li>Censorship resistance</li>
        <li>Permanent availability (when pinned)</li>
      </ul>
    </div>
  }
/>
```

---

## Help Center

### Search Interface

```typescript
<HelpCenter>
  <SearchBar
    placeholder="Search help articles..."
    onSearch={handleSearch}
    suggestions={[
      'How to connect wallet',
      'What are gas fees',
      'How to claim a skill',
      'Getting endorsements'
    ]}
  />
  
  <CategoryList>
    <Category
      title="Getting Started"
      articles={[
        { title: 'Creating Your Profile', url: '/help/create-profile' },
        { title: 'Connecting Your Wallet', url: '/help/connect-wallet' },
        { title: 'Understanding Gas Fees', url: '/help/gas-fees' }
      ]}
    />
    
    <Category
      title="Skills & Claims"
      articles={[
        { title: 'How to Claim a Skill', url: '/help/claim-skill' },
        { title: 'Providing Evidence', url: '/help/evidence' },
        { title: 'Skill Verification Process', url: '/help/verification' }
      ]}
    />
    
    <Category
      title="Endorsements"
      articles={[
        { title: 'Getting Endorsed', url: '/help/get-endorsed' },
        { title: 'Endorsing Others', url: '/help/endorse-others' },
        { title: 'Verifier vs Peer Endorsements', url: '/help/endorsement-types' }
      ]}
    />
    
    <Category
      title="Troubleshooting"
      articles={[
        { title: 'Transaction Failed', url: '/help/tx-failed' },
        { title: 'Wrong Network', url: '/help/wrong-network' },
        { title: 'IPFS Upload Issues', url: '/help/ipfs-issues' }
      ]}
    />
  </CategoryList>
  
  <ContactSupport>
    <p>Can't find what you're looking for?</p>
    <Button onClick={openSupportChat}>Contact Support</Button>
  </ContactSupport>
</HelpCenter>
```

### Article Template

```typescript
<HelpArticle
  title="How to Claim a Skill"
  lastUpdated="2025-02-20"
  readTime="3 min"
  content={
    <>
      <Section>
        <h2>Overview</h2>
        <p>Claiming a skill creates a verifiable record on the blockchain...</p>
      </Section>
      
      <Section>
        <h2>Step-by-Step Guide</h2>
        <ol>
          <li>Navigate to "Claims" page</li>
          <li>Click "New Claim"</li>
          <li>Fill in skill details</li>
          <li>Provide evidence URL</li>
          <li>Confirm transaction in wallet</li>
        </ol>
      </Section>
      
      <Section>
        <h2>Tips</h2>
        <ul>
          <li>Use specific skill names (e.g., "React" not "Frontend")</li>
          <li>Provide strong evidence (GitHub, certificates, etc.)</li>
          <li>Be honest about proficiency level</li>
        </ul>
      </Section>
      
      <Section>
        <h2>Related Articles</h2>
        <ul>
          <li><a href="/help/evidence">Providing Evidence</a></li>
          <li><a href="/help/verification">Verification Process</a></li>
        </ul>
      </Section>
    </>
  }
  helpful={
    <FeedbackButtons
      onHelpful={() => trackEvent('article_helpful')}
      onNotHelpful={() => trackEvent('article_not_helpful')}
    />
  }
/>
```

---

## Implementation Guide

### Tooltip Library Setup

```bash
npm install @radix-ui/react-tooltip
```

```typescript
// src/components/Tooltip.tsx
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  maxWidth = 300,
  delay = 200
}) => {
  return (
    <TooltipPrimitive.Root delayDuration={delay}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={placement}
          className="tooltip-content"
          style={{ maxWidth }}
        >
          {content}
          <TooltipPrimitive.Arrow className="tooltip-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};
```

### Error Message Component

```typescript
// src/components/ErrorMessage.tsx
interface ErrorMessageProps {
  title: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
  action?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  severity = 'error',
  action,
  dismissible = true,
  onDismiss
}) => {
  return (
    <div className={`error-message error-message--${severity}`}>
      <div className="error-message__icon">
        {severity === 'error' && <ErrorIcon />}
        {severity === 'warning' && <WarningIcon />}
        {severity === 'info' && <InfoIcon />}
      </div>
      
      <div className="error-message__content">
        <h4 className="error-message__title">{title}</h4>
        <p className="error-message__message">{message}</p>
        {action && <div className="error-message__actions">{action}</div>}
      </div>
      
      {dismissible && (
        <button 
          className="error-message__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
};
```

### Onboarding Tour

```typescript
// src/components/OnboardingTour.tsx
import { useState } from 'react';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Takumi!',
    content: 'Decentralized skill verification on the blockchain.',
    target: null
  },
  {
    id: 'wallet',
    title: 'Connect Your Wallet',
    content: 'Connect MetaMask or another Ethereum wallet.',
    target: '#connect-wallet-button'
  },
  // ... more steps
];

export const OnboardingTour: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(
    !localStorage.getItem('onboarding_completed')
  );
  
  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };
  
  const completeTour = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsActive(false);
  };
  
  if (!isActive) return null;
  
  const step = TOUR_STEPS[currentStep];
  
  return (
    <TourOverlay>
      <TourSpotlight target={step.target} />
      <TourCard>
        <h3>{step.title}</h3>
        <p>{step.content}</p>
        <TourProgress current={currentStep + 1} total={TOUR_STEPS.length} />
        <TourActions>
          <Button variant="text" onClick={completeTour}>Skip</Button>
          <Button onClick={handleNext}>
            {currentStep < TOUR_STEPS.length - 1 ? 'Next' : 'Finish'}
          </Button>
        </TourActions>
      </TourCard>
    </TourOverlay>
  );
};
```

### Accessibility Considerations

```typescript
// Ensure all tooltips are keyboard accessible
<Tooltip content="Help text">
  <button aria-label="More information">
    <InfoIcon />
  </button>
</Tooltip>

// Screen reader announcements for errors
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// Keyboard navigation for onboarding
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeTour();
    } else if (e.key === 'ArrowRight') {
      nextStep();
    } else if (e.key === 'ArrowLeft') {
      previousStep();
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

## Additional Resources

- **Component Library**: Radix UI, Headless UI
- **Tooltip Best Practices**: Nielsen Norman Group
- **Error Message Guidelines**: Material Design
- **Onboarding Patterns**: User Onboarding

---

**Questions?** Contact the UX team or open an issue on GitHub.
