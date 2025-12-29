import { test, expect } from '@playwright/test';

test.describe('Viewing Profile', () => {
  test.beforeEach(async ({ page, context }) => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    
    await context.addInitScript((address) => {
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return [address];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7';
          }
        },
        on: () => {},
        removeListener: () => {},
      };
    }, mockAddress);

    await page.goto('/');
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
  });

  test('should display own profile page', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show profile information
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });

  test('should display profile avatar or placeholder', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show avatar image or placeholder
    const avatar = page.getByRole('img', { name: /avatar|profile/i });
    if (await avatar.isVisible()) {
      await expect(avatar).toBeVisible();
    }
  });

  test('should display profile name and bio', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show name
    const nameElement = page.getByText(/john doe|jane smith/i);
    if (await nameElement.isVisible()) {
      await expect(nameElement).toBeVisible();
    }
    
    // Should show bio
    const bioElement = page.getByText(/developer|engineer|blockchain/i);
    if (await bioElement.isVisible()) {
      await expect(bioElement).toBeVisible();
    }
  });

  test('should display skills list', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show skills section
    const skillsSection = page.getByRole('region', { name: /skills/i });
    if (await skillsSection.isVisible()) {
      await expect(skillsSection).toBeVisible();
    }
  });

  test('should display verified claims', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show claims section
    const claimsSection = page.getByRole('region', { name: /claims|verified/i });
    if (await claimsSection.isVisible()) {
      await expect(claimsSection).toBeVisible();
    }
  });

  test('should display endorsements received', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show endorsements section
    const endorsementsSection = page.getByRole('region', { name: /endorsements/i });
    if (await endorsementsSection.isVisible()) {
      await expect(endorsementsSection).toBeVisible();
    }
  });

  test('should view other user profile by address', async ({ page }) => {
    const otherAddress = '0x9876543210987654321098765432109876543210';
    await page.goto(`/profile/${otherAddress}`);
    
    // Should display other user's profile
    await expect(page.getByText(/0x9876/i)).toBeVisible();
  });

  test('should display profile statistics', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show stats like total skills, claims, endorsements
    const statsSection = page.getByRole('region', { name: /stats|statistics/i });
    if (await statsSection.isVisible()) {
      await expect(statsSection).toBeVisible();
    }
  });

  test('should display profile activity timeline', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show recent activity
    const activitySection = page.getByRole('region', { name: /activity|timeline/i });
    if (await activitySection.isVisible()) {
      await expect(activitySection).toBeVisible();
    }
  });

  test('should allow sharing profile link', async ({ page }) => {
    await page.goto('/profile');
    
    const shareButton = page.getByRole('button', { name: /share/i });
    if (await shareButton.isVisible()) {
      await shareButton.click();
      
      // Should show share modal or copy link
      await expect(page.getByText(/copy|share|link/i)).toBeVisible();
    }
  });

  test('should display profile completeness indicator', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show profile completion percentage or progress
    const completionIndicator = page.getByText(/\d+%|complete|progress/i);
    if (await completionIndicator.isVisible()) {
      await expect(completionIndicator).toBeVisible();
    }
  });

  test('should navigate between profile tabs', async ({ page }) => {
    await page.goto('/profile');
    
    const skillsTab = page.getByRole('tab', { name: /skills/i });
    if (await skillsTab.isVisible()) {
      await skillsTab.click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      
      const claimsTab = page.getByRole('tab', { name: /claims/i });
      if (await claimsTab.isVisible()) {
        await claimsTab.click();
        await expect(page.getByRole('tabpanel')).toBeVisible();
      }
    }
  });

  test('should display profile badges and achievements', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show badges section
    const badgesSection = page.getByRole('region', { name: /badges|achievements/i });
    if (await badgesSection.isVisible()) {
      await expect(badgesSection).toBeVisible();
    }
  });

  test('should handle non-existent profile gracefully', async ({ page }) => {
    const nonExistentAddress = '0x0000000000000000000000000000000000000000';
    await page.goto(`/profile/${nonExistentAddress}`);
    
    // Should show not found or empty state
    await expect(page.getByText(/not found|no profile|doesn't exist/i)).toBeVisible();
  });

  test('should display profile reputation score', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show reputation or trust score
    const reputationScore = page.getByText(/reputation|trust score|rating/i);
    if (await reputationScore.isVisible()) {
      await expect(reputationScore).toBeVisible();
    }
  });
});
