import posthog from 'posthog-js';

// Initialize PostHog
export const initPostHog = () => {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

  if (apiKey) {
    posthog.init(apiKey, {
      api_host: host,
      // Privacy-friendly settings
      autocapture: false, // Only track what we explicitly want
      capture_pageview: true,
      capture_pageleave: false,
      disable_session_recording: true, // No session recordings for privacy
      respect_dnt: true, // Respect Do Not Track
      opt_out_capturing_by_default: false,
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log('PostHog initialized');
        }
      },
    });
  } else if (import.meta.env.DEV) {
    console.warn('PostHog API key not found. Analytics disabled.');
  }
};

// Track custom events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (posthog.__loaded) {
    posthog.capture(eventName, properties);
  }
};

// Track wallet connection
export const trackWalletConnected = (walletType: string, address: string) => {
  trackEvent('Wallet Connected', {
    wallet_type: walletType,
    address_prefix: address.substring(0, 6), // Only track prefix for privacy
  });
};

// Track skill verification
export const trackSkillVerified = (skillName: string, verificationMethod: string) => {
  trackEvent('Skill Verified', {
    skill_name: skillName,
    verification_method: verificationMethod,
  });
};

// Track bounty claimed
export const trackBountyClaimed = (bountyId: string, bountyTitle: string, reward: string) => {
  trackEvent('Bounty Claimed', {
    bounty_id: bountyId,
    bounty_title: bountyTitle,
    reward,
  });
};

// Identify user (optional, privacy-conscious)
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (posthog.__loaded) {
    posthog.identify(userId, traits);
  }
};

// Reset user on logout
export const resetUser = () => {
  if (posthog.__loaded) {
    posthog.reset();
  }
};

export default posthog;
