# Deposit Migration Scripts

Standalone scripts to unify and withdraw Typhoon deposits from multiple JSON export files.

## Overview

These scripts will:
1. **Unify** deposits from 3 different JSON formats into a consistent structure
2. **Filter** for valid deposits (pending status + complete Typhoon data)
3. **Execute** individual withdrawals using the Typhoon SDK
4. **Track** results and provide detailed reporting

## Prerequisites

- Node.js 18+
- npm or yarn
- Access to the 3 deposit JSON files in Downloads folder:
  - `deposits (2).json`
  - `deposits (1).json`
  - `deposits.json`

## ⚠️ IMPORTANT: Typhoon SDK Issue

**Current Status**: The `typhoon-sdk` package has module compatibility issues (CJS/ESM conflicts) that prevent it from loading properly in Node.js environments.

**Error**: `ReferenceError: require is not defined` when attempting to load the SDK.

**Immediate Solutions**:
1. **For Testing**: Use the mock SDK by uncommenting the import in `withdraw.ts`
2. **For Production**: Contact typhoon-sdk maintainers about the module issue
3. **Alternative**: Wait for a fixed version of typhoon-sdk

**How to Enable Mock for Testing**:
1. Open `withdraw.ts`
2. Comment out line 9: `// const typhoonModule = require('typhoon-sdk');`
3. Add: `const { TyphoonSDK } = require('./mock-typhoon-sdk');`
4. Test withdrawals safely with simulated success/failure

## Quick Start

```bash
# Navigate to the scripts folder
cd scripts/deposit-migration

# Install dependencies
npm install

# Run complete process
./run.sh

# Or run step by step
npm run unify        # Step 1: Unify deposits
npm run withdraw     # Step 2: Execute withdrawals
```

## Commands

### Unification
```bash
npm run unify
```
- Parses all 3 deposit JSON files
- Unifies into consistent format
- Filters for valid pending deposits only
- Saves to `unified-deposits.json`

### Withdrawals
```bash
npm run withdraw           # Execute real withdrawals
npm run withdraw:dry-run   # Simulate without executing
```
- Loads unified deposits
- Initializes Typhoon SDK for each deposit
- Executes individual withdrawals
- Saves results to `withdrawal-results.json`

### Complete Process
```bash
./run.sh                    # Run everything
./run.sh --step unify       # Only unify
./run.sh --step withdraw    # Only withdraw
./run.sh --dry-run         # Simulate entire process
./run.sh --help           # Show help
```

## File Structure

```
scripts/deposit-migration/
├── types.ts              # TypeScript type definitions
├── unify-deposits.ts     # Deposit unification logic
├── withdraw.ts           # Withdrawal execution logic
├── run.sh               # Main runner script
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── README.md           # This file
├── unified-deposits.json      # Generated: unified deposits
└── withdrawal-results.json    # Generated: withdrawal results
```

## Data Processing

### Input Formats
The script handles 3 different deposit JSON formats:
- **Format 1** (`deposits (2).json`): Wallet-grouped with full Typhoon data
- **Format 2** (`deposits (1).json`): Wallet-grouped with standard structure
- **Format 3** (`deposits.json`): Mixed numeric/wallet keys with varied structures

### Unified Format
All deposits are converted to:
```typescript
{
  depositId: string
  txHash: string
  walletAddress: string
  tokenAddress: string
  amount: string
  timestamp: number
  status: 'pending' | 'available' | 'withdrawn'
  typhoonData: {
    secrets: string[]
    nullifiers: string[]
    pools: string[]
    note?: string
    swapParams?: {...}
  }
  source: string  // Which file it came from
}
```

### Filtering Rules
Only processes deposits that:
- Have `status: 'pending'`
- Have valid Typhoon data (non-empty secrets, nullifiers, pools arrays)
- Have complete transaction information

## Withdrawal Process

Each withdrawal:
1. Initializes Typhoon SDK with deposit-specific secrets/nullifiers/pools
2. Formats transaction hash for BigInt compatibility
3. Generates withdrawal calldata for validation
4. Executes withdrawal to original wallet address
5. Records success/failure with detailed error messages

## Safety Features

- **Dry run mode**: Simulate without executing transactions
- **Individual processing**: Each deposit processed separately
- **Error isolation**: Failed deposits don't stop the process
- **Comprehensive logging**: Detailed progress and error reporting
- **Result tracking**: Complete audit trail in JSON format
- **Rate limiting**: 2-second delay between withdrawals

## Output Files

### unified-deposits.json
```json
{
  "meta": {
    "totalDeposits": 15,
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "sourceFiles": ["deposits (2).json", "deposits (1).json", "deposits.json"]
  },
  "deposits": [...]
}
```

### withdrawal-results.json
```json
{
  "meta": {
    "totalProcessed": 15,
    "successful": 12,
    "failed": 3,
    "generatedAt": "2024-01-15T11:00:00.000Z"
  },
  "results": [
    {
      "depositId": "deposit_123",
      "success": true,
      "transactionHash": "0x...",
      "timestamp": 1705312800000
    },
    {
      "depositId": "deposit_456",
      "success": false,
      "error": "Invalid nullifier data",
      "timestamp": 1705312800000
    }
  ]
}
```

## Error Handling

Common errors and solutions:

### "Missing Typhoon data"
- Deposit doesn't have required secrets/nullifiers/pools
- These deposits are skipped automatically

### "SDK initialization failed"
- Invalid or corrupted Typhoon data
- Check deposit data quality in source files

### "Transaction hash format error"
- Usually auto-corrected by adding 0x prefix
- Manual verification may be needed

### "Network/gas issues"
- Ensure sufficient network connectivity
- Check wallet has enough gas fees
- Retry individual failed deposits

## Recovery

If withdrawals fail:
1. Check `withdrawal-results.json` for specific errors
2. Fix underlying issues (network, gas, data)
3. Re-run with only failed deposits
4. Use dry-run mode to test fixes

## Security Notes

- Scripts run locally with your private keys
- No data is sent to external services
- All Typhoon operations use official SDK
- Transaction data is only used for withdrawal proof generation

## Troubleshooting

### Dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### TypeScript compilation
```bash
# Build manually
npm run build
```

### Permission issues
```bash
# Fix script permissions
chmod +x run.sh
```

### Source file issues
Ensure all 3 deposit files are in the Downloads folder with exact names:
- `/Users/0xandee/Downloads/deposits (2).json`
- `/Users/0xandee/Downloads/deposits (1).json`
- `/Users/0xandee/Downloads/deposits.json`