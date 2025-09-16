/**
 * Supabase Deposit Service
 * Data access layer for deposit operations with Supabase
 */

import { supabase } from '@/core/supabase/client';
import { SUPABASE_CONFIG, SUPABASE_ERROR_CODES, DEFAULTS } from '@/core/supabase/config';
import type { DepositRow, DepositInsert, DepositUpdate, TyphoonDataInsert, TyphoonDataRow } from '@/core/supabase/types';
import type { DepositRecord } from '../types';

export interface CreateDepositRequest extends Omit<DepositInsert, 'created_at' | 'updated_at'> {}

export interface UpdateDepositRequest {
  id: string;
  updates: DepositUpdate;
}

export interface GetDepositsFilters {
  walletAddress?: string;
  status?: DepositRow['status'];
  limit?: number;
  offset?: number;
}

/**
 * Service class for Supabase deposit operations
 */
export class SupabaseDepositService {
  private readonly tableName = SUPABASE_CONFIG.TABLES.DEPOSITS;
  private readonly typhoonTableName = SUPABASE_CONFIG.TABLES.TYPHOON_DATA;

  /**
   * Create a new deposit record
   */
  async createDeposit(request: CreateDepositRequest): Promise<DepositRow> {
    try {
      const depositData: DepositInsert = {
        ...request,
        secrets: request.secrets || DEFAULTS.DEPOSIT.SECRETS,
        nullifiers: request.nullifiers || DEFAULTS.DEPOSIT.NULLIFIERS,
        pools: request.pools || DEFAULTS.DEPOSIT.POOLS,
        status: request.status || DEFAULTS.DEPOSIT.STATUS,
      };

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(depositData)
        .select()
        .single();

      if (error) {
        throw this.handleSupabaseError(error, 'create deposit');
      }

      if (!data) {
        throw new Error('No data returned after creating deposit');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, 'Failed to create deposit');
    }
  }

  /**
   * Get deposit by ID
   */
  async getDepositById(id: string): Promise<DepositRow | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw this.handleSupabaseError(error, 'get deposit by ID');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, `Failed to get deposit with ID: ${id}`);
    }
  }

  /**
   * Get deposit by transaction hash
   */
  async getDepositByTransactionHash(transactionHash: string): Promise<DepositRow | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('transaction_hash', transactionHash)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw this.handleSupabaseError(error, 'get deposit by transaction hash');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, `Failed to get deposit with transaction hash: ${transactionHash}`);
    }
  }

  /**
   * Get deposits with optional filtering
   */
  async getDeposits(filters: GetDepositsFilters = {}): Promise<DepositRow[]> {
    try {
      let query = supabase
        .from(this.tableName)
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
      const limit = filters.limit || SUPABASE_CONFIG.LIMITS.DEPOSITS_PER_PAGE;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw this.handleSupabaseError(error, 'get deposits');
      }

      return data || [];
    } catch (error) {
      throw this.wrapError(error, 'Failed to get deposits');
    }
  }

  /**
   * Get deposits for a specific wallet address
   */
  async getUserDeposits(walletAddress: string): Promise<DepositRow[]> {
    return this.getDeposits({ walletAddress });
  }

  /**
   * Update a deposit record
   */
  async updateDeposit(request: UpdateDepositRequest): Promise<DepositRow> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(request.updates)
        .eq('id', request.id)
        .select()
        .single();

      if (error) {
        throw this.handleSupabaseError(error, 'update deposit');
      }

      if (!data) {
        throw new Error('No data returned after updating deposit');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, `Failed to update deposit with ID: ${request.id}`);
    }
  }

  /**
   * Update deposit status
   */
  async updateDepositStatus(id: string, status: DepositRow['status']): Promise<DepositRow> {
    return this.updateDeposit({
      id,
      updates: { status },
    });
  }

  /**
   * Update deposit with transaction hash (typically after blockchain confirmation)
   */
  async updateDepositWithTransactionHash(
    id: string,
    transactionHash: string,
    status: DepositRow['status'] = 'confirmed'
  ): Promise<DepositRow> {
    return this.updateDeposit({
      id,
      updates: {
        transaction_hash: transactionHash,
        status,
      },
    });
  }

  /**
   * Delete a deposit record
   */
  async deleteDeposit(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.handleSupabaseError(error, 'delete deposit');
      }

      return true;
    } catch (error) {
      throw this.wrapError(error, `Failed to delete deposit with ID: ${id}`);
    }
  }

  /**
   * Save Typhoon data for future withdrawals
   */
  async saveTyphoonData(data: TyphoonDataInsert): Promise<TyphoonDataRow> {
    try {
      const { data: result, error } = await supabase
        .from(this.typhoonTableName)
        .upsert(data, { onConflict: 'transaction_hash' })
        .select()
        .single();

      if (error) {
        throw this.handleSupabaseError(error, 'save Typhoon data');
      }

      if (!result) {
        throw new Error('No data returned after saving Typhoon data');
      }

      return result;
    } catch (error) {
      throw this.wrapError(error, 'Failed to save Typhoon data');
    }
  }

  /**
   * Get Typhoon data by transaction hash
   */
  async getTyphoonData(transactionHash: string): Promise<TyphoonDataRow | null> {
    try {
      const { data, error } = await supabase
        .from(this.typhoonTableName)
        .select('*')
        .eq('transaction_hash', transactionHash)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw this.handleSupabaseError(error, 'get Typhoon data');
      }

      return data;
    } catch (error) {
      throw this.wrapError(error, `Failed to get Typhoon data for transaction: ${transactionHash}`);
    }
  }

  /**
   * Delete Typhoon data (after withdrawal)
   */
  async deleteTyphoonData(transactionHash: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.typhoonTableName)
        .delete()
        .eq('transaction_hash', transactionHash);

      if (error) {
        throw this.handleSupabaseError(error, 'delete Typhoon data');
      }

      return true;
    } catch (error) {
      throw this.wrapError(error, `Failed to delete Typhoon data for transaction: ${transactionHash}`);
    }
  }

  /**
   * Convert DepositRow to DepositRecord for backward compatibility
   */
  convertToDepositRecord(row: DepositRow): DepositRecord {
    return {
      id: row.id,
      transactionHash: row.transaction_hash,
      walletAddress: row.wallet_address,
      tokenAddress: row.token_address,
      amount: row.amount,
      secrets: row.secrets,
      nullifiers: row.nullifiers,
      pools: row.pools,
      timestamp: row.timestamp,
      status: row.status,
      note: row.note || undefined,
    };
  }

  /**
   * Convert DepositRecord to DepositInsert for database operations
   */
  convertFromDepositRecord(record: DepositRecord): CreateDepositRequest {
    return {
      id: record.id,
      transaction_hash: record.transactionHash,
      wallet_address: record.walletAddress,
      token_address: record.tokenAddress,
      amount: record.amount,
      secrets: record.secrets,
      nullifiers: record.nullifiers,
      pools: record.pools,
      timestamp: record.timestamp,
      status: record.status,
      note: record.note || null,
    };
  }

  /**
   * Handle Supabase-specific errors
   */
  private handleSupabaseError(error: any, operation: string): Error {
    const errorCode = error.code;
    const errorMessage = error.message || 'Unknown error';

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
export const supabaseDepositService = new SupabaseDepositService();