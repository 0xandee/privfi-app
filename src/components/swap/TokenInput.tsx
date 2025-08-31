import React from 'react';
import { ChevronDown } from 'lucide-react';

interface TokenInputProps {
  label: string;
  amount: string;
  balance: string;
  tokenSymbol: string;
  placeholder?: string;
  usdValue?: string;
  onAmountChange: (value: string) => void;
  onTokenSelect?: () => void;
  showPercentageButtons?: boolean;
  percentageButtons?: number[];
  onPercentageClick?: (percentage: number) => void;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  label,
  amount,
  balance,
  tokenSymbol,
  placeholder = "0.0",
  usdValue = "~$0.00",
  onAmountChange,
  onTokenSelect,
  showPercentageButtons = false,
  percentageButtons = [],
  onPercentageClick,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">Balance: {balance}</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="token-input flex-1"
            placeholder={placeholder}
          />
          <div className="token-selector" onClick={onTokenSelect}>
            <span className="font-medium">{tokenSymbol}</span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{usdValue}</span>
          {showPercentageButtons && (
            <div className="flex gap-2">
              {percentageButtons.map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => onPercentageClick?.(percentage)}
                  className="percentage-button"
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