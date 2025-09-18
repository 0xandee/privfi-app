# @mistcash/react SDK - Developer Integration Guide

## Overview

The **@mistcash/react** SDK provides a React hook (`useMist`) that enables developers to integrate MIST.cash privacy protocol functionality into their React applications. MIST.cash is a privacy-focused protocol on Starknet that allows users to send and receive tokens privately using cryptographic secrets and merkle tree verification.

## Prerequisites

Before integrating @mistcash/react, ensure you have:

1. **React application** (v18+)
2. **Starknet React** properly configured (v4.0.4+)
3. **Starknet.js** (v7.6.4+)
4. **A Starknet wallet** connection setup (Argent/Braavos)

## Installation

```bash
npm install @mistcash/react @starknet-react/core starknet
# or
pnpm add @mistcash/react @starknet-react/core starknet
# or
yarn add @mistcash/react @starknet-react/core starknet
```

## Initial Setup

### Step 1: Configure Starknet React Provider

```tsx
import { StarknetConfig, publicProvider } from '@starknet-react/core';
import { sepolia, mainnet } from '@starknet-react/chains';
import { InjectedConnector } from '@starknetreact/core';

const chains = [mainnet, sepolia];
const provider = publicProvider();
const connectors = [
  new InjectedConnector({ options: { id: 'braavos' }}),
  new InjectedConnector({ options: { id: 'argentX' }}),
];

function App() {
  return (
    <StarknetConfig chains={chains} provider={provider} connectors={connectors}>
      {/* Your app components */}
    </StarknetConfig>
  );
}
```

### Step 2: Integrate useMist Hook

```tsx
import { useMist } from '@mistcash/react';
import { useProvider, useSendTransaction } from '@starknet-react/core';

function MistTransactionComponent() {
  const provider = useProvider();
  const sendTransaction = useSendTransaction({});

  const {
    // Transaction inputs
    valTo,      // Recipient address
    setTo,      // Set recipient
    valKey,     // Claiming key
    setKey,     // Set claiming key

    // Asset management
    asset,      // Current asset (amount & token address)
    setAsset,   // Manually set asset
    fetchAsset, // Fetch asset from contract

    // Contract interaction
    contract,   // Typed Chamber contract instance
    send,       // Send transaction function

    // Status indicators
    isPending,      // Transaction pending state
    loadingStatus,  // Loading state ('FINDING_TX' | 'READY')
    loadingMessage, // Human-readable loading message

    // Error handling
    error,     // Aggregated error message
    txError,   // Transaction-specific error

    // Contract address
    chamberAddress // Chamber contract address
  } = useMist(provider, sendTransaction);

  // Your component logic here
}
```

## Core Concepts

### Privacy Model
MIST.cash uses a privacy model based on:
- **Transaction Secret**: Hash(claimingKey, recipientAddress) - never stored on-chain
- **Transaction Hash**: Hash(secret, tokenAddress, amount) - stored in merkle tree
- **Merkle Tree Verification**: Proves transaction existence without revealing details

### Asset Structure
```typescript
interface Asset {
  amount: bigint;  // Token amount in smallest unit (wei for ETH)
  addr: string;    // Token contract address
}
```

## Common Integration Patterns

### 1. Basic Transaction Fetching

```tsx
function ClaimInterface() {
  const provider = useProvider();
  const sendTx = useSendTransaction({});
  const { valTo, setTo, valKey, setKey, fetchAsset, asset, loadingStatus } = useMist(provider, sendTx);

  const handleFetchTransaction = async () => {
    try {
      const fetchedAsset = await fetchAsset();
      console.log('Found transaction:', {
        token: fetchedAsset.addr,
        amount: fetchedAsset.amount.toString()
      });
    } catch (error) {
      console.error('Transaction not found');
    }
  };

  return (
    <div>
      <input
        placeholder="Recipient Address (0x...)"
        value={valTo}
        onChange={(e) => setTo(e.target.value)}
      />
      <input
        placeholder="Claiming Key"
        value={valKey}
        onChange={(e) => setKey(e.target.value)}
      />
      <button
        onClick={handleFetchTransaction}
        disabled={loadingStatus === 'FINDING_TX'}
      >
        {loadingStatus === 'FINDING_TX' ? 'Searching...' : 'Find Transaction'}
      </button>

      {asset && (
        <div>
          <p>Amount: {asset.amount.toString()}</p>
          <p>Token: {asset.addr}</p>
        </div>
      )}
    </div>
  );
}
```

### 2. Claiming Tokens (Sending Transactions)

```tsx
function ClaimTokens() {
  const provider = useProvider();
  const sendTx = useSendTransaction({});
  const { contract, send, isPending, valKey, valTo, asset, error } = useMist(provider, sendTx);

  const handleClaim = async () => {
    if (!asset) {
      alert('Please fetch transaction first');
      return;
    }

    // Prepare the claim transaction
    const claimCall = contract.populate('claim', [
      valKey,           // Claiming key
      valTo,            // Recipient address
      asset.addr,       // Token address
      asset.amount,     // Amount
      [], // Merkle proof (implementation specific)
    ]);

    // Send the transaction
    send([claimCall]);
  };

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={isPending || !asset}
      >
        {isPending ? 'Claiming...' : 'Claim Tokens'}
      </button>
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### 3. Complete Integration Example

```tsx
import { useMist } from '@mistcash/react';
import { useProvider, useSendTransaction, useAccount } from '@starknet-react/core';
import { useState, useEffect } from 'react';

function MistDashboard() {
  const { address } = useAccount();
  const provider = useProvider();
  const sendTx = useSendTransaction({});

  const {
    valTo, setTo,
    valKey, setKey,
    asset, fetchAsset,
    contract, send,
    isPending, loadingStatus,
    error, chamberAddress
  } = useMist(provider, sendTx);

  // Auto-fill recipient with connected wallet
  useEffect(() => {
    if (address && !valTo) {
      setTo(address);
    }
  }, [address, valTo, setTo]);

  const handleVerifyAndClaim = async () => {
    try {
      // Step 1: Fetch and verify transaction exists
      const txAsset = await fetchAsset();

      if (!txAsset) {
        throw new Error('Transaction not found');
      }

      // Step 2: Prepare claim transaction
      const claimTx = contract.populate('claim', [
        valKey,
        valTo,
        txAsset.addr,
        txAsset.amount,
        [] // Add merkle proof here
      ]);

      // Step 3: Execute claim
      send([claimTx]);

    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  return (
    <div>
      <h2>MIST Privacy Transaction</h2>
      <p>Chamber Contract: {chamberAddress}</p>

      <input
        type="text"
        placeholder="Claiming Key"
        value={valKey}
        onChange={(e) => setKey(e.target.value)}
      />

      <input
        type="text"
        placeholder="Recipient Address"
        value={valTo}
        onChange={(e) => setTo(e.target.value)}
      />

      <button onClick={fetchAsset} disabled={loadingStatus === 'FINDING_TX'}>
        Verify Transaction
      </button>

      {asset && (
        <div>
          <h3>Transaction Found!</h3>
          <p>Amount: {(Number(asset.amount) / 1e18).toFixed(6)} tokens</p>
          <button onClick={handleVerifyAndClaim} disabled={isPending}>
            {isPending ? 'Processing...' : 'Claim Now'}
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### 4. Development Mode Setup

For testing, enable development mode with preset values:

```tsx
// In your browser console or app initialization
localStorage.setItem('devVals', 'true');

// Now useMist will use default development values:
// - valTo: '0x021233997111a61e323Bb6948c42441a2b1a25cc0AB29BB0B719c483f7C9f469'
// - valKey: '22'
// - asset: { amount: 10000000000000000n, addr: '0x...' }
```

### 5. Advanced: Direct Contract Interaction

```tsx
function AdvancedContractInteraction() {
  const provider = useProvider();
  const sendTx = useSendTransaction({});
  const { contract, valKey, valTo } = useMist(provider, sendTx);

  const checkTransactionExists = async (tokenAddr: string, amount: string) => {
    // Use the contract directly for custom operations
    const txArray = await contract.tx_array();

    // Import crypto utilities from @mistcash/crypto
    const { txHash } = await import('@mistcash/crypto');
    const hash = await txHash(valKey, valTo, tokenAddr, amount);

    return txArray.includes(hash);
  };

  const readTransactionDetails = async () => {
    // Direct contract read
    const { txSecret } = await import('@mistcash/crypto');
    const secret = await txSecret(valKey, valTo);
    const txDetails = await contract.read_tx(secret);

    return {
      amount: txDetails.amount,
      tokenAddress: txDetails.addr
    };
  };

  // Use these functions in your component
}
```

## API Reference

### useMist Hook

```typescript
function useMist(
  provider: ProviderInterface | UseProviderResult,
  sendTx: UseSendTransactionResult
): UseMistResult
```

#### Returns: UseMistResult

| Property | Type | Description |
|----------|------|-------------|
| `chamberAddress` | `0x${string}` | Chamber contract address on mainnet |
| `loadingStatus` | `'FINDING_TX' \| 'READY'` | Current loading state |
| `loadingMessage` | `string` | Human-readable loading message |
| `valTo` | `string` | Recipient address |
| `setTo` | `(val: string) => void` | Update recipient address |
| `valKey` | `string` | Claiming key for the transaction |
| `setKey` | `(val: string) => void` | Update claiming key |
| `asset` | `Asset \| undefined` | Current transaction asset details |
| `setAsset` | `(asset: Asset \| undefined) => void` | Manually set asset |
| `contract` | `ChamberTypedContract` | Typed Chamber contract instance |
| `send` | `(args?: Call[]) => void` | Send transaction to network |
| `isPending` | `boolean` | Transaction pending state |
| `error` | `string \| null` | Aggregated error messages |
| `txError` | `Error \| null` | Transaction-specific error |
| `fetchAsset` | `() => Promise<Asset>` | Fetch asset from contract |

## Important Considerations

### 1. Transaction Limitations
- **Cannot detect spent transactions**: The contract doesn't track which transactions have been claimed
- **Implement your own tracking**: Store claimed transaction hashes in your backend/localStorage
- **Asset fetching always returns data**: Even for already claimed transactions

### 2. Security Best Practices
- **Never expose claiming keys**: Store them securely, preferably encrypted
- **Validate inputs**: Always validate recipient addresses and claiming keys
- **Handle errors gracefully**: Network issues and invalid transactions are common

### 3. Token Support
The SDK supports these tokens by default:
- ETH (18 decimals)
- STRK (18 decimals)
- USDC (6 decimals)
- USDT (6 decimals)
- DAI (18 decimals)

### 4. Network Configuration
- **Mainnet Contract**: `0x...` (CHAMBER_ADDR_MAINNET)
- **Supported Networks**: Starknet Mainnet, Sepolia Testnet

## Troubleshooting

### Common Issues

**1. "Transaction not found"**
- Verify the claiming key and recipient address are correct
- Ensure the transaction exists on-chain
- Check if transaction was already claimed

**2. "Failed hashing with garaga"**
- The WASM module for cryptographic operations failed to initialize
- Refresh the page or reinitialize the app

**3. Transaction pending indefinitely**
- Check network congestion
- Verify wallet has sufficient funds for gas
- Ensure wallet is connected to correct network

**4. Type errors with TypeScript**
```typescript
// Ensure proper typing
import type { Asset } from '@mistcash/sdk';
import type { UseMistResult } from '@mistcash/react';

const mistHook: UseMistResult = useMist(provider, sendTx);
```

## Example: Production-Ready Component

```tsx
import { useMist } from '@mistcash/react';
import { useProvider, useSendTransaction } from '@starknet-react/core';
import { useState } from 'react';

export function MistClaimWidget() {
  const provider = useProvider();
  const sendTx = useSendTransaction({});
  const [claimedTxs, setClaimedTxs] = useState<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('claimedTxs') || '[]'))
  );

  const mist = useMist(provider, sendTx);

  const handleClaim = async () => {
    const txId = `${mist.valKey}-${mist.valTo}`;

    if (claimedTxs.has(txId)) {
      alert('Transaction already claimed!');
      return;
    }

    try {
      const asset = await mist.fetchAsset();

      // Prepare and send claim transaction
      const claimCall = mist.contract.populate('claim', [
        mist.valKey,
        mist.valTo,
        asset.addr,
        asset.amount,
        []
      ]);

      mist.send([claimCall]);

      // Mark as claimed
      const newClaimed = new Set(claimedTxs).add(txId);
      setClaimedTxs(newClaimed);
      localStorage.setItem('claimedTxs', JSON.stringify([...newClaimed]));

    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  return (
    <div className="mist-claim-widget">
      {/* Your UI here */}
    </div>
  );
}
```

This comprehensive guide should help developers quickly integrate the @mistcash/react SDK into their applications, enabling privacy-preserving token transfers on Starknet.