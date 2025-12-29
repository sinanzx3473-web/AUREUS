import { test, expect } from '@playwright/test';

test.describe('Wallet Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display connect wallet button on landing page', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectButton).toBeVisible();
  });

  test('should open wallet selection modal on connect click', async ({ page }) => {
    await page.getByRole('button', { name: /connect wallet/i }).click();
    
    // Check for wallet options (MetaMask, WalletConnect, etc.)
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    // Verify wallet options are present
    await expect(page.getByText(/metamask/i)).toBeVisible();
  });

  test('should handle wallet connection rejection gracefully', async ({ page, context }) => {
    // Mock wallet rejection
    await context.addInitScript(() => {
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            throw new Error('User rejected the request');
          }
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.getByRole('button', { name: /connect wallet/i }).click();
    
    // Should show error message
    await expect(page.getByText(/rejected|denied|cancelled/i)).toBeVisible({ timeout: 5000 });
  });

  test('should successfully connect wallet and display address', async ({ page, context }) => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    
    // Mock successful wallet connection
    await context.addInitScript((address) => {
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return [address];
          }
          if (method === 'eth_chainId') {
            return '0xaa36a7'; // Sepolia
          }
        },
        on: () => {},
        removeListener: () => {},
      };
    }, mockAddress);

    await page.getByRole('button', { name: /connect wallet/i }).click();
    
    // Should display shortened address
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible({ timeout: 5000 });
  });

  test('should prompt network switch if on wrong chain', async ({ page, context }) => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    
    // Mock wallet on wrong network
    await context.addInitScript((address) => {
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return [address];
          }
          if (method === 'eth_chainId') {
            return '0x1'; // Mainnet instead of Sepolia
          }
        },
        on: () => {},
        removeListener: () => {},
      };
    }, mockAddress);

    await page.getByRole('button', { name: /connect wallet/i }).click();
    
    // Should show network switch prompt
    await expect(page.getByText(/switch network|wrong network/i)).toBeVisible({ timeout: 5000 });
  });

  test('should persist wallet connection on page reload', async ({ page, context }) => {
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

    await page.getByRole('button', { name: /connect wallet/i }).click();
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible({ timeout: 5000 });
    
    // Reload page
    await page.reload();
    
    // Should auto-reconnect
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible({ timeout: 5000 });
  });

  test('should allow wallet disconnection', async ({ page, context }) => {
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

    await page.getByRole('button', { name: /connect wallet/i }).click();
    await expect(page.getByText(/0x1234...7890/i)).toBeVisible({ timeout: 5000 });
    
    // Click disconnect
    await page.getByRole('button', { name: /disconnect|logout/i }).click();
    
    // Should show connect button again
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();
  });
});
