import React from 'react';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { TokenInput } from './TokenInput';
import { TransactionDetails } from './TransactionDetails';
import { Button } from '@/shared/components/ui/button';
import { Token } from '@/constants/tokens';
import { useTokenBalance, useTokenPrices } from '@/shared/hooks';
import { ErrorMessage } from '@/shared/components/ui/error-message';
import { AVNUQuote, formatQuoteForDisplay, extractTokenPricesFromQuote } from '../services/avnu';

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
  onPercentageClick: (percentage: number, balance: string) => void;
  // Quote-related props
  selectedQuote?: AVNUQuote | null;
  formattedQuote?: ReturnType<typeof formatQuoteForDisplay> | null;
  isLoadingQuotes?: boolean;
  quotesError?: string | null;
  isQuoteExpired?: boolean;
  timeToExpiry?: number;
  onRefreshQuotes?: () => void;
  // Slippage-related props
  slippage?: number;
  minReceived?: string;
  onSlippageChange?: (slippage: number) => void;
  // Swap execution props
  isExecutingSwap?: boolean;
  isSwapSuccess?: boolean;
  isSwapError?: boolean;
  swapError?: string | null;
  transactionHash?: string | null;
  onResetSwap?: () => void;
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
  onPercentageClick,
  // Quote-related props
  selectedQuote,
  formattedQuote,
  isLoadingQuotes = false,
  quotesError,
  isQuoteExpired = false,
  // Slippage-related props
  slippage = 0.5,
  minReceived = "0",
  onSlippageChange,
  // Swap execution props
  isExecutingSwap = false,
  isSwapSuccess = false,
  isSwapError = false,
  swapError,
  transactionHash,
  onResetSwap,
}) => {

  // Fetch balances for selected tokens
  const fromTokenBalance = useTokenBalance(fromToken, walletAddress);
  const toTokenBalance = useTokenBalance(toToken, walletAddress);

  // Use token prices from AVNU quotes when available
  // Don't fetch fallback prices - quotes provide all the price data we need
  const tokenPrices = selectedQuote
    ? extractTokenPricesFromQuote(selectedQuote, fromToken.decimals, toToken.decimals)
    : undefined;




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
          onPercentageClick={(percentage) => onPercentageClick(percentage, fromTokenBalance.balance)}
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
      {fromAmount && parseFloat(fromAmount) > 0 && isValidTokenPair && (
        <>

          {/* Error state */}
          {quotesError && !isLoadingQuotes && (
            <ErrorMessage
              message={`Failed to fetch quotes: ${quotesError}`}
              className="mt-6 mb-0"
            />
          )}

          {/* Transaction Details with quote data */}
          {formattedQuote && selectedQuote && !quotesError && (
            <TransactionDetails
              rate={formattedQuote.exchangeRate}
              integratorFee={formattedQuote.integratorFee}
              integratorFeesBps={selectedQuote.integratorFeesBps}
              avnuFee={formattedQuote.avnuFee}
              avnuFeesBps={selectedQuote.avnuFeesBps}
              minReceived={minReceived}
              slippage={slippage}
              onSlippageChange={onSlippageChange}
              toTokenSymbol={toToken.symbol}
            />
          )}
        </>
      )}

      {/* Same Token Error */}
      {!isValidTokenPair && (
        <ErrorMessage
          message="Cannot swap the same token. Please select different tokens."
          className="mt-6"
        />
      )}



      {/* Swap Button */}
      <div className="mt-6 space-y-3">
        <Button
          className={`swap-button ${(!isValidTokenPair || isQuoteExpired || (quotesError && fromAmount && parseFloat(fromAmount) > 0) || isExecutingSwap) ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={onSwap}
          disabled={
            !isValidTokenPair ||
            !fromAmount ||
            parseFloat(fromAmount) <= 0 ||
            (fromAmount && parseFloat(fromAmount) > 0 && isValidTokenPair && !selectedQuote && !isLoadingQuotes) ||
            isQuoteExpired ||
            (quotesError && fromAmount && parseFloat(fromAmount) > 0) ||
            isExecutingSwap
          }
        >
          {(() => {
            if (!isValidTokenPair) return 'Select Different Tokens';
            if (isQuoteExpired) return 'Quote Expired - Refresh';
            if (quotesError && fromAmount && parseFloat(fromAmount) > 0) return 'Quote Error';
            if (isExecutingSwap) return (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Executing swap...</span>
              </div>
            );
            if (isLoadingQuotes) return (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Getting best quotes...</span>
              </div>
            );
            if (fromAmount && parseFloat(fromAmount) > 0 && isValidTokenPair && !selectedQuote) return 'No Quote Available';
            return 'Swap';
          })()}
        </Button>
      </div>
    </div>
  );
};