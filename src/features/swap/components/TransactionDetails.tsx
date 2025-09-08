import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Info, User, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { useSwapStore } from '../store/swapStore';
import { useAnimations } from '@/shared/hooks/useAnimations';
import { AnimatedNumber } from '@/shared/components/ui/animated-number';

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
  const { variants, transitions, hover } = useAnimations();
  const { privacy, setRecipientAddress } = useSwapStore();
  const [tempAddress, setTempAddress] = useState(privacy.recipientAddress || walletAddress || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update tempAddress when wallet connects/disconnects or changes
  React.useEffect(() => {
    if (!privacy.recipientAddress && walletAddress) {
      setTempAddress(walletAddress);
      setRecipientAddress(walletAddress);
    } else if (privacy.recipientAddress && walletAddress && 
               privacy.recipientAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      // If stored address doesn't match current wallet, update it
      setTempAddress(walletAddress);
      setRecipientAddress(walletAddress);
    }
  }, [walletAddress, privacy.recipientAddress, setRecipientAddress]);

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

  const handleAddressChange = (value: string) => {
    setTempAddress(value);
    setRecipientAddress(value);
  };

  const handleUseWallet = () => {
    if (walletAddress) {
      setTempAddress(walletAddress);
      setRecipientAddress(walletAddress);
      setIsEditing(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
  };

  const displayAddress = tempAddress || walletAddress || '';
  const truncatedAddress = displayAddress 
    ? displayAddress.length > 16
      ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
      : displayAddress
    : '';
  
  const placeholderText = !displayAddress ? 'Enter recipient address' : '';
  
  // Hide recipient address row when it matches the wallet address (default behavior)
  // Use case-insensitive comparison and handle potential truncation issues
  const shouldHideRecipientRow = displayAddress && walletAddress && 
    displayAddress.toLowerCase() === walletAddress.toLowerCase();

  return (
    <>
      <motion.div 
        className="crypto-card px-4 py-4 mt-4"
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
            className="transaction-detail-value text-sm"
          />
          <motion.div
            whileTap={{ scale: 0.95 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className={`flex items-center gap-2 h-8 px-2 text-gray-400 hover:text-white ${transitions.colors}`}
            >
              <span className="text-xs text-transaction-detail">
                {isExpanded ? 'Hide details' : 'Show details'}
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        </div>

        {/* Collapsible content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              className=""
              variants={variants.expand}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-4 space-y-4">
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

            <div className="transaction-detail">
              <span className="transaction-detail-label">Min Received</span>
              <AnimatedNumber value={`${minReceived} ${toTokenSymbol}`} className="transaction-detail-value" />
            </div>

            <div className="transaction-detail">
              <span className="transaction-detail-label">Slippage</span>
              <div className="flex gap-1">
                {presetSlippages.map((preset) => (
                  <motion.button
                    key={preset}
                    onClick={() => handleSlippageClick(preset)}
                    className={`percentage-button -mt-1.5 ${
                      slippage === preset ? 'bg-white text-black hover:bg-white' : ''
                    } ${transitions.default}`}
                    whileHover={hover.scale}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    {preset}%
                  </motion.button>
                ))}
              </div>
            </div>

            {!shouldHideRecipientRow && (
              <div className="transaction-detail">
                <span className="transaction-detail-label">Recipient Address</span>
                <div className="flex items-center gap-2">
                  {!isEditing && displayAddress ? (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 flex-1">
                          <span 
                            className="transaction-detail-value cursor-pointer hover:text-white transition-colors"
                            onClick={handleEditClick}
                          >
                            {truncatedAddress}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditClick}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <span className="text-xs break-all">{displayAddress}</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Input
                      type="text"
                      placeholder={placeholderText}
                      value={tempAddress}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      className="h-8 px-2 py-1 bg-token-selector border-0 focus:ring-0 shadow-none text-xs font-medium min-w-0 flex-1"
                      autoFocus={isEditing}
                    />
                  )}
                </div>
              </div>
            )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </>
  );
};