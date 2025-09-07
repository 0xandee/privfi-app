/**
 * Storage utilities for persisting Typhoon SDK data between sessions
 * Based on Typhoon documentation: https://typhoon-2.gitbook.io/typhoon-docs/getting-started/getters-and-setters
 */

export interface TyphoonDepositData {
  transactionHash: string;
  secrets: any[]; // From sdk.get_secrets()
  nullifiers: any[]; // From sdk.get_nullifiers()
  pools: any[]; // From sdk.get_pools()
  tokenAddress: string;
  amount: string;
  timestamp: number;
  walletAddress: string;
}

export interface StoredTyphoonData {
  deposits: TyphoonDepositData[];
  lastUpdated: number;
}

const STORAGE_KEY = 'privfi_typhoon_data';

/**
 * Save Typhoon deposit data after successful deposit
 */
export function saveTyphoonDepositData(data: TyphoonDepositData): void {
  try {
    const existing = getTyphoonStorageData();
    
    // Remove any existing entry with same transaction hash
    const filtered = existing.deposits.filter(d => d.transactionHash !== data.transactionHash);
    
    // Add new deposit data
    const updated: StoredTyphoonData = {
      deposits: [...filtered, data],
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    // Failed to save Typhoon deposit data
  }
}

/**
 * Load Typhoon deposit data for a specific transaction hash
 */
export function loadTyphoonDepositData(transactionHash: string): TyphoonDepositData | null {
  try {
    const data = getTyphoonStorageData();
    const deposit = data.deposits.find(d => d.transactionHash === transactionHash);
    return deposit || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get all stored Typhoon SDK data (secrets, nullifiers, pools)
 * 
 * @deprecated This function combines data from multiple deposits which can cause
 * SDK state accumulation issues. Use loadTyphoonDepositData() for specific transactions instead.
 * Only use this function for debugging or migration purposes.
 */
export function getAllTyphoonSdkData(): { secrets: any[], nullifiers: any[], pools: any[] } {
  try {
    const data = getTyphoonStorageData();
    
    // Combine all secrets, nullifiers, and pools from all deposits
    const allSecrets: any[] = [];
    const allNullifiers: any[] = [];
    const allPools: any[] = [];
    
    data.deposits.forEach(deposit => {
      if (deposit.secrets) allSecrets.push(...deposit.secrets);
      if (deposit.nullifiers) allNullifiers.push(...deposit.nullifiers);
      if (deposit.pools) allPools.push(...deposit.pools);
    });
    
    return {
      secrets: allSecrets,
      nullifiers: allNullifiers,
      pools: allPools
    };
  } catch (error) {
    return { secrets: [], nullifiers: [], pools: [] };
  }
}

/**
 * Remove deposit data after successful withdrawal
 */
export function clearTyphoonDepositData(transactionHash: string): void {
  try {
    const existing = getTyphoonStorageData();
    const filtered = existing.deposits.filter(d => d.transactionHash !== transactionHash);
    
    const updated: StoredTyphoonData = {
      deposits: filtered,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    // Failed to clear Typhoon deposit data
  }
}

/**
 * Clear all Typhoon data (for debugging or user logout)
 */
export function clearAllTyphoonData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Failed to clear Typhoon data
  }
}

/**
 * Get all deposit transactions for UI display
 */
export function getTyphoonDepositHistory(): TyphoonDepositData[] {
  const data = getTyphoonStorageData();
  return data.deposits.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Internal function to get stored data with fallback
 */
function getTyphoonStorageData(): StoredTyphoonData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // Failed to parse Typhoon storage data
  }
  
  // Return default structure
  return {
    deposits: [],
    lastUpdated: 0
  };
}

/**
 * Validate that stored data has required fields
 */
export function validateTyphoonDepositData(data: any): data is TyphoonDepositData {
  return (
    data &&
    typeof data.transactionHash === 'string' &&
    Array.isArray(data.secrets) &&
    Array.isArray(data.nullifiers) &&
    Array.isArray(data.pools) &&
    typeof data.tokenAddress === 'string' &&
    typeof data.amount === 'string' &&
    typeof data.timestamp === 'number' &&
    typeof data.walletAddress === 'string'
  );
}