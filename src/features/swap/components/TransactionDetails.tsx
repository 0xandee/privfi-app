import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Info, User } from 'lucide-react';
import { useSwapStore } from '../store/swapStore';

interface TransactionDetailsProps {
  rate?: string;
  rateWithUsd?: string;
  integratorFee?: string;
  integratorFeesBps?: string;
  avnuFee?: string;
  avnuFeesBps?: string;
  minReceived?: string;
  slippage?: number;
  onSlippageChange?: (slippage: number) => void;
  toTokenSymbol?: string;
  walletAddress?: string;
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  rate = "0",
  rateWithUsd,
  integratorFee = "$0.00",
  integratorFeesBps = "0",
  avnuFee = "$0.00", 
  avnuFeesBps = "0",
  minReceived = "0",
  slippage = 0.5,
  onSlippageChange,
  toTokenSymbol = "",
  walletAddress,
}) => {
  const { privacy, setRecipientAddress } = useSwapStore();
  const [tempAddress, setTempAddress] = useState(privacy.recipientAddress || '');

  const presetSlippages = [0, 0.1, 0.5, 1];

  // Calculate fee amounts first to determine transaction value
  const integratorFeeAmount = parseFloat(integratorFee.replace('$', '') || "0");
  const avnuFeeAmount = parseFloat(avnuFee.replace('$', '') || "0");
  
  // Calculate Typhoon fee based on the same base as other fees
  // If integrator fee is 15 bps and typhoon is 50 bps, typhoon should be ~3.33x the integrator fee
  const typhoonFeeAmount = integratorFeeAmount > 0 ? (integratorFeeAmount * 50) / 15 : 0;
  const typhoonFeeBps = 50; // 0.5% = 50 basis points

  // Calculate total platform fees percentage and amount
  // Parse hex strings correctly (API returns hex values like '0xf')
  const integratorBpsValue = integratorFeesBps ? parseInt(integratorFeesBps, 16) : 0;
  const avnuBpsValue = avnuFeesBps ? parseInt(avnuFeesBps, 16) : 0;
  let totalFeesBps = integratorBpsValue + avnuBpsValue + typhoonFeeBps; // Include Typhoon fee
  
  // Fallback: if API bps values are not available or zero, calculate from USD amounts
  // Known: Integrator fee is 15 bps (0.15%), Typhoon is 50 bps (0.5%)
  if (integratorBpsValue + avnuBpsValue === 0) {
    if (integratorFeeAmount > 0) {
      // Integrator is 15 bps, so we can estimate AVNU bps from ratio
      const integratorBps = 15;
      const estimatedAvnuBps = avnuFeeAmount > 0 ? Math.round((avnuFeeAmount / integratorFeeAmount) * integratorBps) : 0;
      totalFeesBps = integratorBps + estimatedAvnuBps + typhoonFeeBps;
    }
  }
  
  // Convert bps to percentage with appropriate decimal places
  // 1 bps = 0.01%, so divide by 100
  const percentageValue = totalFeesBps / 100;
  const totalFeesPercentage = percentageValue.toFixed(2);
  const totalFeeAmount = (integratorFeeAmount + avnuFeeAmount + typhoonFeeAmount).toFixed(3);

  const handleSlippageClick = (value: number) => {
    onSlippageChange?.(value);
  };

  const handleAddressChange = (value: string) => {
    setTempAddress(value);
    setRecipientAddress(value);
  };

  const handleUseWallet = () => {
    if (walletAddress) {
      setTempAddress(walletAddress);
      setRecipientAddress(walletAddress);
    }
  };

  const displayAddress = privacy.recipientAddress || tempAddress || '';
  const truncatedAddress = displayAddress 
    ? displayAddress.length > 20
      ? `${displayAddress.slice(0, 8)}...${displayAddress.slice(-8)}`
      : displayAddress
    : '';
  
  const placeholderText = walletAddress 
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)} (default)`
    : 'Enter recipient address';

  return (
    <>
      <div className="crypto-card px-4 py-6 mt-4 space-y-4">
        <div className="transaction-detail">
          <span className="transaction-detail-label">Rate</span>
          <span className="transaction-detail-value">
            {rateWithUsd ? (
              <>
                {rateWithUsd.split(' (')[0]}{' '}
                <span className="text-transaction-detail">({rateWithUsd.split(' (')[1]}</span>
              </>
            ) : (
              rate
            )}
          </span>
        </div>

        <div className="transaction-detail">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="transaction-detail-label flex items-center gap-1 cursor-pointer">
                Platform Fees ({totalFeesPercentage}%)
                <Info className="h-3 w-3 text-gray-400" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="w-32">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Privfi</span>
                  <span>0.15%</span>
                </div>
                <div className="flex justify-between">
                  <span>AVNU</span>
                  <span>{(avnuBpsValue / 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Typhoon</span>
                  <span>0.50%</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <span className="transaction-detail-value">${totalFeeAmount}</span>
        </div>

        <div className="transaction-detail">
          <span className="transaction-detail-label">Min Received</span>
          <span className="transaction-detail-value">{minReceived} {toTokenSymbol}</span>
        </div>

        <div className="transaction-detail">
          <span className="transaction-detail-label">Slippage</span>
          <Select value={slippage.toString()} onValueChange={(value) => handleSlippageClick(parseFloat(value))}>
            <SelectTrigger className="slippage-selector w-[5.5rem] h-8 border-0 focus:ring-0 shadow-none !bg-token-selector">
              <span className="font-medium">{slippage}%</span>
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-0">
              {presetSlippages.map((preset) => (
                <SelectItem key={preset} value={preset.toString()} className="cursor-pointer [&>span:first-child]:hidden pl-3">
                  <span className="font-medium">{preset}%</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="transaction-detail">
          <span className="transaction-detail-label">Recipient Address</span>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={placeholderText}
              value={tempAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="h-8 px-2 py-1 bg-token-selector border-0 focus:ring-0 shadow-none text-xs font-medium min-w-0 flex-1"
            />
            {walletAddress && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUseWallet}
                className="h-6 px-2 text-xs text-gray-400 hover:text-white"
              >
                Use Wallet
              </Button>
            )}
          </div>
        </div>

      </div>
    </>
  );
};