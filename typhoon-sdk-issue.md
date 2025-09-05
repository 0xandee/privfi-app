# Typhoon SDK Withdrawal Issue - Code Share

## Issue Summary
Getting errors when calling the Typhoon SDK withdraw function. The transaction validation passes but the SDK withdraw call itself fails.

## Environment
- **Typhoon SDK Version**: `1.0.45`
- **Platform**: React/TypeScript application
- **Network**: StarkNet

## Error Details
```
Withdraw failed: Error: Invalid transaction hash format
    at executeWithdraw (withdrawStore.ts:104:19)
```

## Sample Data
- **Transaction Hash**: `0x5d4838301fe67e8229f4b7d01780b11a51634d9c873514e62bd10f654f515ed`
- **Recipient Address**: `0x123...` (example StarkNet address)

## Code Implementation

### 1. TyphoonService Class (Main SDK Integration)

```typescript
// src/features/swap/services/typhoon.ts
import { TyphoonSDK } from 'typhoon-sdk';

export class TyphoonService extends BaseDEXService {
  private sdk: TyphoonSDK;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    super('Typhoon', '', 10000);
    this.sdk = new TyphoonSDK();
  }

  private async initializeSDK(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
      
      if (isDev) {
        console.log('Initializing Typhoon SDK in development mode...');
      }

      // Initialize the SDK with empty arrays for now
      this.sdk.init([], [], []);
      this.isInitialized = true;
      
      if (isDev) {
        console.log('Typhoon SDK initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Typhoon SDK:', error);
      throw new Error(`Typhoon SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw funds after private swap completion
   * THIS IS WHERE THE ERROR OCCURS - NOW WITH DEBUG LOGGING
   */
  async withdraw(withdrawRequest: TyphoonWithdrawRequest): Promise<void> {
    try {
      // Debug logging for withdraw request
      console.group('🔍 Typhoon Withdraw Debug Info');
      console.log('Transaction Hash:', withdrawRequest.transactionHash);
      console.log('Transaction Hash Length:', withdrawRequest.transactionHash.length);
      console.log('Transaction Hash (without 0x):', withdrawRequest.transactionHash.slice(2));
      console.log('Recipient Addresses:', withdrawRequest.recipientAddresses);
      console.log('Number of Recipients:', withdrawRequest.recipientAddresses.length);
      
      // Log each recipient for validation
      withdrawRequest.recipientAddresses.forEach((address, index) => {
        console.log(`Recipient ${index + 1}:`, address);
        console.log(`  - Length: ${address.length}`);
        console.log(`  - Without 0x: ${address.slice(2)}`);
        console.log(`  - Valid format: ${/^0x[a-fA-F0-9]{63,64}$/.test(address)}`);
      });
      
      // Ensure SDK is initialized
      console.log('Initializing SDK...');
      await this.initializeSDK();
      console.log('SDK initialized successfully');
      
      // Log SDK state if possible
      console.log('SDK instance:', this.sdk);
      console.log('SDK methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.sdk)));
      
      console.log('Calling sdk.withdraw()...');
      // THIS LINE THROWS THE ERROR
      await this.sdk.withdraw(
        withdrawRequest.transactionHash,
        withdrawRequest.recipientAddresses
      );
      console.log('✅ Withdraw successful');
      console.groupEnd();
    } catch (error) {
      console.error('❌ Typhoon withdrawal failed');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : error);
      console.error('Full error object:', error);
      
      // Try to extract more details from the error
      if (error && typeof error === 'object') {
        console.error('Error properties:', Object.keys(error));
        console.error('Error stack:', (error as any).stack);
        console.error('Error code:', (error as any).code);
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
      console.groupEnd();
      
      throw new Error(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
```

### 2. TypeScript Interfaces

```typescript
// src/features/swap/types/typhoon.ts
export interface TyphoonWithdrawRequest {
  transactionHash: string;
  recipientAddresses: string[];
}

// src/features/withdraw/types/index.ts
export interface WithdrawRequest {
  transactionHash: string;
  recipients: RecipientInfo[];
}

export interface RecipientInfo {
  id: string;
  address: string;
  percentage: number;
}
```

### 3. Wrapper Service Layer

```typescript
// src/features/withdraw/services/withdrawService.ts
import { TyphoonService } from '@/features/swap/services/typhoon';
import { WithdrawRequest } from '../types';

export class WithdrawService {
  private typhoonService: TyphoonService;

  constructor() {
    this.typhoonService = new TyphoonService();
  }

  async executeWithdraw(request: WithdrawRequest): Promise<void> {
    const recipientAddresses = request.recipients.map(recipient => recipient.address);
    
    // This calls the TyphoonService.withdraw method above
    await this.typhoonService.withdraw({
      transactionHash: request.transactionHash,
      recipientAddresses
    });
  }

  validateTransactionHash(hash: string): boolean {
    // StarkNet transaction hashes can be 63-64 characters long after 0x prefix
    return /^0x[a-fA-F0-9]{63,64}$/.test(hash);
  }

  validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{63,64}$/.test(address);
  }
}
```

### 4. How It's Called from React Component

```typescript
// In the Zustand store
const executeWithdraw = async () => {
  const { transactionHash, recipients, withdrawService } = get();
  
  try {
    // Validation passes fine
    if (!withdrawService.validateTransactionHash(transactionHash)) {
      throw new Error('Invalid transaction hash format');
    }

    const validation = withdrawService.validateRecipients(recipients);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // ERROR OCCURS HERE - calls withdrawService.executeWithdraw
    await withdrawService.executeWithdraw({
      transactionHash,
      recipients
    });

    // Success handling...
  } catch (error) {
    console.error('Withdraw failed:', error);
    // Error gets logged here
  }
};
```

## Debug Logging Added

I've added comprehensive debug logging to see exactly what the SDK is receiving:

**When you run the withdraw function, you'll now see:**
- 🔧 SDK Initialization details
- 🔍 Transaction hash validation (length, format, content)
- 📋 Each recipient address validation
- 🔧 SDK instance methods and properties
- ❌ Detailed error information (type, message, stack, properties)

**Console Output Example:**
```
🔍 Typhoon Withdraw Debug Info
  Transaction Hash: 0x5d4838301fe67e8229f4b7d01780b11a51634d9c873514e62bd10f654f515ed
  Transaction Hash Length: 66
  Transaction Hash (without 0x): 5d4838301fe67e8229f4b7d01780b11a51634d9c873514e62bd10f654f515ed
  Recipient Addresses: ['0x123...']
  Number of Recipients: 1
  Recipient 1: 0x123...
    - Length: 66
    - Without 0x: 123...
    - Valid format: true
  SDK instance: [object]
  SDK methods available: [...]
  Calling sdk.withdraw()...
  ❌ Typhoon withdrawal failed
```

## Questions for Typhoon Developers

1. **SDK Initialization**: Are the empty arrays `this.sdk.init([], [], [])` correct for development/testing?

2. **Transaction Hash Format**: The hash `0x5d4838301fe67e8229f4b7d01780b11a51634d9c873514e62bd10f654f515ed` is 63 chars after `0x` - is this correct for StarkNet?

3. **Recipient Address Format**: Should recipient addresses be in any specific format?

4. **Environment**: Does the SDK work in browser environments or only Node.js?

5. **Internal Validation**: With the debug logging above, what specific validation is the SDK doing that's failing?

## Full Call Stack
The error originates from:
1. React component calls `executeWithdraw()`
2. Zustand store calls `withdrawService.executeWithdraw()`
3. WithdrawService calls `typhoonService.withdraw()`
4. TyphoonService calls `this.sdk.withdraw()` ← **ERROR OCCURS HERE**

Thank you for your help debugging this issue!