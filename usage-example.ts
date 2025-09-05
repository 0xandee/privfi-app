// usage-example.ts - How we use the Typhoon SDK in our swap execution
import { TyphoonService } from './typhoon-service-code';
import { AVNUService } from './avnu';
import { toast } from '@/shared/components/ui/sonner';

// This is the hook where the error occurs
export const useSwapExecution = () => {
  const typhoonService = useMemo(() => new TyphoonService(), []);
  const avnuService = useMemo(() => new AVNUService(), []);

  const executeSwap = useCallback(async () => {
    // Example quote data that triggers the error
    const selectedQuote = {
      quoteId: "quote_123",
      buyAmount: "0x1ab6845c34594a372", // 30797942756761445234n
      buyTokenAddress: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", // STRK token
      sellAmount: "1000000000000000000", // 1 ETH
      sellTokenAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7" // ETH token
    };

    try {
      // 1. Build the swap calldata using AVNU's build endpoint
      const buildResponse = await avnuService.buildSwap({
        quoteId: selectedQuote.quoteId,
        takerAddress: "0x1234...wallet_address",
        slippage: 0.01, // 1%
        includeApprove: true,
      });

      // 2. Try to generate Typhoon private swap calls (this is where error occurs)
      try {
        console.log('🔒 Attempting private swap with Typhoon...');
        
        // 🚨 THIS CALL FAILS - RPC 500 ERROR OCCURS HERE
        const depositCalls = await typhoonService.generateApproveAndDepositCalls(
          selectedQuote.buyAmount,      // "0x1ab6845c34594a372" 
          selectedQuote.buyTokenAddress // "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
        );

        // If successful, combine AVNU swap calls with Typhoon deposit calls
        const allCalls = [...buildResponse.calls, ...depositCalls];
        console.log('✅ Private swap calls generated:', allCalls.length, 'calls');
        
        // Execute the multicall transaction (swap + deposit)
        // sendTransaction(allCalls);
        
      } catch (typhoonError) {
        // This is our fallback mechanism
        console.group('⚠️ Typhoon Fallback Activated');
        console.warn('Typhoon service unavailable, falling back to regular swap');
        console.warn('Original error:', typhoonError);
        console.log('Proceeding with regular AVNU swap calls only');
        console.groupEnd();
        
        // Notify user about fallback
        toast.warning('Private swap unavailable, proceeding with regular swap', {
          description: 'Typhoon privacy service is temporarily unavailable',
          duration: 5000,
        });

        // Execute regular swap without deposit calls
        console.log('🔄 Executing regular swap fallback...');
        // sendTransaction(buildResponse.calls);
      }
      
    } catch (error) {
      console.error('💥 Complete swap failure:', error);
      throw error;
    }
  }, [typhoonService, avnuService]);

  return { executeSwap };
};

// Example of direct SDK usage that reproduces the error
export async function reproduceError() {
  console.log('🧪 Reproducing Typhoon SDK Error...');
  
  const sdk = new TyphoonSDK();
  
  // Initialize SDK
  console.log('Initializing SDK...');
  sdk.init([], [], []);
  console.log('SDK initialized');
  
  // These are the exact values that cause the error
  const amount = BigInt("0x1ab6845c34594a372"); // 30797942756761445234n
  const tokenAddress = "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"; // STRK
  
  console.log('Calling generate_approve_and_deposit_calls with:');
  console.log('- Amount:', amount.toString());
  console.log('- Token:', tokenAddress);
  
  try {
    // This should trigger the RPC 500 error
    const result = await sdk.generate_approve_and_deposit_calls(amount, tokenAddress);
    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Error reproduced:', error);
    throw error;
  }
}