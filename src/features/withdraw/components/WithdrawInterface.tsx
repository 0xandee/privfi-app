import { useWalletConnection } from '@/features/wallet/hooks';
import { WalletConnectionButton, WalletModal } from '@/features/wallet/components';
import { useWithdrawForm, useWithdrawExecution } from '../hooks';
import { WithdrawTable } from './WithdrawTable';
import { WithdrawCard } from './WithdrawCard';
import { WithdrawErrorBoundary } from './WithdrawErrorBoundary';
import type { GroupedDeposits } from '../types';

const WithdrawInterface = () => {
  const walletConnection = useWalletConnection();
  const withdrawForm = useWithdrawForm({ walletAddress: walletConnection.address });
  const withdrawExecution = useWithdrawExecution();

  const handleWithdrawToken = (tokenAddress: string, group: GroupedDeposits) => {
    // Select all withdrawable deposits for this token
    const depositIds = group.deposits
      .filter(d => d.canWithdraw)
      .map(d => d.id);

    withdrawForm.setSelectedDeposits(depositIds);
  };

  const handleWithdraw = async () => {
    if (!walletConnection.address || !withdrawForm.canWithdraw) {
      return;
    }

    try {
      await withdrawExecution.executeWithdraw({
        depositIds: withdrawForm.formData.selectedDeposits,
        recipientAddress: withdrawForm.formData.recipientAddress,
        walletAddress: walletConnection.address,
      });

      // Refresh deposits after successful withdrawal
      await withdrawForm.refreshDeposits();
    } catch (error) {
      // Error is already handled in the execution hook
      console.error('Withdrawal failed:', error);
    }
  };

  const handleReset = () => {
    withdrawExecution.reset();
    withdrawForm.clearSelection();
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-normal text-white pl-2">Withdraw Deposits</span>
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

      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Withdrawable Deposits Table */}
        <WithdrawErrorBoundary>
          <WithdrawTable
            groupedDeposits={withdrawForm.groupedDeposits}
            selectedDepositIds={withdrawForm.formData.selectedDeposits}
            isLoading={withdrawForm.isLoadingDeposits}
            onWithdrawToken={handleWithdrawToken}
            onSelectDeposits={withdrawForm.setSelectedDeposits}
          />
        </WithdrawErrorBoundary>

        {/* Withdrawal Form */}
        <div className="flex justify-center">
          <WithdrawErrorBoundary>
            <WithdrawCard
              formData={withdrawForm.formData}
              execution={{
                isLoading: withdrawExecution.isLoading,
                isSuccess: withdrawExecution.isSuccess,
                isError: withdrawExecution.isError,
                error: withdrawExecution.error,
                transactionHash: withdrawExecution.transactionHash,
                withdrawalRecord: withdrawExecution.withdrawalRecord,
              }}
              walletAddress={walletConnection.address}
              onRecipientAddressChange={withdrawForm.setRecipientAddress}
              onWithdraw={handleWithdraw}
              onReset={handleReset}
            />
          </WithdrawErrorBoundary>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="flex flex-col items-center justify-center gap-2 text-xs px-24 py-6 sm:p-4 max-w-4xl mx-auto">
        <span className="text-muted-foreground opacity-50 text-center">
          Do not refresh or close this page while withdrawal is processing
        </span>
        <span className="text-muted-foreground opacity-50 text-center">
          Powered by Typhoon Privacy Protocol - Your withdrawals are completely private
        </span>
      </div>
    </div>
  );
};

export default WithdrawInterface;