import { TyphoonService } from '@/features/swap/services/typhoon';
import { TyphoonWithdrawRequest } from '@/features/swap/types/typhoon';
import { supabaseWithdrawService } from './supabaseWithdrawService';
import { supabaseDepositService } from '@/features/deposit/services/supabaseDepositService';
import type {
  WithdrawRequest,
  WithdrawResponse,
  WithdrawalRecord,
  GroupedDeposits
} from '../types';
import { DepositRecord } from '@/features/deposit/types';

export class WithdrawService {
  private typhoonService: TyphoonService;

  constructor() {
    this.typhoonService = new TyphoonService();
  }

  /**
   * Get withdrawable deposits grouped by token for a wallet
   */
  async getWithdrawableDeposits(walletAddress: string): Promise<GroupedDeposits[]> {
    try {
      return await supabaseWithdrawService.getWithdrawableDepositsGrouped(walletAddress);
    } catch (error) {
      throw new Error(`Failed to get withdrawable deposits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute withdrawal using Typhoon privacy protocol
   */
  async executeWithdraw(request: WithdrawRequest): Promise<WithdrawResponse> {
    try {
      // Validate deposits belong to wallet and are withdrawable
      const deposits = await this.validateDepositsForWithdrawal(request.depositIds, request.walletAddress);

      if (deposits.length === 0) {
        throw new Error('No valid deposits found for withdrawal');
      }

      // Ensure all deposits are for the same token
      const tokenAddresses = [...new Set(deposits.map(d => d.tokenAddress))];
      if (tokenAddresses.length > 1) {
        throw new Error('Cannot withdraw deposits from different tokens in a single transaction');
      }

      const tokenAddress = tokenAddresses[0];

      // Calculate total amount
      const totalAmount = deposits.reduce((sum, deposit) => {
        return (BigInt(sum) + BigInt(deposit.amount)).toString();
      }, '0');

      // For Typhoon withdrawals, we need the transaction hash from one of the deposits
      // This is used to restore the SDK state for withdrawal
      const firstDeposit = deposits[0];

      // Create withdrawal record before executing
      const withdrawalRecord = await this.createWithdrawalRecord({
        deposits,
        recipientAddress: request.recipientAddress,
        walletAddress: request.walletAddress,
        tokenAddress,
        totalAmount,
      });

      try {
        // Execute Typhoon withdrawal
        const typhoonRequest: TyphoonWithdrawRequest = {
          transactionHash: firstDeposit.transactionHash,
          recipientAddresses: [request.recipientAddress],
        };

        await this.typhoonService.withdraw(typhoonRequest);

        // Mark deposits as withdrawn in database
        const updatedDeposits = await Promise.all(
          request.depositIds.map(id =>
            supabaseDepositService.updateDepositStatus(id, 'withdrawn')
          )
        );

        // Update withdrawal record to confirmed
        await supabaseWithdrawService.updateWithdrawalStatus(withdrawalRecord.id, 'confirmed');

        return {
          transactionHash: withdrawalRecord.transactionHash,
          withdrawalRecord: {
            ...withdrawalRecord,
            status: 'confirmed',
          },
          updatedDeposits: updatedDeposits.map(row =>
            supabaseDepositService.convertToDepositRecord(row)
          ),
        };
      } catch (typhoonError) {
        // Mark withdrawal as failed
        await supabaseWithdrawService.updateWithdrawalStatus(withdrawalRecord.id, 'failed');

        throw new Error(`Typhoon withdrawal failed: ${typhoonError instanceof Error ? typhoonError.message : 'Unknown error'}`);
      }
    } catch (error) {
      throw new Error(`Withdrawal execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get withdrawal history for a wallet
   */
  async getWithdrawalHistory(walletAddress: string): Promise<WithdrawalRecord[]> {
    try {
      const withdrawals = await supabaseWithdrawService.getUserWithdrawals(walletAddress);
      return withdrawals.map(withdrawal =>
        supabaseWithdrawService.convertToWithdrawalRecord(withdrawal)
      );
    } catch (error) {
      throw new Error(`Failed to get withdrawal history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that deposits can be withdrawn
   */
  private async validateDepositsForWithdrawal(
    depositIds: string[],
    walletAddress: string
  ): Promise<DepositRecord[]> {
    const deposits: DepositRecord[] = [];

    for (const depositId of depositIds) {
      const depositRow = await supabaseDepositService.getDepositById(depositId);

      if (!depositRow) {
        throw new Error(`Deposit not found: ${depositId}`);
      }

      const deposit = supabaseDepositService.convertToDepositRecord(depositRow);

      // Validate deposit belongs to wallet
      if (deposit.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(`Deposit ${depositId} does not belong to wallet ${walletAddress}`);
      }

      // Validate deposit is confirmed and not already withdrawn
      if (deposit.status !== 'confirmed') {
        throw new Error(`Deposit ${depositId} is not in confirmed status (current: ${deposit.status})`);
      }

      // Validate deposit has necessary Typhoon data
      if (!deposit.secrets || !deposit.nullifiers || !deposit.pools) {
        throw new Error(`Deposit ${depositId} is missing required Typhoon data for withdrawal`);
      }

      deposits.push(deposit);
    }

    return deposits;
  }

  /**
   * Create withdrawal record in database
   */
  private async createWithdrawalRecord({
    deposits,
    recipientAddress,
    walletAddress,
    tokenAddress,
    totalAmount,
  }: {
    deposits: DepositRecord[];
    recipientAddress: string;
    walletAddress: string;
    tokenAddress: string;
    totalAmount: string;
  }): Promise<WithdrawalRecord> {
    // Generate withdrawal ID and transaction hash placeholder
    const withdrawalId = this.generateWithdrawalId();
    const transactionHash = this.generateTransactionHashPlaceholder();

    const withdrawalData = {
      id: withdrawalId,
      deposit_id: deposits[0].id, // Primary deposit for reference
      transaction_hash: transactionHash,
      wallet_address: walletAddress,
      token_address: tokenAddress,
      amount: totalAmount,
      recipient_addresses: [recipientAddress],
      status: 'pending' as const,
      timestamp: Date.now(),
    };

    const createdWithdrawal = await supabaseWithdrawService.createWithdrawal(withdrawalData);
    return supabaseWithdrawService.convertToWithdrawalRecord(createdWithdrawal);
  }

  /**
   * Generate unique withdrawal ID
   */
  private generateWithdrawalId(): string {
    return `withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate transaction hash placeholder
   * In a real implementation, this would be the actual transaction hash from the blockchain
   */
  private generateTransactionHashPlaceholder(): string {
    return `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;
  }
}