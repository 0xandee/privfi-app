import React, { useMemo, useState } from 'react';
import { ArrowUpDown, RefreshCw, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { TokenInput } from './TokenInput';
import { TransactionDetails } from './TransactionDetails';
import { LoadingButton } from '@/shared/components/ui/loading-button';
import { Token } from '@/constants/tokens';
import { useTokenBalance } from '@/shared/hooks';
import { ErrorMessage } from '@/shared/components/ui/error-message';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { AVNUQuote, formatQuoteForDisplay, extractTokenPricesFromQuote } from '../services/avnu';
import { useSwapStore } from '../store/swapStore';
import { useTimeEstimation } from '../hooks/useTimeEstimation';
import { useAnimations } from '@/shared/hooks/useAnimations';

interface MinimumAmountValidation {
  isValid: boolean;
  minimumAmount: string;
  errorMessage?: string;
  warningMessage?: string;
}

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
  // Estimating state
  isEstimatingAfterSwap?: boolean;
  // Direction swap state
  isSwappingDirection?: boolean;
  // Minimum amount validation
  minimumAmountValidation?: MinimumAmountValidation;
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
  // Estimating state
  isEstimatingAfterSwap = false,
  // Direction swap state
  isSwappingDirection = false,
  // Minimum amount validation
  minimumAmountValidation,
}) => {
  const { variants, transitions } = useAnimations();
  const [swapRotation, setSwapRotation] = useState(0);

  // Recipient address management
  const { privacy, setRecipientAddress } = useSwapStore();
  const [customAddress, setCustomAddress] = useState('');

  // Fetch balances for selected tokens
  const fromTokenBalance = useTokenBalance(fromToken, walletAddress);
  const toTokenBalance = useTokenBalance(toToken, walletAddress);

  // Only use token prices from AVNU quotes - no standalone price fetching needed
  // Prices are only displayed when user enters amounts, and quotes provide all needed price data
  const tokenPrices = selectedQuote
    ? extractTokenPricesFromQuote(selectedQuote, fromToken.decimals, toToken.decimals)
    : undefined;

  // Check if the from amount exceeds available balance
  const exceedsBalance = useMemo(() => {
    if (!fromAmount || !fromTokenBalance.rawFormatted) return false;
    const inputAmount = parseFloat(fromAmount);
    const availableBalance = parseFloat(fromTokenBalance.rawFormatted);
    return inputAmount > availableBalance;
  }, [fromAmount, fromTokenBalance.rawFormatted]);

  // Get execution progress from store
  const { executionProgress } = useSwapStore();

  // Use time estimation hook for real-time countdown
  const { formattedRemainingTime } = useTimeEstimation(executionProgress);

  // Handle swap direction with animation
  const handleSwapDirection = () => {
    setSwapRotation(prev => prev + 180);
    onSwapDirection();
  };


  // Ensure customAddress always starts empty on component mount
  React.useEffect(() => {
    if (privacy.recipientAddress) {
      setRecipientAddress(''); // Clear any existing recipient address from store
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Handle custom address change
  const handleCustomAddressChange = (value: string) => {
    setCustomAddress(value);
    setRecipientAddress(value);
  };

  // Handle wallet icon click to fill connected address
  const handleWalletIconClick = () => {
    if (walletAddress) {
      setCustomAddress(walletAddress);
      setRecipientAddress(walletAddress);
    }
  };

  // Validate Starknet address format
  const isValidStarknetAddress = (address: string) => {
    if (!address) return false;
    return /^0x[a-fA-F0-9]{63,64}$/.test(address);
  };


  return (
    <div className={transitions.default}>
      {/* Main Swap Card */}
      <div className="crypto-card px-3 py-4">
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
          showPercentageButtons={false}
          percentageButtons={percentageButtons}
          onPercentageClick={(percentage) => onPercentageClick(percentage, fromTokenBalance.rawFormatted)}
          disableSync={isEstimatingAfterSwap}
        />

        {/* Swap Direction with Separator */}
        <div className="relative flex justify-center -mx-6 mt-4">
          {/* Separator line going through button */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#1C1C1C] transform -translate-y-1/2"></div>
          <motion.button
            onClick={handleSwapDirection}
            className={`w-10 h-10 bg-[#1C1C1C] text-percentage-button-foreground rounded-md hover:bg-percentage-button-hover cursor-pointer text-xs font-medium relative z-10 flex items-center justify-center ${transitions.colors} ${transitions.transform}`}
            whileTap={!isSwappingDirection ? { scale: 0.90 } : {}}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            disabled={isSwappingDirection}
          >
            <motion.div
              animate={{ rotate: swapRotation }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ArrowUpDown className="h-4 w-4" />
            </motion.div>
          </motion.button>
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
          isEstimating={isEstimatingAfterSwap}
          disableSync={isEstimatingAfterSwap}
        />
      </div>

      {/* Recipient Section */}
      <div className="crypto-card p-4 mt-3">
        <div className="flex items-center gap-3 justify-between">
          {/* Label */}
          <span className="text-xs font-normal text-muted-foreground min-w-fit">Recipient</span>

          {/* Address Input */}
          <div className="relative">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => handleCustomAddressChange(e.target.value)}
                    className={`token-input-compact pr-8 ${customAddress && !isValidStarknetAddress(customAddress) ? 'border border-red-400/50 bg-red-400/5' : ''
                      } ${transitions.default}`}
                    placeholder="0x..."
                  />
                  <button
                    type="button"
                    onClick={handleWalletIconClick}
                    disabled={!walletAddress}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-700/50 transition-colors ${
                      !walletAddress ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    title={walletAddress ? 'Fill with connected wallet address' : 'No wallet connected'}
                  >
                    <Wallet className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </TooltipTrigger>
              {customAddress && !isValidStarknetAddress(customAddress) && (
                <TooltipContent side="bottom" className="max-w-xs">
                  <span className="text-xs text-red-400">
                    Please enter a valid Starknet address (0x followed by 63-64 hex characters)
                  </span>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
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

          {/* Always show TransactionDetails to prevent flickering */}
          <TransactionDetails
            rate={
              formattedQuote && selectedQuote && !quotesError
                ? formattedQuote.exchangeRate
                : isLoadingQuotes || isSwappingDirection
                  ? "Loading..."
                  : "Loading..."
            }
            rateWithUsd={
              formattedQuote && selectedQuote && !quotesError
                ? formattedQuote.exchangeRateWithUsd
                : ""
            }
            integratorFee={
              formattedQuote && selectedQuote && !quotesError
                ? formattedQuote.integratorFee
                : "0"
            }
            integratorFeesBps={
              selectedQuote && !quotesError
                ? selectedQuote.integratorFeesBps
                : "15"
            }
            avnuFee={
              formattedQuote && selectedQuote && !quotesError
                ? formattedQuote.avnuFee
                : "0"
            }
            avnuFeesBps={
              selectedQuote && !quotesError
                ? selectedQuote.avnuFeesBps
                : "0"
            }
            minReceived={minReceived}
            slippage={slippage}
            onSlippageChange={onSlippageChange}
            toTokenSymbol={toToken.symbol}
            toToken={toToken}
            priceData={tokenPrices}
          />
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
      <div className="mt-3 space-y-3">
        <LoadingButton
          className="swap-button"
          onClick={onSwap}
          loading={false}
          spinnerVariant="refresh"
          disabled={(() => {
            const isDisabled = !isValidTokenPair ||
            !fromAmount ||
            parseFloat(fromAmount) <= 0 ||
            isLoadingQuotes ||
            (fromAmount && parseFloat(fromAmount) > 0 && isValidTokenPair && !selectedQuote && !isLoadingQuotes) ||
            isQuoteExpired ||
            (quotesError && fromAmount && parseFloat(fromAmount) > 0) ||
            isExecutingSwap ||
            !!executionProgress ||
            exceedsBalance ||
            (minimumAmountValidation && !minimumAmountValidation.isValid) ||
            !customAddress ||
            !isValidStarknetAddress(customAddress);
            
            
            return isDisabled;
          })()}
        >
          {(() => {
            if (!isValidTokenPair) return 'Select Different Tokens';
            if (!walletAddress) return 'Connect Wallet';
            if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter Amount';
            if (!customAddress || !isValidStarknetAddress(customAddress)) return 'Add recipient address';
            if (isLoadingQuotes) return (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Getting best quotes...</span>
              </div>
            );
            if (exceedsBalance) return `Insufficient ${fromToken.symbol} Balance`;
            if (minimumAmountValidation && !minimumAmountValidation.isValid) return `Minimum output ${minimumAmountValidation.minimumAmount} ${toToken.symbol} required`;
            if (isQuoteExpired) return 'Quote Expired - Refresh';
            if (quotesError && fromAmount && parseFloat(fromAmount) > 0) return 'Quote Error';
            if (executionProgress) return (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>
                  {executionProgress.message}
                  {formattedRemainingTime && (
                    <span className="text-gray-400"> {formattedRemainingTime}</span>
                  )}
                </span>
              </div>
            );
            if (isExecutingSwap) return (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Executing swap...</span>
              </div>
            );
            if (fromAmount && parseFloat(fromAmount) > 0 && isValidTokenPair && !selectedQuote) return 'No Quote Available';
            return 'Swap';
          })()}
        </LoadingButton>
      </div>
    </div>
  );
};