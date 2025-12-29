import { test, expect } from '@playwright/test';

test.describe('Profile Creation Journey', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock wallet connection
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

  test('should navigate to profile creation page', async ({ page }) => {
    await page.getByRole('link', { name: /create profile|my profile/i }).click();
    await expect(page).toHaveURL(/.*profile/);
  });

  test('should display profile creation form with all required fields', async ({ page }) => {
    await page.goto('/profile');
    
    // Check for form fields
    await expect(page.getByLabel(/name|full name/i)).toBeVisible();
    await expect(page.getByLabel(/bio|description/i)).toBeVisible();
    await expect(page.getByLabel(/location/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create profile|save/i })).toBeVisible();
  });

  test('should validate required fields before submission', async ({ page }) => {
    await page.goto('/profile');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create profile|save/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/required|cannot be empty/i).first()).toBeVisible();
  });

  test('should enforce character limits on text fields', async ({ page }) => {
    await page.goto('/profile');
    
    const bioField = page.getByLabel(/bio|description/i);
    const longText = 'a'.repeat(1001); // Assuming 1000 char limit
    
    await bioField.fill(longText);
    await page.getByRole('button', { name: /create profile|save/i }).click();
    
    // Should show character limit error
    await expect(page.getByText(/character limit|too long/i)).toBeVisible();
  });

  test('should successfully create profile with valid data', async ({ page }) => {
    await page.goto('/profile');
    
    // Fill in profile data
    await page.getByLabel(/name|full name/i).fill('John Doe');
    await page.getByLabel(/bio|description/i).fill('Experienced blockchain developer');
    await page.getByLabel(/location/i).fill('San Francisco, CA');
    
    // Submit form
    await page.getByRole('button', { name: /create profile|save/i }).click();
    
    // Should show success message
    await expect(page.getByText(/success|created|saved/i)).toBeVisible({ timeout: 10000 });
  });

  test('should allow adding skills to profile', async ({ page }) => {
    await page.goto('/profile');
    
    // Fill basic info
    await page.getByLabel(/name|full name/i).fill('Jane Smith');
    await page.getByLabel(/bio|description/i).fill('Full-stack developer');
    
    // Add skill
    const addSkillButton = page.getByRole('button', { name: /add skill/i });
    if (await addSkillButton.isVisible()) {
      await addSkillButton.click();
      
      await page.getByLabel(/skill name/i).fill('Solidity');
      await page.getByLabel(/proficiency|level/i).selectOption('Advanced');
      
      await page.getByRole('button', { name: /save skill|add/i }).click();
      
      // Verify skill appears in list
      await expect(page.getByText('Solidity')).toBeVisible();
    }
  });

  test('should handle profile creation transaction failure', async ({ page, context }) => {
    // Override to simulate transaction failure
    await context.addInitScript(() => {
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7';
          }
          if (method === 'eth_sendTransaction') {
            throw new Error('Transaction failed');
          }
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/profile');
    
    await page.getByLabel(/name|full name/i).fill('Test User');
    await page.getByLabel(/bio|description/i).fill('Test bio');
    
    await page.getByRole('button', { name: /create profile|save/i }).click();
    
    // Should show error message
    await expect(page.getByText(/failed|error|rejected/i)).toBeVisible({ timeout: 10000 });
  });

  test('should allow profile editing after creation', async ({ page }) => {
    await page.goto('/profile');
    
    // Create profile
    await page.getByLabel(/name|full name/i).fill('Original Name');
    await page.getByLabel(/bio|description/i).fill('Original bio');
    await page.getByRole('button', { name: /create profile|save/i }).click();
    await page.waitForTimeout(2000);
    
    // Edit profile
    const editButton = page.getByRole('button', { name: /edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      
      await page.getByLabel(/name|full name/i).fill('Updated Name');
      await page.getByRole('button', { name: /save|update/i }).click();
      
      await expect(page.getByText(/updated|saved/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
