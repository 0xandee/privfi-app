import type { ClaimedTransaction } from '../types';

export class SecretManager {
  private static readonly STORAGE_KEY = 'privfi_claimed_transactions';
  private static readonly DEV_MODE_KEY = 'devVals';

  // Check if development mode is enabled
  static isDevMode(): boolean {
    return localStorage.getItem(this.DEV_MODE_KEY) === 'true';
  }

  // Enable development mode with test values
  static enableDevMode(): void {
    localStorage.setItem(this.DEV_MODE_KEY, 'true');
  }

  // Disable development mode
  static disableDevMode(): void {
    localStorage.removeItem(this.DEV_MODE_KEY);
  }

  // Get development claiming key
  static getDevClaimingKey(): string {
    return this.isDevMode() ? '22' : '';
  }

  // Get development recipient address
  static getDevRecipient(): string {
    return this.isDevMode()
      ? '0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469'
      : '';
  }

  // Generate a secure random claiming key
  static generateSecureClaimingKey(): string {
    // Generate a 6-digit random number
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  // Validate claiming key strength
  static validateKeyStrength(key: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (key.length < 6) {
      feedback.push('Key should be at least 6 digits long');
    } else {
      score += 20;
    }

    if (!/^[0-9]+$/.test(key)) {
      feedback.push('Key should contain only numbers');
    } else {
      score += 20;
    }

    // Check for repeated digits
    if (key.length > 1 && new Set(key).size === 1) {
      feedback.push('Avoid using repeated digits');
    } else {
      score += 20;
    }

    // Check for sequential digits
    const isSequential = key.split('').every((digit, i) =>
      i === 0 || parseInt(digit) === parseInt(key[i - 1]) + 1
    );
    if (isSequential && key.length > 2) {
      feedback.push('Avoid sequential digits');
    } else {
      score += 20;
    }

    // Check entropy
    const uniqueDigits = new Set(key).size;
    if (uniqueDigits >= Math.min(key.length, 5)) {
      score += 20;
    } else {
      feedback.push('Use more varied digits for better security');
    }

    return {
      isValid: score >= 60,
      score,
      feedback: feedback.length > 0 ? feedback : ['Key looks good!']
    };
  }

  // Store claimed transaction
  static markTransactionAsClaimed(transaction: ClaimedTransaction): void {
    try {
      const claimed = this.getClaimedTransactions();
      const updated = [...claimed, transaction];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to store claimed transaction:', error);
    }
  }

  // Get all claimed transactions
  static getClaimedTransactions(): ClaimedTransaction[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve claimed transactions:', error);
      return [];
    }
  }

  // Check if transaction is already claimed
  static isTransactionClaimed(claimingKey: string, recipient: string): boolean {
    const claimed = this.getClaimedTransactions();
    return claimed.some(
      tx => tx.claimingKey === claimingKey &&
           tx.recipient.toLowerCase() === recipient.toLowerCase()
    );
  }

  // Generate transaction ID for tracking
  static generateTransactionId(claimingKey: string, recipient: string): string {
    return `${claimingKey}-${recipient.toLowerCase()}`;
  }

  // Clear all claimed transactions (use with caution)
  static clearClaimedTransactions(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Export claimed transactions for backup
  static exportClaimedTransactions(): string {
    const claimed = this.getClaimedTransactions();
    return JSON.stringify(claimed, null, 2);
  }

  // Import claimed transactions from backup
  static importClaimedTransactions(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (Array.isArray(data)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to import claimed transactions:', error);
      return false;
    }
  }

  // Sanitize claiming key input
  static sanitizeClaimingKey(input: string): string {
    // Remove any non-numeric characters
    return input.replace(/[^0-9]/g, '');
  }

  // Copy text to clipboard safely
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.prepend(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        return true;
      }
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
      return false;
    }
  }

  // Generate sharing URL for transaction (without sensitive data)
  static generateSharingData(txHash: string): {
    url: string;
    text: string;
  } {
    const baseUrl = window.location.origin;
    // Note: We don't include claiming key or recipient in the URL for security
    return {
      url: `${baseUrl}/withdraw`,
      text: `Private transaction created with hash: ${txHash}`
    };
  }

  // Validate recipient address format
  static validateRecipientAddress(address: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!address) {
      return { isValid: false, error: 'Address is required' };
    }

    if (!address.startsWith('0x')) {
      return { isValid: false, error: 'Address must start with 0x' };
    }

    if (address.length !== 66) {
      return { isValid: false, error: 'Address must be 66 characters long (including 0x)' };
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
      return { isValid: false, error: 'Address contains invalid characters' };
    }

    return { isValid: true };
  }

  // Clean up old claimed transactions (older than 30 days)
  static cleanupOldTransactions(): void {
    try {
      const claimed = this.getClaimedTransactions();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      const filtered = claimed.filter(tx => tx.claimedAt > thirtyDaysAgo);

      if (filtered.length !== claimed.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (error) {
      console.warn('Failed to cleanup old transactions:', error);
    }
  }
}

export const secretManager = SecretManager;