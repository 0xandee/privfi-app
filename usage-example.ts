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

    // 1. Build the swap calldata using AVNU's build endpoint
    const buildResponse = await avnuService.buildSwap({
      quoteId: selectedQuote.quoteId,
      takerAddress: "0x1234...wallet_address",
      slippage: 0.01, // 1%
      includeApprove: true,
    });

    // 2. Try to generate Typhoon private swap calls (this is where error occurs)
    try {
      
      // 🚨 THIS CALL FAILS - RPC 500 ERROR OCCURS HERE
      const depositCalls = await typhoonService.generateApproveAndDepositCalls(
        selectedQuote.buyAmount,      // "0x1ab6845c34594a372" 
        selectedQuote.buyTokenAddress // "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
      );

      // If successful, combine AVNU swap calls with Typhoon deposit calls
      const allCalls = [...buildResponse.calls, ...depositCalls];
      
      // Execute the multicall transaction (swap + deposit)
      // sendTransaction(allCalls);
      
    } catch (typhoonError) {
      // This is our fallback mechanism
      
      // Notify user about fallback
      toast.warning('Private swap unavailable, proceeding with regular swap', {
        description: 'Typhoon privacy service is temporarily unavailable',
        duration: 5000,
      });

      // Execute regular swap without deposit calls
      // sendTransaction(buildResponse.calls);
    }
  }, [typhoonService, avnuService]);

  return { executeSwap };
};

// Example of direct SDK usage that reproduces the error
export async function reproduceError() {
  const sdk = new TyphoonSDK();
  
  // Initialize SDK
  sdk.init([], [], []);
  
  // These are the exact values that cause the error
  const amount = BigInt("0x1ab6845c34594a372"); // 30797942756761445234n
  const tokenAddress = "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"; // STRK
  
  // This should trigger the RPC 500 error
  const result = await sdk.generate_approve_and_deposit_calls(amount, tokenAddress);
}