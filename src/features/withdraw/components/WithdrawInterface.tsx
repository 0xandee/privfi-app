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
        <div className="flex items-center justify-between mb-6">
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

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-blue-400 font-medium mb-2">How Typhoon Withdraw Works</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Enter the transaction hash from your deposit</li>
            <li>• Split withdrawal between multiple addresses for enhanced privacy</li>
            <li>• Transactions are executed by Typhoon paymaster</li>
            <li>• Network fees are covered automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WithdrawInterface;