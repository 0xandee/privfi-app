import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { TokenInput } from './TokenInput';
import { TransactionDetails } from './TransactionDetails';
import { Button } from '../ui/button';
import { Token } from '@/constants/tokens';

interface SwapCardProps {
  fromAmount: string;
  toAmount: string;
  balance: string;
  percentageButtons: number[];
  fromToken: Token;
  toToken: Token;
  onFromAmountChange: (value: string) => void;
  onToAmountChange: (value: string) => void;
  onFromTokenChange: (token: Token) => void;
  onToTokenChange: (token: Token) => void;
  onPercentageClick: (percentage: number) => void;
  onSwap: () => void;
}

export const SwapCard: React.FC<SwapCardProps> = ({
  fromAmount,
  toAmount,
  balance,
  percentageButtons,
  fromToken,
  toToken,
  onFromAmountChange,
  onToAmountChange,
  onFromTokenChange,
  onToTokenChange,
  onPercentageClick,
  onSwap,
}) => {
  return (
    <div>
      {/* Main Swap Card */}
      <div className="crypto-card px-4 py-6 space-y-4">
        {/* From Token Section */}
        <TokenInput
          label="From"
          amount={fromAmount}
          balance={balance}
          selectedToken={fromToken}
          onAmountChange={onFromAmountChange}
          onTokenChange={onFromTokenChange}
          showPercentageButtons={true}
          percentageButtons={percentageButtons}
          onPercentageClick={onPercentageClick}
        />

        {/* Swap Direction with Separator */}
        <div className="relative flex justify-center py-2 -mx-6">
          {/* Separator line going through button */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#1C1C1C] transform -translate-y-1/2"></div>
          <button className="w-10 h-10 bg-[#1C1C1C] text-percentage-button-foreground rounded-md hover:bg-percentage-button-hover transition-colors cursor-pointer text-sm font-medium relative z-10 flex items-center justify-center">
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        {/* To Token Section */}
        <TokenInput
          label="To"
          amount={toAmount}
          balance={balance}
          selectedToken={toToken}
          onAmountChange={onToAmountChange}
          onTokenChange={onToTokenChange}
        />
      </div>

      {/* Transaction Details */}
      {/* <TransactionDetails /> */}

      {/* Swap Button */}
      <div className="mt-6 space-y-3">
        <Button className="swap-button" onClick={onSwap}>
          Swap
        </Button>
      </div>
    </div>
  );
};