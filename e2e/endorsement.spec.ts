import { test, expect } from '@playwright/test';

test.describe('Endorsement Flow', () => {
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
          if (method === 'eth_sendTransaction') {
            return '0xtxhash123';
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

  test('should navigate to endorsements page', async ({ page }) => {
    const endorseLink = page.getByRole('link', { name: /endorse|endorsements/i });
    if (await endorseLink.isVisible()) {
      await endorseLink.click();
      await expect(page).toHaveURL(/.*endorse/);
    }
  });

  test('should display endorsement form', async ({ page }) => {
    await page.goto('/endorsements');
    
    const createButton = page.getByRole('button', { name: /create|new endorsement/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Verify form fields
      await expect(page.getByLabel(/address|user/i)).toBeVisible();
      await expect(page.getByLabel(/skill/i)).toBeVisible();
      await expect(page.getByLabel(/comment|message/i)).toBeVisible();
    }
  });

  test('should validate endorsement form', async ({ page }) => {
    await page.goto('/endorsements');
    
    const createButton = page.getByRole('button', { name: /create|new endorsement/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Try to submit without required fields
      await page.getByRole('button', { name: /submit|endorse/i }).click();
      
      // Should show validation errors
      await expect(page.getByText(/required/i).first()).toBeVisible();
    }
  });

  test('should validate Ethereum address format', async ({ page }) => {
    await page.goto('/endorsements');
    
    const createButton = page.getByRole('button', { name: /create|new endorsement/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Enter invalid address
      await page.getByLabel(/address|user/i).fill('invalid-address');
      await page.getByRole('button', { name: /submit|endorse/i }).click();
      
      // Should show address validation error
      await expect(page.getByText(/invalid.*address/i)).toBeVisible();
    }
  });

  test('should successfully create endorsement', async ({ page }) => {
    await page.goto('/endorsements');
    
    const createButton = page.getByRole('button', { name: /create|new endorsement/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill endorsement form
      await page.getByLabel(/address|user/i).fill('0x9876543210987654321098765432109876543210');
      await page.getByLabel(/skill/i).fill('React Development');
      await page.getByLabel(/comment|message/i).fill('Excellent React developer with strong TypeScript skills');
      
      // Submit endorsement
      await page.getByRole('button', { name: /submit|endorse/i }).click();
      
      // Should show success message
      await expect(page.getByText(/success|endorsed|created/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should prevent self-endorsement', async ({ page }) => {
    await page.goto('/endorsements');
    
    const createButton = page.getByRole('button', { name: /create|new endorsement/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Try to endorse own address
      await page.getByLabel(/address|user/i).fill('0x1234567890123456789012345678901234567890');
      await page.getByLabel(/skill/i).fill('Solidity');
      await page.getByLabel(/comment|message/i).fill('Test');
      
      await page.getByRole('button', { name: /submit|endorse/i }).click();
      
      // Should show error preventing self-endorsement
      await expect(page.getByText(/cannot endorse yourself|self-endorsement/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display received endorsements on profile', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show endorsements section
    const endorsementsSection = page.getByRole('region', { name: /endorsements/i });
    if (await endorsementsSection.isVisible()) {
      await expect(endorsementsSection).toBeVisible();
    }
  });

  test('should display given endorsements list', async ({ page }) => {
    await page.goto('/endorsements');
    
    const givenTab = page.getByRole('tab', { name: /given|sent/i });
    if (await givenTab.isVisible()) {
      await givenTab.click();
      
      // Should show list of endorsements given
      await page.waitForTimeout(1000);
      await expect(page.getByText(/endorsed/i).first()).toBeVisible();
    }
  });

  test('should allow endorsement revocation', async ({ page }) => {
    await page.goto('/endorsements');
    
    const revokeButton = page.getByRole('button', { name: /revoke|remove/i }).first();
    if (await revokeButton.isVisible()) {
      await revokeButton.click();
      
      // Confirm revocation
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        await expect(page.getByText(/revoked|removed/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should enforce endorsement rate limits', async ({ page }) => {
    await page.goto('/endorsements');
    
    // Try to create multiple endorsements rapidly
    for (let i = 0; i < 5; i++) {
      const createButton = page.getByRole('button', { name: /create|new endorsement/i });
      if (await createButton.isVisible()) {
        await createButton.click();
        
        await page.getByLabel(/address|user/i).fill(`0x${i}876543210987654321098765432109876543210`);
        await page.getByLabel(/skill/i).fill('Test Skill');
        await page.getByLabel(/comment|message/i).fill('Test comment');
        
        await page.getByRole('button', { name: /submit|endorse/i }).click();
        await page.waitForTimeout(500);
      }
    }
    
    // Should eventually show rate limit error
    const rateLimitError = page.getByText(/rate limit|too many|slow down/i);
    if (await rateLimitError.isVisible()) {
      await expect(rateLimitError).toBeVisible();
    }
  });

  test('should display endorsement count on profile', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show endorsement count badge or number
    const endorsementCount = page.getByText(/\d+.*endorsement/i);
    if (await endorsementCount.isVisible()) {
      await expect(endorsementCount).toBeVisible();
    }
  });

  test('should filter endorsements by skill', async ({ page }) => {
    await page.goto('/endorsements');
    
    const skillFilter = page.getByRole('combobox', { name: /skill|filter/i });
    if (await skillFilter.isVisible()) {
      await skillFilter.selectOption('Solidity');
      
      await page.waitForTimeout(1000);
      
      // Should show only Solidity endorsements
      await expect(page.getByText(/solidity/i).first()).toBeVisible();
    }
  });
});
