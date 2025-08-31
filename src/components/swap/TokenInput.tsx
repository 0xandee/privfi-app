import React from 'react';
import { TokenSelector } from './TokenSelector';
import { Token } from '@/constants/tokens';

interface TokenInputProps {
  label: string;
  amount: string;
  balance: string;
  selectedToken: Token;
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
  selectedToken,
  placeholder = "0.0",
  usdValue = "~$0.00",
  onAmountChange,
  onTokenChange,
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
          <TokenSelector
            selectedToken={selectedToken}
            onTokenChange={onTokenChange}
          />
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