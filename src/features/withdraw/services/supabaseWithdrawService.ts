/**
 * Supabase Withdrawal Service
 * Data access layer for withdrawal operations with Supabase
 */

import { supabase } from '@/core/supabase/client';
import { SUPABASE_CONFIG, SUPABASE_ERROR_CODES, DEFAULTS } from '@/core/supabase/config';
import type {
  WithdrawalRow,
  WithdrawalInsert,
  WithdrawalUpdate,
  DepositRow,
  DepositUpdate
} from '@/core/supabase/types';
import type { WithdrawalRecord, GroupedDeposits } from '../types';
import { STARKNET_TOKENS, getTokenByAddress } from '@/constants/tokens';

export type CreateWithdrawalRequest = Omit<WithdrawalInsert, 'created_at' | 'updated_at'>;

export interface UpdateWithdrawalRequest {
  id: string;
  updates: WithdrawalUpdate;
}

export interface GetWithdrawalsFilters {
  walletAddress?: string;
  status?: WithdrawalRow['status'];
  limit?: number;
  offset?: number;
}

/**
 * Service class for Supabase withdrawal operations
 */
export class SupabaseWithdrawService {
  private readonly withdrawalsTableName = SUPABASE_CONFIG.TABLES.WITHDRAWALS;
  private readonly depositsTableName = SUPABASE_CONFIG.TABLES.DEPOSITS;

  /**
   * Create a new withdrawal record
   */
  async createWithdrawal(request: CreateWithdrawalRequest): Promise<WithdrawalRow> {
    try {
      const withdrawalData: WithdrawalInsert = {
        ...request,
        recipient_addresses: request.recipient_addresses || DEFAULTS.WITHDRAWAL.RECIPIENT_ADDRESSES,
        status: request.status || DEFAULTS.WITHDRAWAL.STATUS,
      };

      const { data, error } = await supabase
        .from(this.withdrawalsTableName)
        .insert(withdrawalData)
        .select()
        .single();

      if (error) {
        throw this.handleSupabaseError(error, 'create withdrawal');
      }

      if (!data) {
        throw new Error('No data returned after creating withdrawal');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, 'Failed to create withdrawal');
    }
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawalById(id: string): Promise<WithdrawalRow | null> {
    try {
      const { data, error } = await supabase
        .from(this.withdrawalsTableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw this.handleSupabaseError(error, 'get withdrawal by ID');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, `Failed to get withdrawal with ID: ${id}`);
    }
  }

  /**
   * Get withdrawal by transaction hash
   */
  async getWithdrawalByTransactionHash(transactionHash: string): Promise<WithdrawalRow | null> {
    try {
      const { data, error } = await supabase
        .from(this.withdrawalsTableName)
        .select('*')
        .eq('transaction_hash', transactionHash)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw this.handleSupabaseError(error, 'get withdrawal by transaction hash');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, `Failed to get withdrawal with transaction hash: ${transactionHash}`);
    }
  }

  /**
   * Get withdrawals with optional filtering
   */
  async getWithdrawals(filters: GetWithdrawalsFilters = {}): Promise<WithdrawalRow[]> {
    try {
      let query = supabase
        .from(this.withdrawalsTableName)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.walletAddress) {
        query = query.eq('wallet_address', filters.walletAddress);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply pagination
      const limit = filters.limit || SUPABASE_CONFIG.LIMITS.WITHDRAWALS_PER_PAGE;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw this.handleSupabaseError(error, 'get withdrawals');
      }

      return data || [];
    } catch (error) {
      throw this.wrapError(error, 'Failed to get withdrawals');
    }
  }

  /**
   * Get withdrawals for a specific wallet address
   */
  async getUserWithdrawals(walletAddress: string): Promise<WithdrawalRow[]> {
    return this.getWithdrawals({ walletAddress });
  }

  /**
   * Update a withdrawal record
   */
  async updateWithdrawal(request: UpdateWithdrawalRequest): Promise<WithdrawalRow> {
    try {
      const { data, error } = await supabase
        .from(this.withdrawalsTableName)
        .update(request.updates)
        .eq('id', request.id)
        .select()
        .single();

      if (error) {
        throw this.handleSupabaseError(error, 'update withdrawal');
      }

      if (!data) {
        throw new Error('No data returned after updating withdrawal');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, `Failed to update withdrawal with ID: ${request.id}`);
    }
  }

  /**
   * Update withdrawal status
   */
  async updateWithdrawalStatus(id: string, status: WithdrawalRow['status']): Promise<WithdrawalRow> {
    return this.updateWithdrawal({
      id,
      updates: { status },
    });
  }

  /**
   * Update withdrawal with transaction hash (typically after blockchain confirmation)
   */
  async updateWithdrawalWithTransactionHash(
    id: string,
    transactionHash: string,
    status: WithdrawalRow['status'] = 'confirmed'
  ): Promise<WithdrawalRow> {
    return this.updateWithdrawal({
      id,
      updates: {
        transaction_hash: transactionHash,
        status,
      },
    });
  }

  /**
   * Get withdrawable deposits grouped by token for a specific wallet
   */
  async getWithdrawableDepositsGrouped(walletAddress: string): Promise<GroupedDeposits[]> {
    try {
      // Get all confirmed deposits for the wallet that haven't been withdrawn
      const { data: deposits, error } = await supabase
        .from(this.depositsTableName)
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) {
        throw this.handleSupabaseError(error, 'get withdrawable deposits');
      }

      if (!deposits || deposits.length === 0) {
        return [];
      }

      // Group deposits by token address
      const groupedMap = new Map<string, DepositRow[]>();

      deposits.forEach(deposit => {
        const existing = groupedMap.get(deposit.token_address) || [];
        existing.push(deposit);
        groupedMap.set(deposit.token_address, existing);
      });

      // Convert to GroupedDeposits format
      const result: GroupedDeposits[] = [];

      for (const [tokenAddress, tokenDeposits] of groupedMap) {
        // Find token info
        const token = getTokenByAddress(tokenAddress);

        if (!token) {
          console.warn(`Token not found for address: ${tokenAddress}`);
          continue;
        }

        // Calculate total amount
        const totalAmount = tokenDeposits.reduce((sum, deposit) => {
          return (BigInt(sum) + BigInt(deposit.amount)).toString();
        }, '0');

        // Convert deposits to WithdrawableDeposit format
        const withdrawableDeposits = tokenDeposits.map(deposit => ({
          id: deposit.id,
          transactionHash: deposit.transaction_hash,
          walletAddress: deposit.wallet_address,
          tokenAddress: deposit.token_address,
          amount: deposit.amount,
          secrets: deposit.secrets,
          nullifiers: deposit.nullifiers,
          pools: deposit.pools,
          timestamp: deposit.timestamp,
          status: deposit.status as 'pending' | 'confirmed' | 'withdrawn',
          note: deposit.note || undefined,
          canWithdraw: true, // All confirmed deposits can be withdrawn
        }));

        result.push({
          tokenAddress,
          token,
          totalAmount,
          depositCount: tokenDeposits.length,
          deposits: withdrawableDeposits,
        });
      }

      return result;
    } catch (error) {
      throw this.wrapError(error, 'Failed to get withdrawable deposits grouped');
    }
  }

  /**
   * Mark deposits as withdrawn (batch update)
   */
  async markDepositsAsWithdrawn(depositIds: string[]): Promise<DepositRow[]> {
    try {
      const updates: DepositUpdate = { status: 'withdrawn' };

      const { data, error } = await supabase
        .from(this.depositsTableName)
        .update(updates)
        .in('id', depositIds)
        .select();

      if (error) {
        throw this.handleSupabaseError(error, 'mark deposits as withdrawn');
      }

      return data || [];
    } catch (error) {
      throw this.wrapError(error, 'Failed to mark deposits as withdrawn');
    }
  }

  /**
   * Delete a withdrawal record
   */
  async deleteWithdrawal(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.withdrawalsTableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.handleSupabaseError(error, 'delete withdrawal');
      }

      return true;
    } catch (error) {
      throw this.wrapError(error, `Failed to delete withdrawal with ID: ${id}`);
    }
  }

  /**
   * Convert WithdrawalRow to WithdrawalRecord for compatibility
   */
  convertToWithdrawalRecord(row: WithdrawalRow): WithdrawalRecord {
    return {
      id: row.id,
      depositId: row.deposit_id,
      transactionHash: row.transaction_hash,
      walletAddress: row.wallet_address,
      tokenAddress: row.token_address,
      amount: row.amount,
      recipientAddresses: row.recipient_addresses,
      status: row.status,
      timestamp: row.timestamp,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert WithdrawalRecord to WithdrawalInsert for database operations
   */
  convertFromWithdrawalRecord(record: WithdrawalRecord): CreateWithdrawalRequest {
    return {
      id: record.id,
      deposit_id: record.depositId,
      transaction_hash: record.transactionHash,
      wallet_address: record.walletAddress,
      token_address: record.tokenAddress,
      amount: record.amount,
      recipient_addresses: record.recipientAddresses,
      status: record.status,
      timestamp: record.timestamp,
    };
  }

  /**
   * Handle Supabase-specific errors
   */
  private handleSupabaseError(error: unknown, operation: string): Error {
    const errorCode = (error as { code?: string }).code;
    const errorMessage = (error as { message?: string }).message || 'Unknown error';

    switch (errorCode) {
      case SUPABASE_ERROR_CODES.DUPLICATE_KEY:
        return new Error(`Duplicate entry for ${operation}: ${errorMessage}`);
      case SUPABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION:
        return new Error(`Foreign key violation for ${operation}: ${errorMessage}`);
      case SUPABASE_ERROR_CODES.NOT_NULL_VIOLATION:
        return new Error(`Required field missing for ${operation}: ${errorMessage}`);
      case SUPABASE_ERROR_CODES.CHECK_VIOLATION:
        return new Error(`Invalid data for ${operation}: ${errorMessage}`);
      case SUPABASE_ERROR_CODES.PERMISSION_DENIED:
        return new Error(`Permission denied for ${operation}: ${errorMessage}`);
      default:
        return new Error(`Database error for ${operation}: ${errorMessage}`);
    }
  }

  /**
   * Wrap errors with additional context
   */
  private wrapError(error: unknown, message: string): Error {
    if (error instanceof Error) {
      return new Error(`${message}: ${error.message}`);
    }
    return new Error(`${message}: ${String(error)}`);
  }
}

// Export singleton instance
export const supabaseWithdrawService = new SupabaseWithdrawService();