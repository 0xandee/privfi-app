import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { TokenInput } from './TokenInput';
import { TransactionDetails } from './TransactionDetails';
import { Button } from '../ui/button';
import { Token } from '@/constants/tokens';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { ErrorMessage } from '@/components/ui/error-message';

interface SwapCardProps {
  fromAmount: string;
  toAmount: string;
  percentageButtons: number[];
  fromToken: Token;
  toToken: Token;
  walletAddress?: string;
  isValidTokenPair?: boolean;
  onFromAmountChange: (value: string) => void;
  onToAmountChange: (value: string) => void;
  onFromTokenChange: (token: Token) => void;
  onToTokenChange: (token: Token) => void;
  onSwap: () => void;
  onSwapDirection: () => void;
}

export const SwapCard: React.FC<SwapCardProps> = ({
  fromAmount,
  toAmount,
  percentageButtons,
  fromToken,
  toToken,
  walletAddress,
  isValidTokenPair = true,
  onFromAmountChange,
  onToAmountChange,
  onFromTokenChange,
  onToTokenChange,
  onSwap,
  onSwapDirection,
}) => {
  // Fetch balances for selected tokens
  const fromTokenBalance = useTokenBalance(fromToken, walletAddress);
  const toTokenBalance = useTokenBalance(toToken, walletAddress);

  // Batch fetch prices for both tokens to optimize API calls
  const { data: tokenPrices } = useTokenPrices([fromToken.address, toToken.address]);
  


  return (
    <div>
      {/* Main Swap Card */}
      <div className="crypto-card px-4 py-6 space-y-4">
        {/* From Token Section */}
        <TokenInput
          label="From"
          amount={fromAmount}
          balance={fromTokenBalance.balance}
          isLoadingBalance={fromTokenBalance.isLoading}
          selectedToken={fromToken}
          priceData={tokenPrices}
          onAmountChange={onFromAmountChange}
          onTokenChange={onFromTokenChange}
          showPercentageButtons={true}
          percentageButtons={percentageButtons}
        />

        {/* Swap Direction with Separator */}
        <div className="relative flex justify-center py-2 -mx-6">
          {/* Separator line going through button */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#1C1C1C] transform -translate-y-1/2"></div>
          <button 
            onClick={onSwapDirection}
            className="w-10 h-10 bg-[#1C1C1C] text-percentage-button-foreground rounded-md hover:bg-percentage-button-hover transition-colors cursor-pointer text-sm font-medium relative z-10 flex items-center justify-center"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        {/* To Token Section */}
        <TokenInput
          label="To"
          amount={toAmount}
          balance={toTokenBalance.balance}
          isLoadingBalance={toTokenBalance.isLoading}
          selectedToken={toToken}
          priceData={tokenPrices}
          disableBalanceValidation={true}
          readOnly={true}
          onAmountChange={onToAmountChange}
          onTokenChange={onToTokenChange}
        />
      </div>

      {/* Transaction Details */}
      {/* <TransactionDetails /> */}

      {/* Same Token Error */}
      {!isValidTokenPair && (
        <ErrorMessage 
          message="Cannot swap the same token. Please select different tokens." 
          className="mt-4" 
        />
      )}

      {/* Swap Button */}
      <div className="mt-6 space-y-3">
        <Button 
          className={`swap-button ${!isValidTokenPair ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={onSwap}
          disabled={!isValidTokenPair || !fromAmount || parseFloat(fromAmount) <= 0}
        >
          {!isValidTokenPair ? 'Select Different Tokens' : 'Swap'}
        </Button>
      </div>
    </div>
  );
};