import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenSelector } from './TokenSelector';
import { Token } from '@/constants/tokens';
import { useInputValidation, useDebounce } from '@/shared/hooks';
import { TokenPrice } from '@/shared/hooks/useTokenPrices';
import { getTokenUSDDisplay } from '@/shared/utils/priceUtils';
import { formatTokenAmountDisplay } from '@/shared/utils/lib/inputValidation';
import { ErrorMessage } from '@/shared/components/ui/error-message';
import { WarningMessage } from '@/shared/components/ui/warning-message';
import { useAnimations } from '@/shared/hooks/useAnimations';
import { AnimatedNumber } from '@/shared/components/ui/animated-number';
import { Skeleton } from '@/shared/components/ui/skeleton';

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
  const { variants, transitions, hover, focus } = useAnimations();
  const validation = useInputValidation(
    amount, 
    selectedToken, 
    disableBalanceValidation ? undefined : balance
  );
  const [activePercentage, setActivePercentage] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  
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

  // Debounce the validation value for USD calculation performance
  const debouncedValue = useDebounce(validation.value, 300);

  // Calculate USD value display with debounced value
  const usdValue = (() => {
    if (!debouncedValue || parseFloat(debouncedValue) <= 0) {
      return null; // Hide when no amount
    }
    
    if (isLoading) {
      return "Loading...";
    }
    
    if (price > 0) {
      return getTokenUSDDisplay(debouncedValue, price, selectedToken.decimals);
    }
    
    return null; // Hide when no price available
  })();

  // Show loading skeleton when user has entered amount but debounced value hasn't caught up
  const showSkeleton = validation.value && !debouncedValue && parseFloat(validation.value) > 0;

  // Sync validation value with amount prop when it changes (for programmatic updates)
  useEffect(() => {
    // Skip syncing if disabled to prevent conflicts during swap direction
    if (disableSync) {
      return;
    }
    
    // Always sync when the amount prop changes and it's different from the validation value
    // This ensures programmatic updates (like swap direction) work correctly
    if (amount !== validation.value) {
      validation.setValue(amount);
    }
  }, [amount, label, disableSync, validation]); // Include validation object

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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    validation.handleBlur(e);
  };

  const handlePercentageClick = (percentage: number) => {
    if (balance && parseFloat(balance) > 0) {
      setActivePercentage(percentage); // Set active percentage for visual feedback
      // Call the parent's percentage click handler
      onPercentageClick?.(percentage);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-normal text-muted-foreground">{label}</span>
        {!readOnly ? (
          <span 
            className={`text-xs text-muted-foreground transition-opacity duration-200 ${
              !isLoadingBalance && balance && parseFloat(balance) > 0 
                ? 'cursor-pointer hover:opacity-70' 
                : ''
            }`}
            onClick={() => {
              if (!isLoadingBalance && balance && parseFloat(balance) > 0 && onPercentageClick) {
                onPercentageClick(100);
              }
            }}
          >
            Balance: {isLoadingBalance ? '...' : balance} {selectedToken.symbol}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Balance: {isLoadingBalance ? '...' : balance} {selectedToken.symbol}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={validation.value}
              onChange={readOnly ? undefined : handleInputChange}
              onFocus={readOnly ? undefined : handleInputFocus}
              onBlur={readOnly ? undefined : handleInputBlur}
              readOnly={readOnly}
              className={`token-input w-full ${
                validation.displayError ? 'border border-red-400/50 bg-red-400/5' : ''
              } ${
                readOnly ? 'cursor-default' : ''
              } ${
                isEstimating || usdValue || showSkeleton ? 'pr-20' : ''
              } ${transitions.default}`}
              placeholder={placeholder}
            />
            {/* USD Value Display - Inline Right */}
            {(usdValue || showSkeleton) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                {showSkeleton ? (
                  <Skeleton className="h-3 w-12" />
                ) : (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {usdValue}
                  </span>
                )}
              </div>
            )}
            {/* Loading indicator for estimating - positioned further right when USD is shown */}
            {isEstimating && (
              <div className={`absolute top-1/2 transform -translate-y-1/2 ${
                usdValue || showSkeleton ? 'right-24' : 'right-3'
              }`}>
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

        {showPercentageButtons && !readOnly && (
          <div className="flex justify-end">
            <div className="flex gap-2">
              {percentageButtons.map((percentage) => {
                const isDisabled = !balance || parseFloat(balance) <= 0;
                return (
                  <motion.button
                    key={percentage}
                    onClick={() => handlePercentageClick(percentage)}
                    className={`percentage-button ${
                      activePercentage === percentage ? 'bg-white text-black hover:bg-white' : ''
                    } ${transitions.default}`}
                    animate={{ opacity: isDisabled ? 0.5 : 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    disabled={isDisabled}
                    style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                  >
                    {percentage}%
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};