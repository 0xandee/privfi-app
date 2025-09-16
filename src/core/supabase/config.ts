/**
 * Supabase Configuration Constants
 */

export const SUPABASE_CONFIG = {
  // Table names
  TABLES: {
    DEPOSITS: 'deposits',
    // TYPHOON_DATA: 'typhoon_data', // DEPRECATED: Typhoon data now stored in deposits table
    WITHDRAWALS: 'withdrawals',
  } as const,

  // Real-time channels
  CHANNELS: {
    DEPOSITS: 'deposits-channel',
    WITHDRAWALS: 'withdrawals-channel',
  } as const,

  // Query limits
  LIMITS: {
    DEPOSITS_PER_PAGE: 50,
    MAX_DEPOSITS: 1000,
    WITHDRAWALS_PER_PAGE: 50,
    MAX_WITHDRAWALS: 1000,
  } as const,

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000, // 1 second
    BACKOFF_MULTIPLIER: 2,
  } as const,

  // Real-time configuration
  REALTIME: {
    EVENTS_PER_SECOND: 10,
    RECONNECT_DELAY: 5000, // 5 seconds
  } as const,
} as const;

/**
 * Supabase error codes we handle specifically
 */
export const SUPABASE_ERROR_CODES = {
  DUPLICATE_KEY: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  PERMISSION_DENIED: '42501',
} as const;

/**
 * Default values for database operations
 */
export const DEFAULTS = {
  DEPOSIT: {
    STATUS: 'pending' as const,
    SECRETS: [] as unknown[],
    NULLIFIERS: [] as unknown[],
    POOLS: [] as unknown[],
  },
  WITHDRAWAL: {
    STATUS: 'pending' as const,
    RECIPIENT_ADDRESSES: [] as string[],
  },
} as const;