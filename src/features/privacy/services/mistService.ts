import { getChamber, fetchTxAssets, checkTxExists, getTxIndexInTree, type Asset } from '@mistcash/sdk';
import { txHash, txSecret } from '@mistcash/crypto';
import { CHAMBER_ADDR_MAINNET, tokensMap, tokensData } from '@mistcash/config';
import type { ProviderInterface, AccountInterface } from 'starknet';
import type { DepositData, WithdrawalData, TokenOption } from '../types';

export class MistService {
  private provider: ProviderInterface | AccountInterface;
  private contract;

  constructor(provider: ProviderInterface | AccountInterface) {
    this.provider = provider;
    this.contract = getChamber(provider);
  }

  // Get contract address
  getContractAddress(): string {
    return CHAMBER_ADDR_MAINNET;
  }

  // Get supported tokens
  getSupportedTokens(): TokenOption[] {
    return tokensData.map(token => ({
      id: token.id,
      name: token.name,
      decimals: token.decimals,
      color: token.color,
      textColor: token.textColor,
      icon: token.icon
    }));
  }

  // Generate a random claiming key
  generateClaimingKey(): string {
    return Math.floor(Math.random() * 1000000).toString();
  }

  // Validate claiming key format
  validateClaimingKey(key: string): boolean {
    return /^[0-9]+$/.test(key) && key.length > 0;
  }

  // Validate recipient address format
  validateRecipientAddress(address: string): boolean {
    return address.startsWith('0x') && address.length === 66;
  }

  // Generate transaction hash for deposit
  async generateDepositTxHash(
    claimingKey: string,
    recipient: string,
    tokenAddress: string,
    amount: string
  ): Promise<string> {
    try {
      if (!this.validateClaimingKey(claimingKey)) {
        throw new Error('Invalid claiming key format');
      }

      if (!this.validateRecipientAddress(recipient)) {
        throw new Error('Invalid recipient address format');
      }

      const hash = await txHash(claimingKey, recipient, tokenAddress, amount);
      return hash.toString();
    } catch (error) {
      console.error('Failed to generate transaction hash:', error);
      throw new Error('Failed to generate transaction hash');
    }
  }

  // Generate transaction secret (not stored on chain)
  async generateTxSecret(claimingKey: string, recipient: string): Promise<string> {
    try {
      const secret = await txSecret(claimingKey, recipient);
      return secret.toString();
    } catch (error) {
      console.error('Failed to generate transaction secret:', error);
      throw new Error('Failed to generate transaction secret');
    }
  }

  // Fetch transaction assets
  async fetchTransactionAssets(claimingKey: string, recipient: string): Promise<Asset> {
    try {
      if (!this.validateClaimingKey(claimingKey)) {
        throw new Error('Invalid claiming key format');
      }

      if (!this.validateRecipientAddress(recipient)) {
        throw new Error('Invalid recipient address format');
      }

      const asset = await fetchTxAssets(this.contract, claimingKey, recipient);
      return asset;
    } catch (error) {
      console.error('Failed to fetch transaction assets:', error);
      throw new Error('Transaction not found or failed to fetch');
    }
  }

  // Check if transaction exists in merkle tree
  async verifyTransactionExists(
    claimingKey: string,
    recipient: string,
    tokenAddress: string,
    amount: string
  ): Promise<boolean> {
    try {
      const exists = await checkTxExists(
        this.contract,
        claimingKey,
        recipient,
        tokenAddress,
        amount
      );
      return exists;
    } catch (error) {
      console.error('Failed to verify transaction:', error);
      return false;
    }
  }

  // Get transaction index in merkle tree
  async getTransactionIndex(
    claimingKey: string,
    recipient: string,
    tokenAddress: string,
    amount: string
  ): Promise<number> {
    try {
      const txArray = await this.contract.tx_array();
      const index = await getTxIndexInTree(
        txArray,
        claimingKey,
        recipient,
        tokenAddress,
        amount
      );
      return index;
    } catch (error) {
      console.error('Failed to get transaction index:', error);
      return -1;
    }
  }

  // Format amount for display
  formatAmount(amount: bigint, tokenAddress: string): string {
    const token = tokensMap[tokenAddress];
    if (!token) return amount.toString();

    const divisor = BigInt(10 ** token.decimals);
    const wholeUnits = amount / divisor;
    const decimals = amount % divisor;

    if (decimals === 0n) {
      return wholeUnits.toString();
    }

    const decimalStr = decimals.toString().padStart(token.decimals, '0');
    const trimmedDecimals = decimalStr.replace(/0+$/, '');

    return trimmedDecimals.length > 0
      ? `${wholeUnits}.${trimmedDecimals}`
      : wholeUnits.toString();
  }

  // Parse amount from string to bigint
  parseAmount(amount: string, tokenAddress: string): bigint {
    const token = tokensMap[tokenAddress];
    if (!token) throw new Error('Unknown token');

    const [whole, decimal = ''] = amount.split('.');
    const paddedDecimal = decimal.padEnd(token.decimals, '0');

    if (paddedDecimal.length > token.decimals) {
      throw new Error(`Too many decimal places for ${token.name}`);
    }

    return BigInt(whole + paddedDecimal);
  }

  // Get token information
  getTokenInfo(tokenAddress: string): TokenOption | undefined {
    const token = tokensMap[tokenAddress];
    if (!token) return undefined;

    return {
      id: token.id,
      name: token.name,
      decimals: token.decimals,
      color: token.color,
      textColor: token.textColor,
      icon: token.icon
    };
  }

  // Create deposit call for transaction
  createDepositCall(txHash: string, asset: { amount: bigint; addr: string }) {
    return this.contract.populate('deposit', [
      BigInt(txHash),
      {
        amount: asset.amount,
        addr: asset.addr
      }
    ]);
  }

  // Create withdrawal call (no ZK proof version for testing)
  createWithdrawalCall(
    claimingKey: string,
    recipient: string,
    asset: Asset,
    merkleProof: string[] = []
  ) {
    return this.contract.populate('withdraw_no_zk', [
      BigInt(claimingKey),
      recipient,
      {
        amount: asset.amount,
        addr: asset.addr
      },
      merkleProof
    ]);
  }
}

// Create singleton instance
let mistServiceInstance: MistService | null = null;

export const mistService = {
  initialize: (provider: ProviderInterface | AccountInterface): MistService => {
    mistServiceInstance = new MistService(provider);
    return mistServiceInstance;
  },

  getInstance: (): MistService => {
    if (!mistServiceInstance) {
      throw new Error('MistService not initialized. Call initialize() first.');
    }
    return mistServiceInstance;
  }
};