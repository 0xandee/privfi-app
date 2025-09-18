# @mistcash/sdk - Comprehensive Developer Integration Guide

## Overview

**@mistcash/sdk** is the core TypeScript SDK for integrating with the MIST.cash privacy protocol on Starknet. It provides developers with all the necessary utilities, cryptographic functions, and contract interactions to build privacy-preserving applications that can send and receive tokens anonymously.

The SDK is built on a zero-knowledge privacy model using:
- **BN254 Poseidon Hashing** via the Garaga library
- **Merkle Tree Verification** for transaction proofs
- **Secret Generation** from claiming keys and recipients
- **Typed Contract Interfaces** for type-safe interactions

## Architecture

The SDK consists of three main packages:
- **@mistcash/sdk** - Core utilities and contract interactions
- **@mistcash/crypto** - Cryptographic operations (Poseidon hashing)
- **@mistcash/config** - Contract ABIs, addresses, and token configurations

## Installation

```bash
npm install @mistcash/sdk
# or
pnpm add @mistcash/sdk
# or
yarn add @mistcash/sdk
```

### Peer Dependencies

```bash
npm install starknet@^7.6.4
```

## Quick Start

```typescript
import { getChamber, fetchTxAssets, type Asset } from '@mistcash/sdk';
import { RpcProvider } from 'starknet';

// Initialize Starknet provider
const provider = new RpcProvider({
  nodeUrl: 'https://starknet-mainnet.public.blastapi.io'
});

// Get typed Chamber contract instance
const contract = getChamber(provider);

// Fetch transaction assets
const claiming_key = "22";
const recipient = "0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469";

try {
  const asset = await fetchTxAssets(contract, claiming_key, recipient);
  console.log(`Found: ${asset.amount} of token ${asset.addr}`);
} catch (error) {
  console.error('Transaction not found');
}
```

## Core Concepts

### Privacy Model

MIST.cash implements privacy through a multi-layered cryptographic approach:

1. **Transaction Secret**: `Hash(claiming_key, recipient_address)`
   - Never stored on-chain
   - Used to derive all transaction-related hashes
   - Known only to sender and recipient

2. **Transaction Hash**: `Hash(Hash(transaction_secret, token_address), amount)`
   - Stored in the contract's merkle tree
   - Used to verify transaction existence
   - Cannot be linked to real-world identities

3. **Merkle Tree**: Stores all transaction hashes
   - Enables zero-knowledge proofs
   - Allows verification without revealing details

### Asset Structure

```typescript
interface Asset {
  amount: bigint;  // Token amount in smallest unit (wei for ETH)
  addr: string;    // Token contract address as hex string
}
```

## API Reference

### Contract Utilities

#### `getChamber(provider)`

Creates a typed Chamber contract instance for interactions.

```typescript
import { getChamber } from '@mistcash/sdk';
import { RpcProvider, AccountInterface } from 'starknet';

function getChamber(
  provider?: ProviderInterface | AccountInterface
): ChamberTypedContract

// Usage
const provider = new RpcProvider({ nodeUrl: 'https://...' });
const contract = getChamber(provider);

// The contract provides full type safety
const txArray = await contract.tx_array();           // Returns bigint[]
const merkleRoot = await contract.merkle_root();     // Returns bigint
const txData = await contract.read_tx(txHash);       // Returns Asset
```

#### `fetchTxAssets(contract, claimingKey, recipient)`

Fetches transaction assets from the chamber contract using claiming key and recipient.

```typescript
import { fetchTxAssets, getChamber } from '@mistcash/sdk';

async function fetchTxAssets(
  contract: ChamberTypedContract,
  valKey: string,
  valTo: string
): Promise<Asset>

// Usage
const contract = getChamber(provider);
const asset = await fetchTxAssets(contract, "22", "0x...");

console.log({
  amount: asset.amount,        // 10000000000000000n (0.01 ETH)
  tokenAddress: asset.addr     // "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
});
```

**Important Notes:**
- ⚠️ **Returns assets even if transaction is spent**
- ⚠️ **Contract cannot detect spent transactions**
- You must implement your own spent transaction tracking

#### `checkTxExists(contract, claimingKey, recipient, tokenAddr, amount)`

Verifies if a specific transaction exists in the contract's merkle tree.

```typescript
import { checkTxExists } from '@mistcash/sdk';

async function checkTxExists(
  contract: ChamberTypedContract,
  valKey: string,
  valTo: string,
  tokenAddr: string,
  amount: string
): Promise<boolean>

// Usage
const exists = await checkTxExists(
  contract,
  "22",                    // Claiming key
  "0x...",                 // Recipient address
  "0x049d36570...",        // ETH token address
  "10000000000000000"      // Amount in wei
);

if (exists) {
  console.log('Transaction verified on merkle tree');
} else {
  console.log('Transaction not found');
}
```

#### `getTxIndexInTree(leaves, claimingKey, recipient, tokenAddr, amount)`

Returns the index of a transaction in the merkle tree leaves array.

```typescript
import { getTxIndexInTree } from '@mistcash/sdk';

async function getTxIndexInTree(
  leaves: bigint[],
  valKey: string,
  valTo: string,
  tokenAddr: string,
  amount: string
): Promise<number>

// Usage
const contract = getChamber(provider);
const txArray = await contract.tx_array();

const index = await getTxIndexInTree(
  txArray,
  "22",
  "0x...",
  "0x049d36570...",
  "10000000000000000"
);

console.log(index); // Returns -1 if not found, or the index position
```

### Cryptographic Functions

#### `hash(a, b)`

Performs BN254 Poseidon hash of two bigint values using the Garaga library.

```typescript
import { hash } from '@mistcash/crypto';

async function hash(a: bigint, b: bigint): Promise<bigint>

// Usage
const result = await hash(BigInt("123"), BigInt("456"));
console.log(result); // Returns: 12345678901234567890n (example)

// The function automatically handles Garaga WASM initialization
// and provides fallback error handling
```

#### `txSecret(claimingKey, recipient)`

Generates the transaction secret from claiming key and recipient address.

```typescript
import { txSecret } from '@mistcash/crypto';

async function txSecret(key: string, to: string): Promise<bigint>

// Usage
const secret = await txSecret("22", "0x021233997...");
console.log(secret); // Returns: bigint representation of hash

// This secret is never stored on-chain and is the foundation
// of the privacy model
```

#### `txHash(claimingKey, recipient, tokenAddr, amount)`

Generates the full transaction hash that gets stored in the merkle tree.

```typescript
import { txHash } from '@mistcash/crypto';

async function txHash(
  valKey: string,
  valTo: string,
  tokenAddr: string,
  amount: string
): Promise<bigint>

// Usage
const hash = await txHash(
  "22",                          // Claiming key
  "0x021233997...",             // Recipient
  "0x049d36570...",             // ETH token address
  "10000000000000000"           // Amount in wei
);

// This hash is what gets stored in the contract's merkle tree
console.log(hash); // Returns: bigint hash value
```

### Development Utilities

#### `devVal(value, default)`

Development utility that returns different values based on localStorage flag.

```typescript
import { devVal } from '@mistcash/sdk';

function devVal<T>(val: T, deflt: T | undefined = undefined): T | undefined

// Usage
const testAmount = devVal(BigInt('10000000000000000'), undefined);

// If localStorage has 'devVals' key set:
//   Returns: 10000000000000000n
// If no 'devVals' in localStorage:
//   Returns: undefined
```

#### `devStr(value)`

Shortcut for `devVal` specifically for strings, with empty string as default.

```typescript
import { devStr } from '@mistcash/sdk';

function devStr(val: string): string

// Usage
const testRecipient = devStr('0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469');

// Enable development mode in browser console:
localStorage.setItem('devVals', 'true');

console.log(testRecipient); // Returns the test address
```

### Configuration and Constants

#### Contract Addresses

```typescript
import { CHAMBER_ADDR_MAINNET } from '@mistcash/config';

// Mainnet Chamber Contract
const CHAMBER_ADDR_MAINNET = '0x063eab2f19523fc8578c66a3ddf248d72094c65154b6dd7680b6e05a64845277';
```

#### Supported Tokens

```typescript
import { tokensData, tokensMap } from '@mistcash/config';

// Array of all supported tokens
const tokens = tokensData;
/*
[
  {
    id: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    name: 'ETH',
    decimals: 18,
    color: '#5f7edd',
    textColor: 'white',
    icon: '<svg>...</svg>'
  },
  // ... STRK, USDC, USDT, DAI
]
*/

// Map for quick lookups
const ethToken = tokensMap['0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'];
console.log(ethToken.name); // 'ETH'
```

#### Contract ABIs

```typescript
import { CHAMBER_ABI, ERC20_ABI } from '@mistcash/config';

// Use ABIs for contract interactions
const chamberContract = new Contract(CHAMBER_ABI, CHAMBER_ADDR_MAINNET, provider);
const tokenContract = new Contract(ERC20_ABI, tokenAddress, provider);
```

## Integration Examples

### 1. Basic Transaction Verification

```typescript
import { getChamber, fetchTxAssets, checkTxExists } from '@mistcash/sdk';
import { RpcProvider } from 'starknet';

async function verifyTransaction() {
  const provider = new RpcProvider({
    nodeUrl: 'https://starknet-mainnet.public.blastapi.io'
  });

  const contract = getChamber(provider);
  const claimingKey = "22";
  const recipient = "0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469";

  try {
    // Step 1: Fetch transaction details
    const asset = await fetchTxAssets(contract, claimingKey, recipient);
    console.log('Transaction found:', {
      amount: asset.amount.toString(),
      token: asset.addr
    });

    // Step 2: Verify it exists in merkle tree
    const exists = await checkTxExists(
      contract,
      claimingKey,
      recipient,
      asset.addr,
      asset.amount.toString()
    );

    console.log('Verified on merkle tree:', exists);

  } catch (error) {
    console.error('Transaction verification failed:', error);
  }
}
```

### 2. Deposit Transaction (Sending Funds)

```typescript
import { getChamber, txHash } from '@mistcash/sdk';
import { Account, RpcProvider } from 'starknet';

async function depositTokens() {
  const provider = new RpcProvider({ nodeUrl: 'https://...' });
  const account = new Account(provider, accountAddress, privateKey);

  const contract = getChamber(account);

  // Transaction parameters
  const claimingKey = "22";
  const recipient = "0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469";
  const tokenAddress = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; // ETH
  const amount = "10000000000000000"; // 0.01 ETH

  try {
    // Generate transaction hash for merkle tree
    const hash = await txHash(claimingKey, recipient, tokenAddress, amount);

    // Prepare deposit transaction
    const depositCall = contract.populate('deposit', [
      hash,
      {
        amount: BigInt(amount),
        addr: tokenAddress
      }
    ]);

    // Execute transaction
    const result = await account.execute([depositCall]);
    console.log('Deposit transaction:', result.transaction_hash);

  } catch (error) {
    console.error('Deposit failed:', error);
  }
}
```

### 3. Withdrawal Transaction (Claiming Funds)

```typescript
import { getChamber, fetchTxAssets } from '@mistcash/sdk';
import { Account } from 'starknet';

async function withdrawTokens() {
  const account = new Account(provider, accountAddress, privateKey);
  const contract = getChamber(account);

  const claimingKey = "22";
  const recipient = "0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469";

  try {
    // Fetch transaction to be claimed
    const asset = await fetchTxAssets(contract, claimingKey, recipient);

    // Prepare withdrawal transaction (without ZK proof for testing)
    const withdrawCall = contract.populate('withdraw_no_zk', [
      BigInt(claimingKey),
      recipient,
      {
        amount: asset.amount,
        addr: asset.addr
      },
      [] // Merkle proof array - implement proof generation
    ]);

    // Execute withdrawal
    const result = await account.execute([withdrawCall]);
    console.log('Withdrawal transaction:', result.transaction_hash);

  } catch (error) {
    console.error('Withdrawal failed:', error);
  }
}
```

### 4. Privacy-Preserving Wallet Integration

```typescript
import { getChamber, fetchTxAssets, checkTxExists, txHash } from '@mistcash/sdk';
import { tokensMap } from '@mistcash/config';

class MistWallet {
  private contract;
  private claimedTransactions = new Set<string>();

  constructor(provider) {
    this.contract = getChamber(provider);
  }

  // Check for incoming transactions
  async checkIncomingTransactions(claimingKey: string, recipient: string) {
    try {
      const asset = await fetchTxAssets(this.contract, claimingKey, recipient);
      const txId = `${claimingKey}-${recipient}`;

      if (this.claimedTransactions.has(txId)) {
        console.log('Transaction already claimed');
        return null;
      }

      const token = tokensMap[asset.addr];
      const displayAmount = Number(asset.amount) / Math.pow(10, token?.decimals || 18);

      return {
        amount: displayAmount,
        token: token?.name || 'Unknown',
        rawAmount: asset.amount,
        tokenAddress: asset.addr
      };

    } catch (error) {
      return null; // No transaction found
    }
  }

  // Generate transaction hash for sending
  async generateTxHash(claimingKey: string, recipient: string, tokenAddr: string, amount: string) {
    return await txHash(claimingKey, recipient, tokenAddr, amount);
  }

  // Mark transaction as claimed
  markAsClaimed(claimingKey: string, recipient: string) {
    this.claimedTransactions.add(`${claimingKey}-${recipient}`);
  }

  // Batch check multiple transactions
  async batchCheckTransactions(transactions: Array<{key: string, recipient: string}>) {
    const results = await Promise.allSettled(
      transactions.map(tx => this.checkIncomingTransactions(tx.key, tx.recipient))
    );

    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }
}

// Usage
const wallet = new MistWallet(provider);
const incoming = await wallet.checkIncomingTransactions("22", "0x...");
if (incoming) {
  console.log(`Received ${incoming.amount} ${incoming.token}`);
}
```

### 5. Advanced: Contract Event Monitoring

```typescript
import { getChamber } from '@mistcash/sdk';
import { RpcProvider } from 'starknet';

async function monitorDeposits() {
  const provider = new RpcProvider({ nodeUrl: 'https://...' });
  const contract = getChamber(provider);

  // Monitor merkle tree updates to detect new deposits
  let lastKnownTxCount = 0;

  setInterval(async () => {
    try {
      const txArray = await contract.tx_array();

      if (txArray.length > lastKnownTxCount) {
        console.log(`New deposits detected: ${txArray.length - lastKnownTxCount}`);

        // Process new transactions
        const newTxHashes = txArray.slice(lastKnownTxCount);
        newTxHashes.forEach((hash, index) => {
          console.log(`New transaction hash: ${hash}`);
        });

        lastKnownTxCount = txArray.length;
      }

    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }, 30000); // Check every 30 seconds
}
```

## Development and Testing

### Enable Development Mode

```typescript
// In browser console or initialization code
localStorage.setItem('devVals', 'true');

// Now development utilities will return test values
import { devStr, devVal } from '@mistcash/sdk';

const testRecipient = devStr('0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469');
const testAsset = devVal({
  amount: BigInt('10000000000000000'),
  addr: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
});
```

### Testing Utilities

```typescript
import { getChamber, fetchTxAssets, checkTxExists, txHash } from '@mistcash/sdk';

// Test transaction existence
async function testTransaction() {
  const contract = getChamber(provider);
  const key = "22";
  const recipient = "0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469";
  const tokenAddr = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
  const amount = "10000000000000000";

  // Test hash generation
  const hash = await txHash(key, recipient, tokenAddr, amount);
  console.log('Generated hash:', hash);

  // Test existence check
  const exists = await checkTxExists(contract, key, recipient, tokenAddr, amount);
  console.log('Transaction exists:', exists);

  // Test asset fetching
  try {
    const asset = await fetchTxAssets(contract, key, recipient);
    console.log('Fetched asset:', asset);
  } catch (error) {
    console.log('No asset found');
  }
}
```

## Security Considerations

### 1. Claiming Key Security
- **Never log claiming keys** in production
- **Store claiming keys securely** (encrypted storage)
- **Use hardware wallets** when possible for key derivation

### 2. Transaction Privacy
- **Don't reuse claiming keys** across multiple transactions
- **Use different recipients** for each transaction when possible
- **Implement proper key rotation** for long-term privacy

### 3. Error Handling
```typescript
import { fetchTxAssets } from '@mistcash/sdk';

async function secureTransactionFetch(claimingKey: string, recipient: string) {
  try {
    const asset = await fetchTxAssets(contract, claimingKey, recipient);
    return { success: true, asset };
  } catch (error) {
    // Don't log sensitive data
    console.error('Transaction fetch failed');
    return { success: false, error: 'Transaction not found' };
  }
}
```

### 4. Input Validation
```typescript
function validateInputs(claimingKey: string, recipient: string): boolean {
  // Validate claiming key format
  if (!claimingKey || !/^[0-9]+$/.test(claimingKey)) {
    throw new Error('Invalid claiming key format');
  }

  // Validate recipient address
  if (!recipient || !recipient.startsWith('0x') || recipient.length !== 66) {
    throw new Error('Invalid recipient address format');
  }

  return true;
}
```

## Troubleshooting

### Common Issues

**1. "Failed hashing with garaga"**
```typescript
// The Garaga WASM module failed to initialize
// Solution: Refresh the page or reinitialize
try {
  const result = await hash(a, b);
} catch (error) {
  console.error('Hash function failed - try refreshing the page');
  // The hash function includes automatic retry with initialization
}
```

**2. "Transaction not found" (but you know it exists)**
```typescript
// Possible causes:
// - Incorrect claiming key
// - Incorrect recipient address
// - Transaction hasn't been mined yet
// - Transaction was sent to a different recipient

// Debug approach:
console.log('Claiming key:', claimingKey);
console.log('Recipient:', recipient);

// Generate expected hash and check merkle tree manually
const expectedHash = await txHash(claimingKey, recipient, tokenAddr, amount);
const txArray = await contract.tx_array();
const exists = txArray.includes(expectedHash);
console.log('Hash exists in merkle tree:', exists);
```

**3. Type errors with BigInt**
```typescript
// Ensure proper BigInt handling
const amount = BigInt('10000000000000000'); // Correct
// const amount = 10000000000000000;        // May cause precision issues

// When working with contract responses
const asset = await fetchTxAssets(contract, key, recipient);
console.log(typeof asset.amount); // 'bigint'

// For display purposes
const displayAmount = Number(asset.amount) / 1e18; // Convert to ETH
```

**4. Provider connection issues**
```typescript
// Ensure provider is properly configured
const provider = new RpcProvider({
  nodeUrl: 'https://starknet-mainnet.public.blastapi.io',
  // Add other configuration as needed
});

// Test provider connection
try {
  const chainId = await provider.getChainId();
  console.log('Connected to chain:', chainId);
} catch (error) {
  console.error('Provider connection failed:', error);
}
```

## Performance Optimization

### Batch Operations

```typescript
// Instead of individual calls
const results = await Promise.all([
  fetchTxAssets(contract, key1, recipient1),
  fetchTxAssets(contract, key2, recipient2),
  fetchTxAssets(contract, key3, recipient3)
]);

// Use concurrent hash generation
const hashes = await Promise.all([
  txHash(key1, recipient1, tokenAddr, amount1),
  txHash(key2, recipient2, tokenAddr, amount2),
  txHash(key3, recipient3, tokenAddr, amount3)
]);
```

### Caching Strategy

```typescript
class CachedMistClient {
  private cache = new Map<string, Asset>();
  private contract;

  constructor(provider) {
    this.contract = getChamber(provider);
  }

  async fetchTxAssets(claimingKey: string, recipient: string): Promise<Asset> {
    const cacheKey = `${claimingKey}-${recipient}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const asset = await fetchTxAssets(this.contract, claimingKey, recipient);
    this.cache.set(cacheKey, asset);
    return asset;
  }
}
```

This comprehensive guide provides developers with everything they need to integrate the @mistcash/sdk into their applications, enabling privacy-preserving token transfers on Starknet with full understanding of the underlying cryptographic principles and practical implementation details.