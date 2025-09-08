# Typhoon SDK Issue Report - RPC 500 Internal Server Error

## 🚨 Issue Summary

When calling `sdk.generate_approve_and_deposit_calls()`, the SDK fails with a 500 Internal Server Error from the RPC endpoint `https://starknet-mainnet.public.blastapi.io/rpc/v0_8`.

## 🔍 Error Details

### Full Error Stack Trace
```
POST https://starknet-mainnet.public.blastapi.io/rpc/v0_8 500 (Internal Server Error)

Error: Ya: RPC: starknet_getClassAt with params {
  "block_id": "pending",
  "contract_address": "0x1f902d238fc1f371688b63323ca9c9eaac7a3f43eb6ef330377f60d0a9f9102"
}

-32603: Internal error: undefined
    at _a.errorHandler (typhoon-sdk.browser.esm.js?v=058b6622:16:75644)
    at _a.fetchEndpoint (typhoon-sdk.browser.esm.js?v=058b6622:16:75967)
    at async typhoon-sdk.browser.esm.js?v=058b6622:16:225445
    at async typhoon-sdk.browser.esm.js?v=058b6622:16:225408
    at async hc.generate_approve_and_deposit_calls (typhoon-sdk.browser.esm.js?v=058b6622:16:225369)
```

### RPC Call Details
- **Endpoint**: `https://starknet-mainnet.public.blastapi.io/rpc/v0_8`
- **Method**: `starknet_getClassAt`
- **Block ID**: `"pending"`
- **Contract Address**: `"0x1f902d238fc1f371688b63323ca9c9eaac7a3f43eb6ef330377f60d0a9f9102"`
- **Error Code**: `-32603` (Internal error)

## 🏗️ Environment Information

### Dependencies
```json
{
  "typhoon-sdk": "^1.0.45",
  "starknet": "^8.5.2",
  "@starknet-react/core": "^5.0.1",
  "@starknet-react/chains": "^5.0.1",
  "@starknet-io/get-starknet": "^4.0.7"
}
```

### Runtime Environment
- **Node.js**: v23.10.0
- **npm**: 10.9.2
- **Package Manager**: Yarn 4.8.1
- **Build Tool**: Vite 5.4.19
- **Browser**: Chrome/Edge (Chromium-based)
- **Network**: StarkNet Mainnet

## 💻 Code Implementation

### TyphoonService Implementation
```typescript
import { TyphoonSDK } from 'typhoon-sdk';

export class TyphoonService extends BaseDEXService {
  private sdk: TyphoonSDK;
  private isInitialized: boolean = false;

  constructor() {
    super('Typhoon', '', 10000);
    this.sdk = new TyphoonSDK();
  }

  private async initializeSDK(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Typhoon SDK...');
      // Initialize with empty arrays as per documentation
      this.sdk.init([], [], []);
      this.isInitialized = true;
      console.log('SDK initialized successfully');
    } catch (error) {
      console.error('SDK initialization failed:', error);
      throw new Error(`Typhoon SDK initialization failed: ${error}`);
    }
  }

  async generateApproveAndDepositCalls(
    amountOut: string,
    tokenOutAddr: string
  ): Promise<TyphoonDepositCall[]> {
    try {
      console.log('Amount Out (string):', amountOut);
      console.log('Token Out Address:', tokenOutAddr);
      
      // Ensure SDK is initialized
      await this.initializeSDK();
      
      // Convert to BigInt as required
      const amountBigInt = BigInt(amountOut);
      console.log('Amount Out (BigInt):', amountBigInt.toString());
      
      // This is where the error occurs
      console.log('Calling sdk.generate_approve_and_deposit_calls()...');
      const depositCalls = await this.sdk.generate_approve_and_deposit_calls(
        amountBigInt,
        tokenOutAddr
      );
      
      console.log('✅ Deposit calls generated:', depositCalls);
      return depositCalls;
    } catch (error) {
      console.error('❌ Failed to generate Typhoon deposit calls:', error);
      throw error;
    }
  }
}
```

### Usage Context
```typescript
// Called from swap execution hook
const typhoonService = new TyphoonService();

// Example values that trigger the error
const selectedQuote = {
  buyAmount: "0x1ab6845c34594a372", // 30797942756761445234n in BigInt
  buyTokenAddress: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d" // STRK token
};

const depositCalls = await typhoonService.generateApproveAndDepositCalls(
  selectedQuote.buyAmount,
  selectedQuote.buyTokenAddress
);
```

## 🔄 Reproduction Steps

1. Initialize TyphoonSDK with `new TyphoonSDK()`
2. Call `sdk.init([], [], [])`
3. Call `sdk.generate_approve_and_deposit_calls(amount, tokenAddress)` with:
   - `amount`: `30797942756761445234n` (BigInt)
   - `tokenAddress`: `"0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"` (STRK token)
4. Error occurs during internal RPC call to get contract class

## 🤔 Observations

1. **Contract Address**: The SDK is trying to query contract `0x1f902d238fc1f371688b63323ca9c9eaac7a3f43eb6ef330377f60d0a9f9102`
2. **RPC Endpoint**: Using BlastAPI's public endpoint which returns 500 errors
3. **Block ID**: Querying "pending" block which might be causing issues
4. **Token**: STRK token address appears valid and properly formatted

## ❓ Questions for the Developer

1. **RPC Configuration**: Can the SDK be configured to use a different RPC endpoint?
2. **Contract Address**: What is the contract at `0x1f902d238fc1f371688b63323ca9c9eaac7a3f43eb6ef330377f60d0a9f9102`?
3. **Block Query**: Why is the SDK querying the "pending" block instead of "latest"?
4. **Fallback**: Is there a way to handle RPC failures gracefully?
5. **Initialization**: Should the SDK be initialized with specific pools/secrets for mainnet?

## 🎯 Expected Behavior

The SDK should either:
1. Successfully generate deposit calls, or
2. Provide a way to configure alternative RPC endpoints, or  
3. Have better error handling for RPC failures

## 🔗 Additional Context

- This occurs in a React/Vite application
- Using StarkNet React for wallet connections
- AVNU integration works perfectly with same network setup
- Regular swaps work, only private swaps with Typhoon fail

---

**SDK Version**: typhoon-sdk@1.0.45  
**Reporter**: Privfi Integration Team  
**Date**: 2025-09-04