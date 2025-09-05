import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { useWalletConnection } from '@/features/wallet/hooks';
import { WalletConnectionButton, WalletModal } from '@/features/wallet/components';
import WithdrawCard from './WithdrawCard';

const WithdrawInterface = () => {
  const navigate = useNavigate();
  const walletConnection = useWalletConnection();

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg bg-[#1C1C1C] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white p-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium text-white">Private Withdraw</span>
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

        {/* Main Withdraw Card */}
        <WithdrawCard 
          walletAddress={walletConnection.address}
          isConnected={walletConnection.isConnected}
        />

      </div>
    </div>
  );
};

export default WithdrawInterface;