/**
 * Accessibility Announcer Utility
 * 
 * Provides ARIA live region announcements for screen readers.
 * Manages polite and assertive live regions for dynamic content updates.
 */

class Announcer {
  private politeRegion: HTMLDivElement | null = null;
  private assertiveRegion: HTMLDivElement | null = null;
  private initialized = false;

  /**
   * Initialize live regions if not already created
   */
  private init() {
    if (this.initialized) return;

    // Create polite live region
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.setAttribute('role', 'status');
    this.politeRegion.className = 'sr-only';
    document.body.appendChild(this.politeRegion);

    // Create assertive live region
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.setAttribute('role', 'alert');
    this.assertiveRegion.className = 'sr-only';
    document.body.appendChild(this.assertiveRegion);

    this.initialized = true;
  }

  /**
   * Announce a message politely (non-interrupting)
   * Use for status updates, confirmations, and non-urgent information
   */
  announcePolite(message: string) {
    this.init();
    if (!this.politeRegion) return;

    // Clear and set message with slight delay for screen reader detection
    this.politeRegion.textContent = '';
    setTimeout(() => {
      if (this.politeRegion) {
        this.politeRegion.textContent = message;
      }
    }, 100);

    // Clear after announcement
    setTimeout(() => {
      if (this.politeRegion) {
        this.politeRegion.textContent = '';
      }
    }, 5000);
  }

  /**
   * Announce a message assertively (interrupting)
   * Use for errors, warnings, and urgent information
   */
  announceAssertive(message: string) {
    this.init();
    if (!this.assertiveRegion) return;

    // Clear and set message with slight delay for screen reader detection
    this.assertiveRegion.textContent = '';
    setTimeout(() => {
      if (this.assertiveRegion) {
        this.assertiveRegion.textContent = message;
      }
    }, 100);

    // Clear after announcement
    setTimeout(() => {
      if (this.assertiveRegion) {
        this.assertiveRegion.textContent = '';
      }
    }, 5000);
  }

  /**
   * Cleanup live regions (for testing or unmounting)
   */
  cleanup() {
    if (this.politeRegion) {
      document.body.removeChild(this.politeRegion);
      this.politeRegion = null;
    }
    if (this.assertiveRegion) {
      document.body.removeChild(this.assertiveRegion);
      this.assertiveRegion = null;
    }
    this.initialized = false;
  }
}

// Singleton instance
const announcer = new Announcer();

/**
 * Announce a message politely (non-interrupting)
 * Use for status updates, confirmations, and non-urgent information
 * 
 * @param message - The message to announce
 * 
 * @example
 * announcePolite('Profile created successfully');
 * announcePolite('Transaction confirmed');
 */
export const announcePolite = (message: string) => {
  announcer.announcePolite(message);
};

/**
 * Announce a message assertively (interrupting)
 * Use for errors, warnings, and urgent information
 * 
 * @param message - The message to announce
 * 
 * @example
 * announceAssertive('Transaction failed: Insufficient funds');
 * announceAssertive('Form validation error: Email is required');
 */
export const announceAssertive = (message: string) => {
  announcer.announceAssertive(message);
};

/**
 * Cleanup announcer (for testing)
 */
export const cleanupAnnouncer = () => {
  announcer.cleanup();
};
