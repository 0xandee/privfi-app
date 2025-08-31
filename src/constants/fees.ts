// Fee configuration constants
export const FEE_CONFIG = {
  // Privfi platform fee (sent to AVNU as integratorFees)
  PRIVFI_FEE_BPS: 15, // 0.15%
  
  // Typhoon SDK fee (calculated and deducted separately)
  TYPHOON_FEE_BPS: 50, // 0.50%
  
  // Helper functions
  TYPHOON_FEE_PERCENTAGE: 0.50,
  
  // Convert basis points to decimal percentage
  bpsToPercentage: (bps: number) => bps / 100,
  
  // Convert basis points to decimal multiplier
  bpsToMultiplier: (bps: number) => bps / 10000,
} as const;

export const TYPHOON_FEE_MULTIPLIER = 1 - FEE_CONFIG.bpsToMultiplier(FEE_CONFIG.TYPHOON_FEE_BPS);