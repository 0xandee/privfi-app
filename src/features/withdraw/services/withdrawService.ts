import { TyphoonService } from '@/features/swap/services/typhoon';
import { WithdrawRequest, RecipientInfo, DepositTransaction } from '../types';
import { getTyphoonDepositHistory } from '@/features/swap/utils/typhoonStorage';

export class WithdrawService {
  private typhoonService: TyphoonService;

  constructor() {
    this.typhoonService = new TyphoonService();
  }

  async executeWithdraw(request: WithdrawRequest): Promise<void> {
    console.group('🚀 WithdrawService.executeWithdraw');
    console.log('Withdraw Request:', request);
    console.log('Number of recipients:', request.recipients.length);
    
    const recipientAddresses = request.recipients.map(recipient => recipient.address);
    console.log('Extracted recipient addresses:', recipientAddresses);
    
    console.log('Calling TyphoonService.withdraw()...');
    await this.typhoonService.withdraw({
      transactionHash: request.transactionHash,
      recipientAddresses
    });
    console.log('✅ WithdrawService.executeWithdraw completed successfully');
    console.groupEnd();
  }

  validateTransactionHash(hash: string): boolean {
    console.log('🔍 Validating transaction hash:', hash);
    console.log('Hash length:', hash.length);
    console.log('Hash format (without 0x):', hash.slice(2));
    
    // StarkNet transaction hashes can be 63-64 characters long after 0x prefix
    const isValid = /^0x[a-fA-F0-9]{63,64}$/.test(hash);
    console.log('Transaction hash valid:', isValid);
    return isValid;
  }

  validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{63,64}$/.test(address);
  }

  validateRecipients(recipients: RecipientInfo[]): { isValid: boolean; error?: string } {
    console.group('👥 Validating recipients');
    console.log('Recipients count:', recipients.length);
    console.log('Recipients:', recipients);
    
    if (recipients.length === 0) {
      console.error('❌ No recipients provided');
      console.groupEnd();
      return { isValid: false, error: 'At least one recipient is required' };
    }

    const totalPercentage = recipients.reduce((sum, recipient) => sum + recipient.percentage, 0);
    console.log('Total percentage:', totalPercentage);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      console.error('❌ Percentage total invalid:', totalPercentage);
      console.groupEnd();
      return { isValid: false, error: 'Total percentage must equal 100%' };
    }

    for (const recipient of recipients) {
      console.log(`Validating recipient ${recipient.id}:`, recipient);
      
      if (!this.validateAddress(recipient.address)) {
        console.error('❌ Invalid address:', recipient.address);
        console.groupEnd();
        return { isValid: false, error: `Invalid address: ${recipient.address}` };
      }
      
      if (recipient.percentage <= 0 || recipient.percentage > 100) {
        console.error('❌ Invalid percentage:', recipient.percentage);
        console.groupEnd();
        return { isValid: false, error: 'Percentage must be between 0 and 100' };
      }
      
      console.log('✅ Recipient valid');
    }

    console.log('✅ All recipients valid');
    console.groupEnd();
    return { isValid: true };
  }

  saveDepositTransaction(transaction: DepositTransaction): void {
    const key = 'privfi_deposit_transactions';
    const existing = this.getDepositTransactions();
    const updated = [...existing, transaction];
    localStorage.setItem(key, JSON.stringify(updated));
  }

  getDepositTransactions(): DepositTransaction[] {
    console.log('📋 Loading deposit transactions from Typhoon storage...');
    
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
    
    console.log(`✅ Loaded ${transactions.length} deposit transactions from Typhoon storage`);
    
    // Also check legacy storage for backward compatibility
    const legacyKey = 'privfi_deposit_transactions';
    const legacyStored = localStorage.getItem(legacyKey);
    const legacyTransactions: DepositTransaction[] = legacyStored ? JSON.parse(legacyStored) : [];
    
    if (legacyTransactions.length > 0) {
      console.log(`ℹ️ Found ${legacyTransactions.length} legacy deposit transactions`);
    }
    
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