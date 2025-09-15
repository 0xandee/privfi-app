import { TyphoonDeposit } from '../types/privacy';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class PrivacyDepositManager {
  private static instance: PrivacyDepositManager;
  private deposits: Map<string, TyphoonDeposit[]> = new Map();
  private logger = new logger.constructor('PrivacyDepositManager');
  private storageFile = './data/deposits.json';

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): PrivacyDepositManager {
    if (!PrivacyDepositManager.instance) {
      PrivacyDepositManager.instance = new PrivacyDepositManager();
    }
    return PrivacyDepositManager.instance;
  }

  async trackDeposit(deposit: TyphoonDeposit): Promise<void> {
    const userDeposits = this.deposits.get(deposit.userAddress) || [];

    // Check if deposit already exists
    const existingIndex = userDeposits.findIndex(d => d.txHash === deposit.txHash);
    if (existingIndex >= 0) {
      userDeposits[existingIndex] = deposit;
    } else {
      userDeposits.push(deposit);
    }

    this.deposits.set(deposit.userAddress, userDeposits);

    // Save to persistent storage
    this.saveToStorage();

    this.logger.info('Tracked deposit', {
      userAddress: deposit.userAddress,
      txHash: deposit.txHash,
      amount: deposit.amount,
      token: deposit.tokenAddress
    });
  }

  async updateDepositStatus(
    userAddress: string,
    txHash: string,
    status: TyphoonDeposit['status'],
    remainingBalance?: string
  ): Promise<void> {
    const userDeposits = this.deposits.get(userAddress) || [];
    const deposit = userDeposits.find(d => d.txHash === txHash);

    if (deposit) {
      deposit.status = status;
      if (remainingBalance !== undefined) {
        deposit.remainingBalance = remainingBalance;
      }

      this.logger.info('Updated deposit status', {
        userAddress,
        txHash,
        status,
        remainingBalance
      });
    }
  }

  getTotalBalance(userAddress: string, tokenAddress: string): string {
    const userDeposits = this.deposits.get(userAddress) || [];

    const totalBalance = userDeposits
      .filter(d =>
        d.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
        (d.status === 'available' || d.status === 'partially_used')
      )
      .reduce((total, d) => {
        const balance = BigInt(d.remainingBalance || d.amount);
        return total + balance;
      }, 0n);

    return totalBalance.toString();
  }

  selectOptimalDeposit(
    userAddress: string,
    tokenAddress: string,
    requiredAmount: string
  ): TyphoonDeposit | null {
    const userDeposits = this.deposits.get(userAddress) || [];
    const requiredBigInt = BigInt(requiredAmount);

    // Filter eligible deposits
    const eligibleDeposits = userDeposits
      .filter(d =>
        d.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
        (d.status === 'available' || d.status === 'partially_used') &&
        BigInt(d.remainingBalance || d.amount) >= requiredBigInt
      )
      .sort((a, b) => {
        // Sort by remaining balance (ascending) to use smallest sufficient deposit
        const balanceA = BigInt(a.remainingBalance || a.amount);
        const balanceB = BigInt(b.remainingBalance || b.amount);
        return balanceA < balanceB ? -1 : balanceA > balanceB ? 1 : 0;
      });

    if (eligibleDeposits.length === 0) {
      this.logger.warn('No optimal deposit found', {
        userAddress,
        tokenAddress,
        requiredAmount,
        totalBalance: this.getTotalBalance(userAddress, tokenAddress)
      });
      return null;
    }

    const selectedDeposit = eligibleDeposits[0];

    this.logger.info('Selected optimal deposit', {
      userAddress,
      txHash: selectedDeposit.txHash,
      remainingBalance: selectedDeposit.remainingBalance || selectedDeposit.amount,
      requiredAmount
    });

    return selectedDeposit;
  }

  getUserDeposits(userAddress: string): TyphoonDeposit[] {
    return this.deposits.get(userAddress) || [];
  }

  getAllUserAddresses(): string[] {
    return Array.from(this.deposits.keys());
  }

  getDepositByTxHash(userAddress: string, txHash: string): TyphoonDeposit | null {
    const userDeposits = this.deposits.get(userAddress) || [];
    return userDeposits.find(d => d.txHash === txHash) || null;
  }

  clearUserDeposits(userAddress: string): void {
    this.deposits.delete(userAddress);
    this.saveToStorage();
    this.logger.info('Cleared user deposits', { userAddress });
  }

  private loadFromStorage(): void {
    try {
      const dataDir = path.dirname(this.storageFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8');
        const depositsObj = JSON.parse(data);

        // Convert back to Map
        for (const [userAddress, deposits] of Object.entries(depositsObj)) {
          this.deposits.set(userAddress, deposits as TyphoonDeposit[]);
        }

        this.logger.info('Loaded deposits from storage', {
          totalUsers: this.deposits.size,
          totalDeposits: Array.from(this.deposits.values()).flat().length
        });
      }
    } catch (error) {
      this.logger.error('Failed to load deposits from storage', error);
    }
  }

  private saveToStorage(): void {
    try {
      const dataDir = path.dirname(this.storageFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Convert Map to object for JSON serialization
      const depositsObj = Object.fromEntries(this.deposits);
      fs.writeFileSync(this.storageFile, JSON.stringify(depositsObj, null, 2));
    } catch (error) {
      this.logger.error('Failed to save deposits to storage', error);
    }
  }
}