import { TyphoonService } from '@/features/swap/services/typhoon';
import { TyphoonDepositCall } from '@/features/swap/types/typhoon';
import { TyphoonDepositData } from '@/features/swap/utils/typhoonStorage';
import { DepositRecord } from '../types';

export interface DirectDepositRequest {
  amount: string; // Raw amount in smallest unit (e.g., "1000000" for 1 USDC with 6 decimals)
  tokenAddress: string;
  walletAddress: string;
}

export interface DirectDepositResponse {
  depositCalls: TyphoonDepositCall[];
  depositData: TyphoonDepositData;
  depositRecord: DepositRecord;
}

export class DepositService {
  private typhoonService: TyphoonService;

  constructor() {
    this.typhoonService = new TyphoonService();
  }

  /**
   * Execute a direct deposit into Typhoon privacy pools
   */
  async executeDirectDeposit(request: DirectDepositRequest): Promise<DirectDepositResponse> {
    try {
      // Generate approve and deposit calls
      const depositCalls = await this.typhoonService.generateApproveAndDepositCalls(
        request.amount,
        request.tokenAddress,
        request.walletAddress
      );

      // Get the SDK data that was stored during call generation
      const secrets = this.typhoonService['sdk'].get_secrets();
      const nullifiers = this.typhoonService['sdk'].get_nullifiers();
      const pools = this.typhoonService['sdk'].get_pools();

      // Create deposit data for Typhoon storage
      const depositData: TyphoonDepositData = {
        transactionHash: '', // Will be filled after transaction
        secrets: secrets || [],
        nullifiers: nullifiers || [],
        pools: pools || [],
        tokenAddress: request.tokenAddress,
        amount: request.amount,
        timestamp: Date.now(),
        walletAddress: request.walletAddress
      };

      // Create deposit record for our store
      const depositRecord: DepositRecord = {
        id: this.generateDepositId(),
        transactionHash: '', // Will be filled after transaction
        walletAddress: request.walletAddress,
        tokenAddress: request.tokenAddress,
        amount: request.amount,
        secrets: secrets || [],
        nullifiers: nullifiers || [],
        pools: pools || [],
        timestamp: Date.now(),
        status: 'pending',
        note: this.generateDepositNote(request.amount, request.tokenAddress)
      };

      return {
        depositCalls,
        depositData,
        depositRecord
      };
    } catch (error) {
      throw new Error(`Direct deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update deposit with transaction hash after transaction completion
   */
  updateDepositWithTransactionHash(
    depositData: TyphoonDepositData,
    depositRecord: DepositRecord,
    transactionHash: string
  ): { depositData: TyphoonDepositData; depositRecord: DepositRecord } {
    return {
      depositData: {
        ...depositData,
        transactionHash
      },
      depositRecord: {
        ...depositRecord,
        transactionHash,
        status: 'confirmed'
      }
    };
  }

  /**
   * Get minimum amount for a token
   */
  getTokenMinimalAmount(tokenAddress: string): string {
    return this.typhoonService.getTokenMinimalAmount(tokenAddress);
  }

  /**
   * Generate unique deposit ID
   */
  private generateDepositId(): string {
    return `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate user-friendly deposit note
   */
  private generateDepositNote(amount: string, tokenAddress: string): string {
    // Get token symbol from address (simplified version)
    const getTokenSymbol = (addr: string): string => {
      const normalized = addr.toLowerCase();
      if (normalized === '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7') return 'ETH';
      if (normalized === '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d') return 'STRK';
      if (normalized === '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8') return 'USDC';
      if (normalized === '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac') return 'WBTC';
      return 'TOKEN';
    };

    const symbol = getTokenSymbol(tokenAddress);
    return `Private deposit of ${amount} ${symbol}`;
  }
}