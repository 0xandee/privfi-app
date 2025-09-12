import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Button } from '@/shared/components/ui/button';
import { Info, ChevronDown } from 'lucide-react';
import { useAnimations } from '@/shared/hooks/useAnimations';
import { AnimatedNumber } from '@/shared/components/ui/animated-number';
import { Token } from '@/constants/tokens';
import { TokenPrice } from '@/shared/hooks/useTokenPrices';
import { getTokenUSDDisplay } from '@/shared/utils/priceUtils';

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
  toToken?: Token;
  priceData?: { [address: string]: TokenPrice };
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
  toToken,
  priceData,
}) => {
  const { variants, transitions, hover } = useAnimations();
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate Min Received USD value
  const minReceivedUsd = (() => {
    if (!minReceived || !toToken || !priceData || parseFloat(minReceived) <= 0) {
      return null;
    }

    // Find price data for the to token
    const normalizedAddr = toToken.address.toLowerCase();
    let tokenPrice = null;

    // Try multiple address formats to find a match
    if (priceData[normalizedAddr]) {
      tokenPrice = priceData[normalizedAddr];
    } else if (normalizedAddr.length === 65) {
      const paddedAddr = '0x0' + normalizedAddr.slice(2);
      if (priceData[paddedAddr]) tokenPrice = priceData[paddedAddr];
    } else if (normalizedAddr.startsWith('0x0') && normalizedAddr.length === 66) {
      const unpaddedAddr = '0x' + normalizedAddr.slice(3);
      if (priceData[unpaddedAddr]) tokenPrice = priceData[unpaddedAddr];
    }

    if (!tokenPrice || tokenPrice.priceInUSD <= 0) {
      return null;
    }

    return getTokenUSDDisplay(minReceived, tokenPrice.priceInUSD, toToken.decimals);
  })();


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

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <motion.div 
        className="crypto-card p-4 mt-3"
        variants={variants.slideUp}
        initial="initial"
        animate="animate"
      >
        {/* Header with rate and toggle button */}
        <div className="flex justify-between items-center">
          <AnimatedNumber
            value={rateWithUsd ? (
              rateWithUsd.split(' (')[0] + ' (' + rateWithUsd.split(' (')[1]
            ) : rate}
            className="transaction-detail-value text-xs"
          />
          <motion.div
            whileTap={{ scale: 0.9 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className={`flex items-center gap-2 h-8 px-3 text-muted-foreground ${transitions.colors}`}
            >
              <span className="text-xs text-transaction-detail">
                {isExpanded ? 'Hide details' : 'Show details'}
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </Button>
          </motion.div>
        </div>

        {/* Collapsible content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              className=""
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-2 space-y-4">
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
              <AnimatedNumber value={`$${totalFeeAmount}`} className="transaction-detail-value" />
            </div>

            {parseFloat(minReceived) > 0 && (
              <div className="transaction-detail">
                <span className="transaction-detail-label">Min Received</span>
                <div className="transaction-detail-value">
                  <AnimatedNumber 
                    value={`${minReceived} ${toTokenSymbol}`}
                    className="" 
                  />
                  {minReceivedUsd && (
                    <span className="text-muted-foreground ml-1">
                      ≈ {minReceivedUsd}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="transaction-detail">
              <span className="transaction-detail-label">Slippage</span>
              <div className="flex gap-2">
                {presetSlippages.map((preset) => (
                  <motion.button
                    key={preset}
                    onClick={() => handleSlippageClick(preset)}
                    className={`percentage-button -mt-1.5 ${
                      slippage === preset ? 'bg-white text-black hover:bg-white' : ''
                    } ${transitions.default}`}
                    whileHover={hover.scale}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    {preset}%
                  </motion.button>
                ))}
              </div>
            </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </>
  );
};