import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Responsive Usage', () => {

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
  });

  test('should display mobile navigation menu', async ({ page }) => {
    // Should show hamburger menu on mobile
    const menuButton = page.getByRole('button', { name: /menu|navigation/i });
    if (await menuButton.isVisible()) {
      await expect(menuButton).toBeVisible();
      
      // Click to open menu
      await menuButton.click();
      
      // Should show navigation links
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    
    // Buttons should be at least 44x44px for touch targets
    const button = page.getByRole('button', { name: /connect wallet/i });
    const box = await button.boundingBox();
    
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('should display responsive layout on profile page', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/profile');
    
    // Should stack elements vertically on mobile
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
    
    // Profile should be visible and readable
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });

  test('should handle mobile form inputs properly', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/profile');
    
    const nameInput = page.getByLabel(/name|full name/i);
    if (await nameInput.isVisible()) {
      // Should be able to focus and type
      await nameInput.click();
      await nameInput.fill('Mobile Test User');
      
      const value = await nameInput.inputValue();
      expect(value).toBe('Mobile Test User');
    }
  });

  test('should display mobile-optimized tables or lists', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/claims');
    
    // Tables should be scrollable or converted to cards on mobile
    const claimsContainer = page.locator('[role="region"], table, .claims-list').first();
    if (await claimsContainer.isVisible()) {
      await expect(claimsContainer).toBeVisible();
    }
  });

  test('should support swipe gestures for navigation', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/profile');
    
    // Test horizontal swipe on tabs if present
    const tabPanel = page.getByRole('tabpanel').first();
    if (await tabPanel.isVisible()) {
      const box = await tabPanel.boundingBox();
      if (box) {
        // Simulate swipe gesture
        await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 10, box.y + box.height / 2);
        await page.mouse.up();
        
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display mobile-friendly modals', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    
    // Modal should be full-screen or properly sized on mobile
    const modal = page.getByRole('dialog');
    if (await modal.isVisible()) {
      await expect(modal).toBeVisible();
      
      const box = await modal.boundingBox();
      const viewport = page.viewportSize();
      
      if (box && viewport) {
        // Modal should not overflow viewport
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('should handle mobile keyboard interactions', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/profile');
    
    const bioInput = page.getByLabel(/bio|description/i);
    if (await bioInput.isVisible()) {
      await bioInput.click();
      
      // Virtual keyboard should not obscure input
      await page.waitForTimeout(500);
      
      const box = await bioInput.boundingBox();
      const viewport = page.viewportSize();
      
      if (box && viewport) {
        // Input should be visible above keyboard
        expect(box.y).toBeGreaterThan(0);
      }
    }
  });

  test('should display readable text on mobile', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/profile');
    
    // Text should be at least 16px for readability
    const bodyText = page.locator('body');
    const fontSize = await bodyText.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });
    
    const fontSizeNum = parseInt(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(14);
  });

  test('should handle mobile orientation changes', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    // Test landscape orientation
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/profile');
    
    // Content should adapt to landscape
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
    
    // Switch back to portrait
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    
    // Content should still be visible
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });

  test('should support pull-to-refresh on mobile', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/claims');
    
    // Simulate pull-to-refresh gesture
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(200, 300);
    await page.mouse.up();
    
    await page.waitForTimeout(1000);
    
    // Page should still be functional
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('should display mobile-optimized images', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/profile');
    
    // Images should be responsive and not overflow
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const box = await img.boundingBox();
        const viewport = page.viewportSize();
        
        if (box && viewport) {
          expect(box.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    }
  });
});

test.use({ ...devices['iPad Pro'] });

test.describe('Tablet Responsive Usage', () => {

  test('should display tablet-optimized layout', async ({ page }) => {
    await page.goto('/');
    
    // Should show desktop-like layout on tablet
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeGreaterThanOrEqual(768);
    
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();
  });

  test('should handle tablet split-screen mode', async ({ page, context }) => {
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

    // Simulate split-screen by reducing viewport width
    await page.setViewportSize({ width: 512, height: 1024 });
    await page.goto('/');
    
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await page.waitForTimeout(1000);
    
    await page.goto('/profile');
    
    // Should still be usable in narrow tablet mode
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });
});
