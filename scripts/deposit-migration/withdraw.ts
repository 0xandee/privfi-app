import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { UnifiedDeposit, WithdrawalResult } from './types.js';
import { TyphoonSDK } from 'typhoon-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WithdrawalExecutor {
  private sdk: TyphoonSDK;
  private results: WithdrawalResult[] = [];

  constructor() {
    this.sdk = new TyphoonSDK();
    console.log('  ✅ Typhoon SDK initialized');
  }

  async loadDeposits(): Promise<UnifiedDeposit[]> {
    const depositsPath = path.join(__dirname, 'unified-deposits.json');

    if (!fs.existsSync(depositsPath)) {
      throw new Error('unified-deposits.json not found. Run unify-deposits.ts first.');
    }

    const data = JSON.parse(fs.readFileSync(depositsPath, 'utf8'));
    return data.deposits || [];
  }

  async withdrawAll(): Promise<WithdrawalResult[]> {
    const deposits = await this.loadDeposits();

    console.log(`\n🚀 Starting withdrawal process for ${deposits.length} deposits...\n`);

    for (let i = 0; i < deposits.length; i++) {
      const deposit = deposits[i];
      console.log(`\n[${i + 1}/${deposits.length}] Processing deposit: ${deposit.depositId}`);
      console.log(`  - Wallet: ${deposit.walletAddress}`);
      console.log(`  - Token: ${deposit.tokenAddress}`);
      console.log(`  - Amount: ${deposit.amount}`);
      console.log(`  - TxHash: ${deposit.txHash}`);

      try {
        await this.withdrawSingleDeposit(deposit);
      } catch (error) {
        console.error(`  ❌ Failed:`, error instanceof Error ? error.message : error);
        this.results.push({
          depositId: deposit.depositId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });
      }

      // Add delay between withdrawals to avoid rate limiting
      if (i < deposits.length - 1) {
        console.log(`  ⏳ Waiting 2 seconds before next withdrawal...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return this.results;
  }

  private async withdrawSingleDeposit(deposit: UnifiedDeposit): Promise<void> {
    try {
      console.log(`  🔄 Initializing SDK for deposit...`);

      // Initialize SDK with deposit-specific data
      this.sdk.init(
        deposit.typhoonData.secrets,
        deposit.typhoonData.nullifiers,
        deposit.typhoonData.pools
      );

      // Check if we have a valid transaction hash (should be hex format)
      let txHashToUse: string;

      if (deposit.txHash.startsWith('0x') && deposit.txHash.length > 10) {
        // This looks like a real transaction hash
        txHashToUse = deposit.txHash;
      } else if (deposit.typhoonData.note) {
        // Use the note field which contains proper Typhoon commitment data
        // The note format is: typhoon-{pool}-{secret}-{nullifier}
        // For withdrawal, we can use the secret as a pseudo-transaction hash
        const noteParts = deposit.typhoonData.note.split('-');
        if (noteParts.length >= 3) {
          // Use the secret (3rd part) as transaction identifier
          const secret = noteParts[2];
          txHashToUse = `0x${secret}`;
        } else {
          // Fallback: use the first secret as hex
          txHashToUse = `0x${deposit.typhoonData.secrets[0]}`;
        }
      } else {
        // Last resort: use the first secret as transaction identifier
        txHashToUse = `0x${deposit.typhoonData.secrets[0]}`;
      }

      console.log(`  📋 Getting withdrawal calldata with identifier: ${txHashToUse.slice(0, 20)}...`);

      // Get withdrawal calldata first to validate
      await this.sdk.get_withdraw_calldata(
        txHashToUse,
        [deposit.walletAddress] // Withdraw to original wallet
      );

      console.log(`  ✨ Executing withdrawal...`);

      // Execute withdrawal
      await this.sdk.withdraw(
        txHashToUse,
        [deposit.walletAddress] // Withdraw to original wallet
      );

      console.log(`  ✅ Withdrawal successful!`);

      this.results.push({
        depositId: deposit.depositId,
        success: true,
        transactionHash: txHashToUse,
        timestamp: Date.now()
      });

    } catch (error) {
      throw new Error(`Withdrawal failed for deposit ${deposit.depositId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveResults(): Promise<void> {
    const resultsPath = path.join(__dirname, 'withdrawal-results.json');

    const output = {
      meta: {
        totalProcessed: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        generatedAt: new Date().toISOString()
      },
      results: this.results
    };

    fs.writeFileSync(resultsPath, JSON.stringify(output, null, 2));
    console.log(`\n📊 Results saved to: ${resultsPath}`);

    // Print summary
    console.log(`\n=== WITHDRAWAL SUMMARY ===`);
    console.log(`Total processed: ${this.results.length}`);
    console.log(`✅ Successful: ${output.meta.successful}`);
    console.log(`❌ Failed: ${output.meta.failed}`);

    if (output.meta.failed > 0) {
      console.log(`\n💡 Failed withdrawals:`);
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.depositId}: ${r.error}`);
        });
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🌪️  Typhoon Withdrawal Script

Usage:
  npm run withdraw              # Execute all withdrawals
  npm run withdraw --dry-run    # Simulate withdrawals (don't execute)
  npm run withdraw --help       # Show this help

This script will:
1. Load unified deposits from unified-deposits.json
2. Initialize Typhoon SDK for each deposit
3. Execute individual withdrawals
4. Save results to withdrawal-results.json

⚠️  Make sure you have:
- Run unify-deposits.ts first to create unified-deposits.json
- Proper network connection
- Sufficient gas fees available
    `);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');

  try {
    const executor = new WithdrawalExecutor();

    if (dryRun) {
      console.log('🧪 DRY RUN MODE - No actual withdrawals will be executed\n');
      const deposits = await executor.loadDeposits();

      console.log(`Would process ${deposits.length} deposits:\n`);
      deposits.forEach((deposit, i) => {
        console.log(`[${i + 1}] ${deposit.depositId}`);
        console.log(`    Wallet: ${deposit.walletAddress}`);
        console.log(`    Token: ${deposit.tokenAddress}`);
        console.log(`    Amount: ${deposit.amount}`);
        console.log(`    TxHash: ${deposit.txHash}`);
        console.log('');
      });

      console.log('🧪 Dry run completed. Use "npm run withdraw" to execute actual withdrawals.');
    } else {
      console.log('🚀 LIVE MODE - Actual withdrawals will be executed');
      console.log('⚠️  Make sure you want to proceed!\n');

      // Add 5-second delay for user to cancel if needed
      for (let i = 5; i > 0; i--) {
        process.stdout.write(`\rStarting in ${i} seconds... (Ctrl+C to cancel)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('\n');

      const results = await executor.withdrawAll();
      await executor.saveResults();

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed === 0) {
        console.log('\n🎉 All withdrawals completed successfully!');
      } else {
        console.log(`\n⚠️  ${successful} successful, ${failed} failed. Check withdrawal-results.json for details.`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { WithdrawalExecutor };