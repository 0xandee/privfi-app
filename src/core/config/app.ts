export const APP_CONFIG = {
  name: 'Privfi',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
} as const;

export const BLOCKCHAIN_CONFIG = {
  network: 'mainnet',
  defaultChainId: 'SN_MAIN',
} as const;

export const INTEGRATOR_CONFIG = {
  name: 'Privfi',
  feeRecipient: '0x065c065C1CF438F91C3CFFd47a959112F81b5F266d4890BbCDfb4088C39749E0',
  fees: 15, // 15 basis points = 0.15%
} as const;

export const API_CONFIG = {
  avnu: {
    baseUrl: 'https://starknet.api.avnu.fi',
    timeout: 10000,
  },
} as const;