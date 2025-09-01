import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TokenSelector } from './TokenSelector';
import { Token } from '@/constants/tokens';
import { useInputValidation } from '@/shared/hooks';
import { TokenPrice } from '@/shared/hooks/useTokenPrices';
import { getTokenUSDDisplay } from '@/shared/utils/priceUtils';
import { formatTokenAmountDisplay } from '@/shared/utils/lib/inputValidation';
import { ErrorMessage } from '@/shared/components/ui/error-message';
import { WarningMessage } from '@/shared/components/ui/warning-message';

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
  isEstimating?: boolean; // Show that the amount is an estimate while loading real quotes
  disableSync?: boolean; // Temporarily disable syncing to prevent conflicts
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
  isEstimating = false,
  disableSync = false,
}) => {
  const validation = useInputValidation(
    amount, 
    selectedToken, 
    disableBalanceValidation ? undefined : balance
  );
  const [activePercentage, setActivePercentage] = useState<number | null>(null);
  
  // Use pre-fetched price data if available, otherwise fetch individually
  // Try multiple address formats to find a match
  const findPriceInData = (priceData: { [address: string]: TokenPrice } | undefined, tokenAddress: string) => {
    if (!priceData) return null;
    
    const normalizedAddr = tokenAddress.toLowerCase();
    
    // Try exact match first
    if (priceData[normalizedAddr]) return priceData[normalizedAddr];
    
    // Try with padded zero if address is 65 chars (0x + 63 chars)
    if (normalizedAddr.length === 65) {
      const paddedAddr = '0x0' + normalizedAddr.slice(2);
      if (priceData[paddedAddr]) return priceData[paddedAddr];
    }
    
    // Try without leading zero if address starts with 0x0 and is 66 chars
    if (normalizedAddr.startsWith('0x0') && normalizedAddr.length === 66) {
      const unpaddedAddr = '0x' + normalizedAddr.slice(3);
      if (priceData[unpaddedAddr]) return priceData[unpaddedAddr];
    }
    
    return null;
  };
  
  const priceFromData = findPriceInData(priceData, selectedToken.address);
  
  // Use only the centralized price data - no individual fetching
  const price = priceFromData?.priceInUSD || 0;
  const isLoading = false;


  // Calculate USD value display
  const usdValue = (() => {
    if (!validation.value || parseFloat(validation.value) <= 0) {
      return "~$0.00";
    }
    
    if (isLoading) {
      return "Loading...";
    }
    
    if (price > 0) {
      return getTokenUSDDisplay(validation.value, price, selectedToken.decimals);
    }
    
    return "~$0.00";
  })();

  // Sync validation value with amount prop when it changes (for programmatic updates)
  useEffect(() => {
    // Skip syncing if disabled to prevent conflicts during swap direction
    if (disableSync) {
      console.log(`TokenInput (${label}) skipping sync - disabled`);
      return;
    }
    
    // Always sync when the amount prop changes and it's different from the validation value
    // This ensures programmatic updates (like swap direction) work correctly
    if (amount !== validation.value) {
      validation.setValue(amount);
    }
  }, [amount, label, disableSync, validation.setValue]); // Include validation.setValue

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

  // Notify parent of validation value changes (but not during sync)
  useEffect(() => {
    if (!disableSync && validation.value !== amount && validation.isTouched) {
      onAmountChange(validation.value);
    }
  }, [validation.value, validation.isTouched, disableSync, amount, onAmountChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validation.handleChange(e.target.value);
  };

  const handlePercentageClick = (percentage: number) => {
    if (balance && parseFloat(balance) > 0) {
      const balanceNum = parseFloat(balance);
      const amount = (balanceNum * percentage) / 100;
      // Format to appropriate decimals based on token, removing trailing zeros
      const maxDisplayDecimals = selectedToken.decimals > 6 ? 6 : selectedToken.decimals;
      const formattedAmount = formatTokenAmountDisplay(amount, maxDisplayDecimals);
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
          <div className="relative flex-1">
            <input
              type="text"
              value={validation.value}
              onChange={readOnly ? undefined : handleInputChange}
              onBlur={readOnly ? undefined : validation.handleBlur}
              readOnly={readOnly}
              className={`token-input w-full ${
                validation.displayError ? 'border border-red-400/50 bg-red-400/5' : ''
              } ${
                readOnly ? 'cursor-default' : ''
              } ${
                isEstimating ? 'pr-8' : ''
              }`}
              placeholder={placeholder}
            />
            {isEstimating && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <TokenSelector
            selectedToken={selectedToken}
            onTokenChange={onTokenChange}
          />
        </div>

        {/* Error Messages Only - Balance warnings shown in swap button */}
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