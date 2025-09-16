import { useWalletConnection } from '@/features/wallet/hooks';
import { useDepositForm, useDepositExecution } from '../hooks';
import { WalletConnectionButton, WalletModal } from '@/features/wallet/components';
import { DepositCard } from './DepositCard';
import { DepositErrorBoundary } from './DepositErrorBoundary';
import { useTokenPrices } from '@/shared/hooks';

const DepositInterface = () => {
  const walletConnection = useWalletConnection();
  const depositForm = useDepositForm(walletConnection.address);
  const depositExecution = useDepositExecution();

  // Fetch price data for the selected token
  const { data: priceData } = useTokenPrices([depositForm.token.address]);

  const handleDeposit = () => {
    if (!walletConnection.address || !depositForm.isValidForDeposit) {
      return;
    }

    depositExecution.executeDeposit(
      depositForm.amount,
      depositForm.token.address,
      depositForm.token.decimals,
      walletConnection.address
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 flex-col">
      <div className="w-full max-w-md rounded-xl pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-normal text-white pl-2">Private Deposit</span>
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
      </div>
      <div className="w-full max-w-md bg-[#1C1C1C] rounded-xl p-3">
        {/* Main Deposit Card */}
        <DepositErrorBoundary>
          <DepositCard
            amount={depositForm.amount}
            token={depositForm.token}
            walletAddress={walletConnection.address}
            priceData={priceData}
            onAmountChange={depositForm.setAmount}
            onTokenChange={depositForm.setToken}
            onDeposit={handleDeposit}
            // Deposit execution props
            isExecutingDeposit={depositExecution.isLoading}
            isDepositSuccess={depositExecution.isSuccess}
            isDepositError={depositExecution.isError}
            depositError={depositExecution.error}
            transactionHash={depositExecution.transactionHash}
            onResetDeposit={depositExecution.reset}
            // Validation props
            minimumAmountValidation={depositForm.minimumAmountValidation}
            isValidForDeposit={depositForm.isValidForDeposit}
          />
        </DepositErrorBoundary>
      </div>
      {/* Transaction Processing Warning */}
      <div className="flex flex-col items-center justify-center gap-2 text-xs px-24 py-3 sm:p-4">
        <span className="text-muted-foreground opacity-50 text-center">
          Do not refresh or close this page while transaction is processing
        </span>
        <span className="text-muted-foreground opacity-50 text-center">
          Powered by Typhoon Privacy Protocol
        </span>
      </div>
    </div>
  );
};

export default DepositInterface;