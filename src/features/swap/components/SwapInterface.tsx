import { Settings } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useWalletConnection } from '@/features/wallet/hooks';
import { useSwapForm } from '../hooks';
import { WalletConnectionButton, WalletModal } from '@/features/wallet/components';
import { SwapCard } from './SwapCard';
import { SwapErrorBoundary } from './SwapErrorBoundary';

const SwapInterface = () => {
  const walletConnection = useWalletConnection();
  const swapForm = useSwapForm(walletConnection.address);



  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Top Header with Logo */}
      <div className="p-8">
        <img src="/PrivFi.svg" alt="PrivFi" className="h-6 w-auto" />
      </div>

      {/* Main Content Centered */}
      <div className="flex-1 flex items-center justify-center p-4 flex-col">
        <div className="w-full max-w-lg bg-[#1C1C1C] rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-white">Private Swap</span>
            </div>
            <div className="flex items-center">
              <WalletConnectionButton
                isConnected={walletConnection.isConnected}
                isConnecting={walletConnection.isConnecting}
                address={walletConnection.address}
                onConnect={() => walletConnection.setShowWalletModal(true)}
                onDisconnect={walletConnection.handleDisconnect}
              />
              <WalletModal
                isOpen={walletConnection.showWalletModal}
                onOpenChange={walletConnection.setShowWalletModal}
                connectors={walletConnection.connectors}
                onConnectWithConnector={walletConnection.handleConnectWithConnector}
                onConnectFallback={walletConnection.handleConnectFallback}
              />
            </div>
          </div>
          {/* Error Display */}
          {/* {walletConnection.connectError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-destructive">{walletConnection.connectError.message}</p>
          </div>
        )} */}

          {/* Main Swap Card */}
          <SwapErrorBoundary>
            <SwapCard
              fromAmount={swapForm.fromAmount}
              toAmount={swapForm.toAmount}
              percentageButtons={swapForm.percentageButtons}
              fromToken={swapForm.fromToken}
              toToken={swapForm.toToken}
              walletAddress={walletConnection.address}
              isValidTokenPair={swapForm.isValidTokenPair}
              onFromAmountChange={swapForm.setFromAmount}
              onToAmountChange={swapForm.setToAmount}
              onFromTokenChange={swapForm.setFromToken}
              onToTokenChange={swapForm.setToToken}
              onSwap={swapForm.handleSwap}
              onSwapDirection={swapForm.handleSwapDirection}
              onPercentageClick={swapForm.handlePercentageClick}
              // Quote-related props
              selectedQuote={swapForm.selectedQuote}
              formattedQuote={swapForm.formattedQuote}
              isLoadingQuotes={swapForm.isLoadingQuotes}
              quotesError={swapForm.quotesError}
              isQuoteExpired={swapForm.isQuoteExpired}
              timeToExpiry={swapForm.timeToExpiry}
              onRefreshQuotes={swapForm.refreshQuotes}
              // Slippage-related props
              slippage={swapForm.slippage}
              minReceived={swapForm.minReceived}
              onSlippageChange={swapForm.handleSlippageChange}
              // Swap execution props
              isExecutingSwap={swapForm.isExecutingSwap}
              isSwapSuccess={swapForm.isSwapSuccess}
              isSwapError={swapForm.isSwapError}
              swapError={swapForm.swapError}
              transactionHash={swapForm.transactionHash}
              onResetSwap={swapForm.resetSwap}
              // Estimating state
              isEstimatingAfterSwap={swapForm.isEstimatingAfterSwap}
              // Direction swap state
              isSwappingDirection={swapForm.isSwappingDirection}
              // Minimum amount validation
              minimumAmountValidation={swapForm.minimumAmountValidation}
            />
          </SwapErrorBoundary>
        </div>
        {/* Transaction Processing Warning */}
        {(
          <div className="flex items-center justify-center gap-2 text-xs px-24 py-3 sm:p-4">
            <span className="text-gray-400 text-center">Do not refresh or close this page while transaction is processing</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default SwapInterface;