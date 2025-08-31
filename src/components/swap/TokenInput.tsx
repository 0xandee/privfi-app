import React, { useEffect, useState } from 'react';
import { TokenSelector } from './TokenSelector';
import { Token } from '@/constants/tokens';
import { useInputValidation } from '@/hooks/useInputValidation';
import { useTokenPrice, TokenPrice } from '@/hooks/useTokenPrices';
import { getTokenUSDDisplay } from '@/lib/priceUtils';
import { ErrorMessage } from '@/components/ui/error-message';

interface TokenInputProps {
  label: string;
  amount: string;
  balance: string;
  isLoadingBalance?: boolean;
  selectedToken: Token;
  placeholder?: string;
  priceData?: { [address: string]: TokenPrice };
  disableBalanceValidation?: boolean;
  readOnly?: boolean;
  onAmountChange: (value: string) => void;
  onTokenChange: (token: Token) => void;
  showPercentageButtons?: boolean;
  percentageButtons?: number[];
  onPercentageClick?: (percentage: number) => void;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  label,
  amount,
  balance,
  isLoadingBalance = false,
  selectedToken,
  placeholder = "0.0",
  priceData,
  disableBalanceValidation = false,
  readOnly = false,
  onAmountChange,
  onTokenChange,
  showPercentageButtons = false,
  percentageButtons = [],
  onPercentageClick,
}) => {
  const validation = useInputValidation(
    amount, 
    selectedToken, 
    disableBalanceValidation ? undefined : balance
  );
  const [activePercentage, setActivePercentage] = useState<number | null>(null);
  
  // Use pre-fetched price data if available, otherwise fetch individually
  const shouldSkipIndividualFetch = priceData && priceData[selectedToken.address.toLowerCase()];
  const { price: fetchedPrice, isLoading: isPriceLoading } = useTokenPrice(
    shouldSkipIndividualFetch ? '' : selectedToken.address
  );
  
  const price = priceData?.[selectedToken.address.toLowerCase()]?.priceInUSD || fetchedPrice;
  const isLoading = shouldSkipIndividualFetch ? false : isPriceLoading;


  // Calculate USD value display
  const usdValue = validation.value && price > 0 
    ? getTokenUSDDisplay(validation.value, price, selectedToken.decimals)
    : "~$0.00";

  // Update parent component when validated value changes
  useEffect(() => {
    if (validation.value !== amount) {
      onAmountChange(validation.value);
    }
  }, [validation.value, amount, onAmountChange]);

  // Clear active percentage when user manually types or when token/balance changes
  useEffect(() => {
    if (validation.isTouched) {
      setActivePercentage(null);
    }
  }, [validation.isTouched]);

  // Clear active percentage when token or balance changes
  useEffect(() => {
    setActivePercentage(null);
  }, [selectedToken.address, balance]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validation.handleChange(e.target.value);
  };

  const handlePercentageClick = (percentage: number) => {
    if (balance && parseFloat(balance) > 0) {
      const balanceNum = parseFloat(balance);
      const amount = (balanceNum * percentage) / 100;
      // Format to appropriate decimals based on token
      const maxDisplayDecimals = selectedToken.decimals > 6 ? 6 : selectedToken.decimals;
      const formattedAmount = amount.toFixed(maxDisplayDecimals);
      validation.setValue(formattedAmount);
      setActivePercentage(percentage); // Set active percentage for visual feedback
    }
    // Also call the parent's percentage click handler if provided
    onPercentageClick?.(percentage);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">
          Balance: {isLoadingBalance ? '...' : balance} {selectedToken.symbol}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={validation.value}
            onChange={readOnly ? undefined : handleInputChange}
            onBlur={readOnly ? undefined : validation.handleBlur}
            readOnly={readOnly}
            className={`token-input flex-1 ${
              validation.displayError ? 'border border-red-400/50 bg-red-400/5' : ''
            } ${
              readOnly ? 'cursor-default' : ''
            }`}
            placeholder={placeholder}
          />
          <TokenSelector
            selectedToken={selectedToken}
            onTokenChange={onTokenChange}
          />
        </div>

        {/* Error Message */}
        {validation.displayError && (
          <ErrorMessage message={validation.displayError} />
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : usdValue}
          </span>
          {showPercentageButtons && !readOnly && (
            <div className="flex gap-2">
              {percentageButtons.map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => handlePercentageClick(percentage)}
                  className={`percentage-button ${!balance || parseFloat(balance) <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                    } ${activePercentage === percentage ? 'bg-white text-black hover:bg-white' : ''
                    }`}
                  disabled={!balance || parseFloat(balance) <= 0}
                >
                  {percentage}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};