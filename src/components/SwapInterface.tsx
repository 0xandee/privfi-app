import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useSwapForm } from '@/hooks/useSwapForm';
import { WalletConnectionButton } from '@/components/wallet/WalletConnectionButton';
import { WalletModal } from '@/components/wallet/WalletModal';
import { SwapCard } from '@/components/swap/SwapCard';

const SwapInterface = () => {
  const walletConnection = useWalletConnection();
  const swapForm = useSwapForm();

  const handlePercentageClick = (percentage: number) => {
    swapForm.handlePercentageClick(percentage, walletConnection.balance);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg bg-[#1C1C1C] rounded-xl p-6">
        <div className="flex items-center justify-end gap-2 mb-6">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
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
        {/* Error Display */}
        {/* {walletConnection.connectError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-destructive">{walletConnection.connectError.message}</p>
          </div>
        )} */}
        
        {/* Main Swap Card */}
        <SwapCard
          fromAmount={swapForm.fromAmount}
          toAmount={swapForm.toAmount}
          balance={walletConnection.balance}
          percentageButtons={swapForm.percentageButtons}
          onFromAmountChange={swapForm.setFromAmount}
          onToAmountChange={swapForm.setToAmount}
          onPercentageClick={handlePercentageClick}
          onSwap={swapForm.handleSwap}
        />
      </div>
    </div>
  );
};

export default SwapInterface;