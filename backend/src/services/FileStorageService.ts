import fs from 'fs/promises';
import path from 'path';
import { DatabaseService, TyphoonDepositData, PrivacySwapData } from './DatabaseService';
import { logger } from '../utils/logger';

export class FileStorageService extends DatabaseService {
  private static instance: FileStorageService;
  private dataDir: string;
  private depositsFile: string;
  private swapsFile: string;
  private logger = new logger.constructor('FileStorageService');

  private constructor() {
    super();
    this.dataDir = path.join(process.cwd(), 'data');
    this.depositsFile = path.join(this.dataDir, 'deposits.json');
    this.swapsFile = path.join(this.dataDir, 'swaps.json');
  }

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });

      // Create files if they don't exist
      try {
        await fs.access(this.depositsFile);
      } catch {
        await fs.writeFile(this.depositsFile, '[]');
      }

      try {
        await fs.access(this.swapsFile);
      } catch {
        await fs.writeFile(this.swapsFile, '[]');
      }

      this.logger.info('File storage initialized');
    } catch (error) {
      this.logger.error('Failed to initialize file storage', error);
      throw error;
    }
  }

  async saveDepositData(data: TyphoonDepositData): Promise<void> {
    try {
      const deposits = await this.loadAllDeposits();

      // Remove existing deposit with same txHash
      const filtered = deposits.filter(d => d.transactionHash !== data.transactionHash);

      // Add new deposit
      filtered.push(data);

      await fs.writeFile(this.depositsFile, JSON.stringify(filtered, null, 2));

      this.logger.info('Saved deposit data', {
        txHash: data.transactionHash,
        userAddress: data.userAddress,
        isProxyDeposit: data.isProxyDeposit
      });
    } catch (error) {
      this.logger.error('Failed to save deposit data', error);
      throw error;
    }
  }

  async loadDepositData(txHash: string): Promise<TyphoonDepositData | null> {
    try {
      const deposits = await this.loadAllDeposits();
      return deposits.find(d => d.transactionHash === txHash) || null;
    } catch (error) {
      this.logger.error('Failed to load deposit data', error);
      return null;
    }
  }

  async clearDepositData(txHash: string): Promise<void> {
    try {
      const deposits = await this.loadAllDeposits();
      const filtered = deposits.filter(d => d.transactionHash !== txHash);

      await fs.writeFile(this.depositsFile, JSON.stringify(filtered, null, 2));

      this.logger.info('Cleared deposit data', { txHash });
    } catch (error) {
      this.logger.error('Failed to clear deposit data', error);
      throw error;
    }
  }

  async getUserDeposits(userAddress: string): Promise<TyphoonDepositData[]> {
    try {
      const deposits = await this.loadAllDeposits();
      return deposits.filter(d =>
        d.userAddress.toLowerCase() === userAddress.toLowerCase() && !d.isProxyDeposit
      );
    } catch (error) {
      this.logger.error('Failed to get user deposits', error);
      return [];
    }
  }

  async getProxyDeposits(tokenAddress: string): Promise<TyphoonDepositData[]> {
    try {
      const deposits = await this.loadAllDeposits();
      return deposits.filter(d =>
        d.isProxyDeposit && d.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
      );
    } catch (error) {
      this.logger.error('Failed to get proxy deposits', error);
      return [];
    }
  }

  async saveSwapData(data: PrivacySwapData): Promise<void> {
    try {
      const swaps = await this.loadAllSwaps();

      // Remove existing swap with same ID
      const filtered = swaps.filter(s => s.swapId !== data.swapId);

      // Add new swap
      filtered.push(data);

      await fs.writeFile(this.swapsFile, JSON.stringify(filtered, null, 2));

      this.logger.info('Saved swap data', {
        swapId: data.swapId,
        userAddress: data.userAddress,
        phase: data.phase
      });
    } catch (error) {
      this.logger.error('Failed to save swap data', error);
      throw error;
    }
  }

  async loadSwapData(swapId: string): Promise<PrivacySwapData | null> {
    try {
      const swaps = await this.loadAllSwaps();
      return swaps.find(s => s.swapId === swapId) || null;
    } catch (error) {
      this.logger.error('Failed to load swap data', error);
      return null;
    }
  }

  async updateSwapData(swapId: string, updates: Partial<PrivacySwapData>): Promise<void> {
    try {
      const swaps = await this.loadAllSwaps();
      const index = swaps.findIndex(s => s.swapId === swapId);

      if (index >= 0) {
        swaps[index] = { ...swaps[index], ...updates, updatedAt: Date.now() };
        await fs.writeFile(this.swapsFile, JSON.stringify(swaps, null, 2));

        this.logger.info('Updated swap data', { swapId, updates });
      }
    } catch (error) {
      this.logger.error('Failed to update swap data', error);
      throw error;
    }
  }

  async getUserSwaps(userAddress: string): Promise<PrivacySwapData[]> {
    try {
      const swaps = await this.loadAllSwaps();
      return swaps.filter(s => s.userAddress.toLowerCase() === userAddress.toLowerCase());
    } catch (error) {
      this.logger.error('Failed to get user swaps', error);
      return [];
    }
  }

  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      // Clean old deposits
      const deposits = await this.loadAllDeposits();
      const recentDeposits = deposits.filter(d => now - d.timestamp < maxAge);

      if (recentDeposits.length !== deposits.length) {
        await fs.writeFile(this.depositsFile, JSON.stringify(recentDeposits, null, 2));
        this.logger.info('Cleaned old deposits', {
          removed: deposits.length - recentDeposits.length
        });
      }

      // Clean old swaps
      const swaps = await this.loadAllSwaps();
      const recentSwaps = swaps.filter(s => now - s.createdAt < maxAge);

      if (recentSwaps.length !== swaps.length) {
        await fs.writeFile(this.swapsFile, JSON.stringify(recentSwaps, null, 2));
        this.logger.info('Cleaned old swaps', {
          removed: swaps.length - recentSwaps.length
        });
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old data', error);
    }
  }

  private async loadAllDeposits(): Promise<TyphoonDepositData[]> {
    try {
      const data = await fs.readFile(this.depositsFile, 'utf8');
      const parsed = JSON.parse(data);

      // Handle different data formats
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed && typeof parsed === 'object') {
        // If it's an object (like from PrivacyDepositManager format), flatten it
        const depositsArray = Object.values(parsed).flat();
        this.logger.warn('Converted object format to array', {
          originalKeys: Object.keys(parsed),
          totalDeposits: depositsArray.length
        });
        return depositsArray;
      } else {
        this.logger.warn('Invalid data format in deposits file, returning empty array');
        return [];
      }
    } catch (error) {
      this.logger.debug('No deposits file found or error reading, returning empty array');
      return [];
    }
  }

  private async loadAllSwaps(): Promise<PrivacySwapData[]> {
    try {
      const data = await fs.readFile(this.swapsFile, 'utf8');
      return JSON.parse(data) || [];
    } catch (error) {
      return [];
    }
  }
}