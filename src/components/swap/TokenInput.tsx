import React, { useEffect, useState } from 'react';
import { TokenSelector } from './TokenSelector';
import { Token } from '@/constants/tokens';
import { useInputValidation } from '@/hooks/useInputValidation';
import { ErrorMessage } from '@/components/ui/error-message';

interface TokenInputProps {
  label: string;
  amount: string;
  balance: string;
  isLoadingBalance?: boolean;
  selectedToken: Token;
  excludeToken?: Token;
  placeholder?: string;
  usdValue?: string;
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
  excludeToken,
  placeholder = "0.0",
  usdValue = "~$0.00",
  onAmountChange,
  onTokenChange,
  showPercentageButtons = false,
  percentageButtons = [],
  onPercentageClick,
}) => {
  const validation = useInputValidation(amount, selectedToken, balance);
  const [activePercentage, setActivePercentage] = useState<number | null>(null);

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
            onChange={handleInputChange}
            onBlur={validation.handleBlur}
            className={`token-input flex-1 ${validation.displayError ? 'border border-red-400/50 bg-red-400/5' : ''
              }`}
            placeholder={placeholder}
          />
          <TokenSelector
            selectedToken={selectedToken}
            onTokenChange={onTokenChange}
            excludeToken={excludeToken}
          />
        </div>

        {/* Error Message */}
        {validation.displayError && (
          <ErrorMessage message={validation.displayError} />
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{usdValue}</span>
          {showPercentageButtons && (
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