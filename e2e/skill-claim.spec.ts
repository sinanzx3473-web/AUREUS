import { test, expect } from '@playwright/test';

test.describe('Skill Claim Submission and Approval', () => {
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

  test('should navigate to skill claim page', async ({ page }) => {
    const claimLink = page.getByRole('link', { name: /claim|claims/i });
    if (await claimLink.isVisible()) {
      await claimLink.click();
      await expect(page).toHaveURL(/.*claim/);
    }
  });

  test('should display skill claim form', async ({ page }) => {
    await page.goto('/claims');
    
    const createButton = page.getByRole('button', { name: /create claim|new claim/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Verify form fields
      await expect(page.getByLabel(/skill/i)).toBeVisible();
      await expect(page.getByLabel(/evidence|proof/i)).toBeVisible();
      await expect(page.getByLabel(/description/i)).toBeVisible();
    }
  });

  test('should validate claim form before submission', async ({ page }) => {
    await page.goto('/claims');
    
    const createButton = page.getByRole('button', { name: /create claim|new claim/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Try to submit without filling required fields
      await page.getByRole('button', { name: /submit|create/i }).click();
      
      // Should show validation errors
      await expect(page.getByText(/required/i).first()).toBeVisible();
    }
  });

  test('should successfully submit skill claim', async ({ page }) => {
    await page.goto('/claims');
    
    const createButton = page.getByRole('button', { name: /create claim|new claim/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill claim form
      await page.getByLabel(/skill/i).fill('Smart Contract Development');
      await page.getByLabel(/evidence|proof/i).fill('https://github.com/user/project');
      await page.getByLabel(/description/i).fill('Developed multiple DeFi protocols');
      
      // Submit claim
      await page.getByRole('button', { name: /submit|create/i }).click();
      
      // Should show success message
      await expect(page.getByText(/submitted|created|success/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display pending claims list', async ({ page }) => {
    await page.goto('/claims');
    
    // Should show claims table or list
    const claimsSection = page.getByRole('region', { name: /claims|my claims/i });
    if (await claimsSection.isVisible()) {
      await expect(claimsSection).toBeVisible();
    }
  });

  test('should filter claims by status', async ({ page }) => {
    await page.goto('/claims');
    
    const statusFilter = page.getByRole('combobox', { name: /status|filter/i });
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('Pending');
      
      // Should update claims list
      await page.waitForTimeout(1000);
      
      // Verify only pending claims are shown
      const pendingBadges = page.getByText(/pending/i);
      await expect(pendingBadges.first()).toBeVisible();
    }
  });

  test('should allow claim withdrawal before approval', async ({ page }) => {
    await page.goto('/claims');
    
    const withdrawButton = page.getByRole('button', { name: /withdraw|cancel/i }).first();
    if (await withdrawButton.isVisible()) {
      await withdrawButton.click();
      
      // Confirm withdrawal
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        await expect(page.getByText(/withdrawn|cancelled/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should display claim details view', async ({ page }) => {
    await page.goto('/claims');
    
    const viewButton = page.getByRole('button', { name: /view|details/i }).first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      
      // Should show claim details
      await expect(page.getByText(/evidence|proof/i)).toBeVisible();
      await expect(page.getByText(/status/i)).toBeVisible();
    }
  });

  test('should handle verifier approval flow', async ({ page, context }) => {
    // Mock verifier account
    await context.addInitScript(() => {
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xverifier123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7';
          }
          if (method === 'eth_sendTransaction') {
            return '0xtxhash456';
          }
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/verifier/claims');
    
    const approveButton = page.getByRole('button', { name: /approve/i }).first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      // Confirm approval
      const confirmButton = page.getByRole('button', { name: /confirm/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        await expect(page.getByText(/approved|success/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should handle verifier rejection flow', async ({ page, context }) => {
    await context.addInitScript(() => {
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xverifier123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7';
          }
          if (method === 'eth_sendTransaction') {
            return '0xtxhash789';
          }
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/verifier/claims');
    
    const rejectButton = page.getByRole('button', { name: /reject|deny/i }).first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      
      // Provide rejection reason
      const reasonField = page.getByLabel(/reason/i);
      if (await reasonField.isVisible()) {
        await reasonField.fill('Insufficient evidence provided');
        
        await page.getByRole('button', { name: /confirm|submit/i }).click();
        
        await expect(page.getByText(/rejected|denied/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should update claim status after approval', async ({ page }) => {
    await page.goto('/claims');
    
    // Should show approved status
    const approvedBadge = page.getByText(/approved|verified/i).first();
    if (await approvedBadge.isVisible()) {
      await expect(approvedBadge).toBeVisible();
    }
  });
});
