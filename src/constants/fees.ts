// Fee configuration constants
export const FEE_CONFIG = {
  // Privfi platform fee (sent to AVNU as integratorFees)
  PRIVFI_FEE_BPS: 15, // 0.15%

  // Convert basis points to decimal percentage
  bpsToPercentage: (bps: number) => bps / 100,

  // Convert basis points to decimal multiplier
  bpsToMultiplier: (bps: number) => bps / 10000,
} as const;