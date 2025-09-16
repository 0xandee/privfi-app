/**
 * Supabase Database Types
 * Generated for Privfi Deposits Integration
 */

export interface Database {
  public: {
    Tables: {
      deposits: {
        Row: {
          id: string;
          transaction_hash: string;
          wallet_address: string;
          token_address: string;
          amount: string;
          secrets: unknown[];
          nullifiers: unknown[];
          pools: unknown[];
          timestamp: number;
          status: 'pending' | 'confirmed' | 'withdrawn';
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          transaction_hash: string;
          wallet_address: string;
          token_address: string;
          amount: string;
          secrets?: unknown[];
          nullifiers?: unknown[];
          pools?: unknown[];
          timestamp: number;
          status: 'pending' | 'confirmed' | 'withdrawn';
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          transaction_hash?: string;
          wallet_address?: string;
          token_address?: string;
          amount?: string;
          secrets?: unknown[];
          nullifiers?: unknown[];
          pools?: unknown[];
          timestamp?: number;
          status?: 'pending' | 'confirmed' | 'withdrawn';
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // DEPRECATED: typhoon_data table no longer used - data is stored in deposits table
      // typhoon_data: {
      //   Row: {
      //     transaction_hash: string;
      //     secrets: unknown[];
      //     nullifiers: unknown[];
      //     pools: unknown[];
      //     token_address: string;
      //     amount: string;
      //     timestamp: number;
      //     wallet_address: string;
      //     created_at: string;
      //   };
      //   Insert: {
      //     transaction_hash: string;
      //     secrets?: unknown[];
      //     nullifiers?: unknown[];
      //     pools?: unknown[];
      //     token_address: string;
      //     amount: string;
      //     timestamp: number;
      //     wallet_address: string;
      //     created_at?: string;
      //   };
      //   Update: {
      //     transaction_hash?: string;
      //     secrets?: unknown[];
      //     nullifiers?: unknown[];
      //     pools?: unknown[];
      //     token_address?: string;
      //     amount?: string;
      //     timestamp?: number;
      //     wallet_address?: string;
      //     created_at?: string;
      //   };
      // };
      withdrawals: {
        Row: {
          id: string;
          deposit_id: string;
          transaction_hash: string;
          wallet_address: string;
          token_address: string;
          amount: string;
          recipient_addresses: string[];
          status: 'pending' | 'confirmed' | 'failed';
          timestamp: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          deposit_id: string;
          transaction_hash: string;
          wallet_address: string;
          token_address: string;
          amount: string;
          recipient_addresses?: string[];
          status: 'pending' | 'confirmed' | 'failed';
          timestamp: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deposit_id?: string;
          transaction_hash?: string;
          wallet_address?: string;
          token_address?: string;
          amount?: string;
          recipient_addresses?: string[];
          status?: 'pending' | 'confirmed' | 'failed';
          timestamp?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      deposit_status: 'pending' | 'confirmed' | 'withdrawn';
      withdrawal_status: 'pending' | 'confirmed' | 'failed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Utility types for easier usage
export type DepositRow = Database['public']['Tables']['deposits']['Row'];
export type DepositInsert = Database['public']['Tables']['deposits']['Insert'];
export type DepositUpdate = Database['public']['Tables']['deposits']['Update'];

// DEPRECATED: typhoon_data table no longer used
// export type TyphoonDataRow = Database['public']['Tables']['typhoon_data']['Row'];
// export type TyphoonDataInsert = Database['public']['Tables']['typhoon_data']['Insert'];
// export type TyphoonDataUpdate = Database['public']['Tables']['typhoon_data']['Update'];

export type WithdrawalRow = Database['public']['Tables']['withdrawals']['Row'];
export type WithdrawalInsert = Database['public']['Tables']['withdrawals']['Insert'];
export type WithdrawalUpdate = Database['public']['Tables']['withdrawals']['Update'];

export type DepositStatus = Database['public']['Enums']['deposit_status'];
export type WithdrawalStatus = Database['public']['Enums']['withdrawal_status'];