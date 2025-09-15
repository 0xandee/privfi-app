const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface WithdrawalRequest {
  userAddress: string;
  tokenAddress: string;
  amount: string;
  recipientAddress?: string;
  typhoonData: {
    note: string;
    nullifier: string;
    commitmentHash: string;
  };
}

export interface WithdrawalResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface WithdrawalStatus {
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  timestamp?: number;
}

export class WithdrawalService {
  private static instance: WithdrawalService;

  static getInstance(): WithdrawalService {
    if (!WithdrawalService.instance) {
      WithdrawalService.instance = new WithdrawalService();
    }
    return WithdrawalService.instance;
  }

  /**
   * Get withdrawal transaction calls from backend
   */
  async getWithdrawalCalls(request: WithdrawalRequest): Promise<any[]> {
    const response = await fetch(`${BACKEND_URL}/api/proxy/withdrawal-calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get withdrawal calls: ${error}`);
    }

    const data = await response.json();
    return data.transactionCalls;
  }

  /**
   * Execute withdrawal from Typhoon pool (deprecated - kept for compatibility)
   */
  async executeWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/proxy/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Withdrawal failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get withdrawal transaction status
   */
  async getWithdrawalStatus(transactionHash: string): Promise<WithdrawalStatus> {
    const response = await fetch(
      `${BACKEND_URL}/api/proxy/withdrawal-status/${transactionHash}`
    );

    if (!response.ok) {
      throw new Error('Failed to get withdrawal status');
    }

    return await response.json();
  }

  /**
   * Get user's withdrawal history
   */
  async getWithdrawalHistory(userAddress: string): Promise<WithdrawalStatus[]> {
    const response = await fetch(
      `${BACKEND_URL}/api/proxy/withdrawals/${userAddress}`
    );

    if (!response.ok) {
      throw new Error('Failed to get withdrawal history');
    }

    const data = await response.json();
    return data.withdrawals;
  }
}