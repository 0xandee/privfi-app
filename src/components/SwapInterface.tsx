import React, { useState } from 'react';
import { Settings, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ethLogo from '@/assets/eth-logo.png';
import strkLogo from '@/assets/strk-logo.png';

const SwapInterface = () => {
  const [activeTab, setActiveTab] = useState('swap');
  const [fromAmount, setFromAmount] = useState('0.000434');
  const [toAmount] = useState('14.886469');

  const percentageButtons = [25, 50, 75, 100];

  const handlePercentageClick = (percentage: number) => {
    // Calculate percentage of balance
    const balance = 0.0008;
    const amount = (balance * percentage) / 100;
    setFromAmount(amount.toFixed(6));
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="crypto-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'swap'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('swap')}
              >
                Swap
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'dca'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('dca')}
              >
                DCA
              </button>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Swap Card */}
        <div className="crypto-card p-6 space-y-4">
          {/* From Token Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">From</span>
              <span className="text-sm text-muted-foreground">Balance: 0.0008</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="token-input"
                  placeholder="0.0"
                />
                <div className="token-selector">
                  <img src={ethLogo} alt="ETH" className="w-6 h-6" />
                  <span className="font-medium">ETH</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">~$1.90</span>
                <div className="flex gap-2">
                  {percentageButtons.map((percentage) => (
                    <button
                      key={percentage}
                      onClick={() => handlePercentageClick(percentage)}
                      className="percentage-button"
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Swap Direction */}
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full border">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">To</span>
              <span className="text-sm text-muted-foreground">Balance: 208.7694</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-medium">{toAmount}</div>
                <div className="token-selector">
                  <img src={strkLogo} alt="STRK" className="w-6 h-6" />
                  <span className="font-medium">STRK</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">~$1.90</span>
                  <span className="text-sm text-positive-change">+0.03%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="crypto-card p-4 mt-4 space-y-3">
          <div className="transaction-detail">
            <span className="transaction-detail-label">Price</span>
            <span className="transaction-detail-value">1 ETH = 34,300.62147 STRK ≈ $4,393.31</span>
          </div>
          
          <div className="transaction-detail">
            <span className="transaction-detail-label">Service fee</span>
            <span className="transaction-detail-value">0.02%</span>
          </div>
          
          <div className="transaction-detail">
            <span className="transaction-detail-label">Minimum received</span>
            <span className="transaction-detail-value">14.812037 STRK</span>
          </div>
          
          <div className="transaction-detail">
            <span className="transaction-detail-label">Maximum slippage</span>
            <span className="transaction-detail-value">0.5%</span>
          </div>
        </div>

        {/* Swap Button */}
        <div className="mt-6 space-y-3">
          <Button className="swap-button">
            Swap
          </Button>
          
          {/* Gas Fee */}
          <div className="text-center text-sm text-gas-fee">
            Gas fee: $0.00 or 0.0000017 ETH
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapInterface;