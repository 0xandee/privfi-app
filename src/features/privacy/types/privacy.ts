import { Asset } from '@mistcash/sdk';

export interface DepositData {
  amount: string;
  tokenAddress: string;
  tokenName: string;
  claimingKey: string;
  recipient: string;
  txHash: string | null;
}

export interface WithdrawalData {
  claimingKey: string;
  recipient: string;
  asset: Asset | null;
}

export interface DepositRecord {
  id: string;
  depositData: DepositData;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'claimed';
  txHash?: string;
}

export interface ClaimedTransaction {
  txId: string;
  claimingKey: string;
  recipient: string;
  tokenAddress: string;
  amount: string;
  claimedAt: number;
}

export interface PrivacyFormState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  message: string | null;
}

export interface TokenOption {
  id: string;
  name: string;
  decimals: number;
  color: string;
  textColor: string;
  icon: string;
}