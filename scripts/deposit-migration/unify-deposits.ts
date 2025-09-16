import * as fs from 'fs';
import * as path from 'path';
import { UnifiedDeposit, RawDepositFile1, RawDepositFile2, RawDepositFile3 } from './types';

class DepositUnifier {
  private downloadsPaths: string[] = [
    '/Users/0xandee/Downloads/deposits (2).json',
    '/Users/0xandee/Downloads/deposits (1).json',
    '/Users/0xandee/Downloads/deposits.json'
  ];

  async unifyDeposits(): Promise<UnifiedDeposit[]> {
    const unifiedDeposits: UnifiedDeposit[] = [];

    // Process each file
    for (let i = 0; i < this.downloadsPaths.length; i++) {
      const filePath = this.downloadsPaths[i];
      const fileName = path.basename(filePath);

      try {
        console.log(`Processing file: ${fileName}`);
        const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (i === 0) {
          // deposits (2).json - format 1
          const deposits = this.processFile1(rawData as RawDepositFile1, fileName);
          unifiedDeposits.push(...deposits);
        } else if (i === 1) {
          // deposits (1).json - format 2
          const deposits = this.processFile2(rawData as RawDepositFile2, fileName);
          unifiedDeposits.push(...deposits);
        } else if (i === 2) {
          // deposits.json - format 3
          const deposits = this.processFile3(rawData as RawDepositFile3, fileName);
          unifiedDeposits.push(...deposits);
        }

        console.log(`Processed ${fileName}: found deposits`);
      } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        continue;
      }
    }

    console.log(`Total deposits before filtering: ${unifiedDeposits.length}`);

    // Filter for valid deposits
    const validDeposits = this.filterValidDeposits(unifiedDeposits);

    console.log(`Valid deposits after filtering: ${validDeposits.length}`);

    return validDeposits;
  }

  private processFile1(data: RawDepositFile1, source: string): UnifiedDeposit[] {
    const deposits: UnifiedDeposit[] = [];

    for (const [walletAddress, walletDeposits] of Object.entries(data)) {
      for (const deposit of walletDeposits) {
        if (!this.hasValidTyphoonData(deposit.typhoonData)) {
          console.log(`Skipping deposit ${deposit.depositId}: missing Typhoon data`);
          continue;
        }

        deposits.push({
          depositId: deposit.depositId,
          txHash: deposit.txHash,
          walletAddress: walletAddress,
          tokenAddress: deposit.tokenAddress,
          amount: deposit.amount,
          timestamp: deposit.timestamp,
          status: deposit.status as 'pending' | 'available' | 'withdrawn',
          typhoonData: {
            secrets: deposit.typhoonData!.secrets || [],
            nullifiers: deposit.typhoonData!.nullifiers || [],
            pools: deposit.typhoonData!.pools || [],
            note: deposit.typhoonData!.note,
            swapParams: deposit.typhoonData!.swapParams
          },
          source
        });
      }
    }

    return deposits;
  }

  private processFile2(data: RawDepositFile2, source: string): UnifiedDeposit[] {
    const deposits: UnifiedDeposit[] = [];

    for (const [walletAddress, walletDeposits] of Object.entries(data)) {
      for (const deposit of walletDeposits) {
        if (!this.hasValidTyphoonData(deposit.typhoonData)) {
          console.log(`Skipping deposit ${deposit.depositId}: missing Typhoon data`);
          continue;
        }

        deposits.push({
          depositId: deposit.depositId,
          txHash: deposit.txHash,
          walletAddress: walletAddress,
          tokenAddress: deposit.tokenAddress,
          amount: deposit.amount.toString(),
          timestamp: deposit.timestamp,
          status: deposit.status as 'pending' | 'available' | 'withdrawn',
          typhoonData: {
            secrets: deposit.typhoonData!.secrets || [],
            nullifiers: deposit.typhoonData!.nullifiers || [],
            pools: deposit.typhoonData!.pools || [],
            swapParams: deposit.typhoonData!.swapParams
          },
          source
        });
      }
    }

    return deposits;
  }

  private processFile3(data: RawDepositFile3, source: string): UnifiedDeposit[] {
    const deposits: UnifiedDeposit[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        // Handle array format (wallet address as key)
        for (const deposit of value) {
          // Check if has minimal typhoonData (even if different format)
          if (!deposit.typhoonData || typeof deposit.typhoonData !== 'object') {
            console.log(`Skipping deposit ${deposit.depositId}: missing Typhoon data`);
            continue;
          }

          deposits.push({
            depositId: deposit.depositId,
            txHash: deposit.txHash,
            walletAddress: key,
            tokenAddress: deposit.tokenAddress,
            amount: deposit.amount,
            timestamp: deposit.timestamp,
            status: deposit.status as 'pending' | 'available' | 'withdrawn',
            typhoonData: {
              secrets: [], // This format doesn't have secrets
              nullifiers: [], // This format doesn't have nullifiers
              pools: [], // This format doesn't have pools
              swapParams: deposit.typhoonData as {
                fromToken: string;
                toToken: string;
                amount: string;
                slippage: number;
                recipientAddress: string;
              }
            },
            source
          });
        }
      } else if (typeof value === 'object') {
        // Handle object format (numbered keys)
        const deposit = value;

        // Check for proper Typhoon data structure
        if (!deposit.secrets || !deposit.nullifiers || !deposit.pools) {
          console.log(`Skipping deposit ${key}: missing Typhoon data`);
          continue;
        }

        // Generate depositId if not present
        const depositId = key.includes('_') ? key : `deposit_${key}_${deposit.timestamp}`;

        deposits.push({
          depositId,
          txHash: deposit.transactionHash,
          walletAddress: deposit.walletAddress,
          tokenAddress: deposit.tokenAddress,
          amount: deposit.amount,
          timestamp: deposit.timestamp,
          status: deposit.pendingUserDeposit ? 'pending' : 'available',
          typhoonData: {
            secrets: deposit.secrets,
            nullifiers: deposit.nullifiers,
            pools: deposit.pools,
            swapParams: deposit.swapParams
          },
          source
        });
      }
    }

    return deposits;
  }

  private hasValidTyphoonData(typhoonData: unknown): boolean {
    if (!typhoonData || typeof typhoonData !== 'object') {
      return false;
    }

    const data = typhoonData as Record<string, unknown>;

    // Check if has secrets, nullifiers, and pools arrays with content
    const hasSecrets = Array.isArray(data.secrets) && data.secrets.length > 0;
    const hasNullifiers = Array.isArray(data.nullifiers) && data.nullifiers.length > 0;
    const hasPools = Array.isArray(data.pools) && data.pools.length > 0;

    return hasSecrets && hasNullifiers && hasPools;
  }

  private filterValidDeposits(deposits: UnifiedDeposit[]): UnifiedDeposit[] {
    return deposits.filter(deposit => {
      // Only process pending deposits
      if (deposit.status !== 'pending') {
        console.log(`Filtering out deposit ${deposit.depositId}: status is ${deposit.status}, not pending`);
        return false;
      }

      // Must have valid Typhoon data
      const hasValidData = this.hasValidTyphoonData(deposit.typhoonData);
      if (!hasValidData) {
        console.log(`Filtering out deposit ${deposit.depositId}: invalid Typhoon data`);
        return false;
      }

      return true;
    });
  }

  async saveUnifiedDeposits(deposits: UnifiedDeposit[]): Promise<void> {
    const outputPath = path.join(__dirname, 'unified-deposits.json');

    const output = {
      meta: {
        totalDeposits: deposits.length,
        generatedAt: new Date().toISOString(),
        sourceFiles: this.downloadsPaths.map(p => path.basename(p))
      },
      deposits
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nUnified deposits saved to: ${outputPath}`);

    // Print summary
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total valid deposits: ${deposits.length}`);

    const byStatus = deposits.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byToken = deposits.reduce((acc, d) => {
      acc[d.tokenAddress] = (acc[d.tokenAddress] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byWallet = deposits.reduce((acc, d) => {
      acc[d.walletAddress] = (acc[d.walletAddress] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`By status:`, byStatus);
    console.log(`By token:`, Object.keys(byToken).length, 'unique tokens');
    console.log(`By wallet:`, Object.keys(byWallet).length, 'unique wallets');
  }
}

// Main execution
async function main() {
  try {
    const unifier = new DepositUnifier();
    console.log('Starting deposit unification...\n');

    const unifiedDeposits = await unifier.unifyDeposits();
    await unifier.saveUnifiedDeposits(unifiedDeposits);

    console.log('\n✅ Deposit unification completed successfully!');
  } catch (error) {
    console.error('❌ Error during unification:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DepositUnifier };