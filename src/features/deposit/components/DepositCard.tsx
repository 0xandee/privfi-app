import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TokenInput } from '@/features/swap/components/TokenInput';
import { LoadingButton } from '@/shared/components/ui/loading-button';
import { Token } from '@/constants/tokens';
import { useTokenBalance } from '@/shared/hooks';
import { ErrorMessage } from '@/shared/components/ui/error-message';
import { MinimumDepositValidation } from '../types';
import { useAnimations } from '@/shared/hooks/useAnimations';
import { TokenPrice } from '@/shared/hooks/useTokenPrices';

interface DepositCardProps {
  amount: string;
  token: Token;
  walletAddress?: string;
  priceData?: { [address: string]: TokenPrice };
  onAmountChange: (value: string) => void;
  onTokenChange: (token: Token) => void;
  onDeposit: () => void;

  // Deposit execution props
  isExecutingDeposit?: boolean;
  isDepositSuccess?: boolean;
  isDepositError?: boolean;
  depositError?: Error | null;
  transactionHash?: string | null;
  onResetDeposit?: () => void;

  // Validation props
  minimumAmountValidation?: MinimumDepositValidation;
  isValidForDeposit?: boolean;
}

export const DepositCard: React.FC<DepositCardProps> = ({
  amount,
  token,
  walletAddress,
  priceData,
  onAmountChange,
  onTokenChange,
  onDeposit,
  isExecutingDeposit = false,
  isDepositSuccess = false,
  isDepositError = false,
  depositError,
  transactionHash,
  onResetDeposit,
  minimumAmountValidation,
  isValidForDeposit = false,
}) => {
  const { isSlideAnimationEnabled } = useAnimations();
  const { balance, rawFormatted, isLoading: isLoadingBalance } = useTokenBalance(token, walletAddress);

  // Determine button state and text
  const { buttonText, buttonVariant, canExecuteDeposit } = useMemo(() => {
    if (isDepositSuccess) {
      return {
        buttonText: 'Deposit Successful',
        buttonVariant: 'default' as const,
        canExecuteDeposit: false,
      };
    }

    if (isDepositError) {
      return {
        buttonText: 'Retry Deposit',
        buttonVariant: 'destructive' as const,
        canExecuteDeposit: true,
      };
    }

    if (isExecutingDeposit) {
      return {
        buttonText: 'Processing Deposit...',
        buttonVariant: 'default' as const,
        canExecuteDeposit: false,
      };
    }

    if (!walletAddress) {
      return {
        buttonText: 'Connect Wallet',
        buttonVariant: 'default' as const,
        canExecuteDeposit: false,
      };
    }

    // Check if amount exceeds balance
    if (amount && balance && parseFloat(amount) > parseFloat(rawFormatted || '0')) {
      return {
        buttonText: 'Insufficient Balance',
        buttonVariant: 'destructive' as const,
        canExecuteDeposit: false,
      };
    }

    if (!isValidForDeposit) {
      return {
        buttonText: 'Enter Amount',
        buttonVariant: 'default' as const,
        canExecuteDeposit: false,
      };
    }

    return {
      buttonText: 'Deposit',
      buttonVariant: 'default' as const,
      canExecuteDeposit: true,
    };
  }, [isDepositSuccess, isDepositError, isExecutingDeposit, walletAddress, isValidForDeposit, amount, balance, rawFormatted]);

  const handleDepositClick = () => {
    if (isDepositError && onResetDeposit) {
      onResetDeposit();
    }
    if (canExecuteDeposit) {
      onDeposit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Deposit Input */}
      <TokenInput
        label="Deposit Amount"
        selectedToken={token}
        amount={amount}
        balance={balance}
        isLoadingBalance={isLoadingBalance}
        priceData={priceData}
        onAmountChange={onAmountChange}
        onTokenChange={onTokenChange}
        showPercentageButtons={false}
        readOnly={isExecutingDeposit}
        disableBalanceValidation={false}
      />

      {/* Minimum Amount Warning */}
      {minimumAmountValidation && !minimumAmountValidation.isValid && amount && (
        <motion.div
          initial={isSlideAnimationEnabled ? { opacity: 0, y: -10 } : false}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3"
        >
          <p className="text-xs text-yellow-400">
            {minimumAmountValidation.errorMessage}
          </p>
        </motion.div>
      )}

      {/* Deposit Information */}
      {amount && isValidForDeposit && (
        <motion.div
          initial={isSlideAnimationEnabled ? { opacity: 0, y: -10 } : false}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-2"
        >
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Deposit Amount:</span>
            <span className="text-white">{amount} {token.symbol}</span>
          </div>
          {minimumAmountValidation && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Minimum:</span>
              <span className="text-white">{minimumAmountValidation.minimumAmount} {token.symbol}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Error Display */}
      {isDepositError && depositError && (
        <ErrorMessage
          title="Deposit Failed"
          message={depositError.message}
        />
      )}

      {/* Success Display */}
      {isDepositSuccess && transactionHash && (
        <motion.div
          initial={isSlideAnimationEnabled ? { opacity: 0, y: -10 } : false}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 space-y-2"
        >
          <p className="text-xs text-green-400 font-medium">Deposit Successful!</p>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Transaction Hash:</span>
            <span className="text-white font-mono text-[10px]">
              {transactionHash.slice(0, 8)}...{transactionHash.slice(-8)}
            </span>
          </div>
          <p className="text-xs text-green-400">
            Your tokens are now privately deposited. Save your deposit details for future withdrawals.
          </p>
        </motion.div>
      )}

      {/* Deposit Button */}
      <LoadingButton
        loading={isExecutingDeposit}
        disabled={!canExecuteDeposit && !isDepositError}
        onClick={handleDepositClick}
        variant={buttonVariant}
        className="w-full h-12 text-sm font-medium"
      >
        {buttonText}
      </LoadingButton>

      {/* Warning Text */}
      {(isExecutingDeposit || isDepositSuccess) && (
        <div className="text-center text-xs text-muted-foreground">
          <p>Do not refresh or close this page during deposit processing</p>
        </div>
      )}
    </div>
  );
};