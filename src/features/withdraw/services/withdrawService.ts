import { TyphoonService } from '@/features/swap/services/typhoon';
import { WithdrawRequest, RecipientInfo, DepositTransaction } from '../types';
import { getTyphoonDepositHistory } from '@/features/swap/utils/typhoonStorage';

export class WithdrawService {
  private typhoonService: TyphoonService;

  constructor() {
    this.typhoonService = new TyphoonService();
  }

  async executeWithdraw(request: WithdrawRequest): Promise<void> {
    const recipientAddresses = request.recipients.map(recipient => recipient.address);
    await this.typhoonService.withdraw({
      transactionHash: request.transactionHash,
      recipientAddresses
    });
  }

  validateTransactionHash(hash: string): boolean {
    // StarkNet transaction hashes can be 63-64 characters long after 0x prefix
    const isValid = /^0x[a-fA-F0-9]{63,64}$/.test(hash);
    return isValid;
  }

  validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{63,64}$/.test(address);
  }

  validateRecipients(recipients: RecipientInfo[]): { isValid: boolean; error?: string } {
    if (recipients.length === 0) {
      return { isValid: false, error: 'At least one recipient is required' };
    }

    const totalPercentage = recipients.reduce((sum, recipient) => sum + recipient.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { isValid: false, error: 'Total percentage must equal 100%' };
    }

    for (const recipient of recipients) {
      if (!this.validateAddress(recipient.address)) {
        return { isValid: false, error: `Invalid address: ${recipient.address}` };
      }
      
      if (recipient.percentage <= 0 || recipient.percentage > 100) {
        return { isValid: false, error: 'Percentage must be between 0 and 100' };
      }
    }

    return { isValid: true };
  }

  saveDepositTransaction(transaction: DepositTransaction): void {
    const key = 'privfi_deposit_transactions';
    const existing = this.getDepositTransactions();
    const updated = [...existing, transaction];
    localStorage.setItem(key, JSON.stringify(updated));
  }

  getDepositTransactions(): DepositTransaction[] {
    // Get from new Typhoon storage system
    const typhoonDeposits = getTyphoonDepositHistory();
    
    // Convert to DepositTransaction format for UI compatibility
    const transactions: DepositTransaction[] = typhoonDeposits.map(deposit => ({
      hash: deposit.transactionHash,
      timestamp: deposit.timestamp,
      tokenAddress: deposit.tokenAddress,
      tokenSymbol: 'Token', // TODO: Add symbol lookup
      amount: deposit.amount,
      status: 'completed' as const // Deposits in storage are assumed completed
    }));
    
    // Also check legacy storage for backward compatibility
    const legacyKey = 'privfi_deposit_transactions';
    const legacyStored = localStorage.getItem(legacyKey);
    const legacyTransactions: DepositTransaction[] = legacyStored ? JSON.parse(legacyStored) : [];
    
    
    // Combine both sources, removing duplicates by hash
    const combined = [...transactions, ...legacyTransactions];
    const unique = combined.reduce((acc, current) => {
      const exists = acc.find(item => item.hash === current.hash);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, [] as DepositTransaction[]);
    
    return unique.sort((a, b) => b.timestamp - a.timestamp);
  }

  clearDepositHistory(): void {
    localStorage.removeItem('privfi_deposit_transactions');
  }
}