import React, { useState } from 'react';
import { Settings, ArrowUpDown, ChevronDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { connect as getStarknetConnect } from '@starknet-io/get-starknet';

const SwapInterface = () => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, status } = useConnect();
  const { disconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const balance = '0.0000'; // TODO: Implement balance fetching with useBalance hook

  // Debug logging
  console.log('Wallet Debug:', {
    isConnected,
    address,
    connectError,
    status,
    connectorsCount: connectors.length,
    connectors: connectors.map(c => ({ id: c.id, name: c.name }))
  });

  const percentageButtons = [25, 50, 75, 100];

  const handlePercentageClick = (percentage: number) => {
    // Calculate percentage of balance
    const balanceNum = parseFloat(balance);
    const amount = (balanceNum * percentage) / 100;
    setFromAmount(amount.toFixed(6));
  };

  const handleConnectWithConnector = async (selectedConnector: typeof connectors[0]) => {
    console.log('Connecting with connector:', selectedConnector);
    setIsConnecting(true);
    setShowWalletModal(false);
    
    try {
      connect({ connector: selectedConnector });
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setTimeout(() => setIsConnecting(false), 2000);
    }
  };

  const handleConnectFallback = async () => {
    console.log('Using get-starknet fallback connection');
    setIsConnecting(true);
    setShowWalletModal(false);
    
    try {
      const wallet = await getStarknetConnect();
      console.log('get-starknet result:', wallet);
      if (wallet) {
        console.log('Wallet connected via get-starknet');
      }
    } catch (error) {
      console.error('get-starknet connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      {/* Header */}
      {/* <div className="crypto-card p-4 mb-4 w-full max-w-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'swap'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setActiveTab('swap')}
            >
              Swap
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium text-muted-foreground opacity-50 cursor-not-allowed"
              disabled
            >
              DCA <span className="text-xs ml-1">(Coming Soon)</span>
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium text-muted-foreground opacity-50 cursor-not-allowed"
              disabled
            >
              Bridge <span className="text-xs ml-1">(Coming Soon)</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isConnected ? "outline" : "default"}
              size="sm"
              onClick={isConnected ? disconnectWallet : connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? 'Connecting...' : isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect Wallet'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div> */}


      <div className="w-full max-w-lg bg-[#1C1C1C] rounded-xl p-6">
        <div className="flex items-center justify-end gap-2 mb-6">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
          {!isConnected ? (
            <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={isConnecting}
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect Wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {connectors.map((connector) => (
                    <Button
                      key={connector.id}
                      variant="outline"
                      className="w-full justify-start h-12"
                      onClick={() => handleConnectWithConnector(connector)}
                    >
                      <Wallet className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">{connector.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {connector.id === 'argentX' ? 'Argent X Wallet' : 
                           connector.id === 'braavos' ? 'Braavos Wallet' : connector.id}
                        </div>
                      </div>
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12"
                    onClick={handleConnectFallback}
                  >
                    <Wallet className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Auto-detect Wallet</div>
                      <div className="text-sm text-muted-foreground">
                        Connect with any available wallet
                      </div>
                    </div>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="flex items-center gap-2"
            >
              <Wallet className="h-4 w-4" />
              {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
            </Button>
          )}
        </div>
        {/* Error Display */}
        {connectError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-destructive">{connectError.message}</p>
          </div>
        )}
        {/* Main Swap Card */}
        <div className="crypto-card px-4 py-6 space-y-4">
          {/* From Token Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">From</span>
              <span className="text-sm text-muted-foreground">Balance: {balance}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="token-input flex-1"
                  placeholder="0.0"
                />
                <div className="token-selector">
                  {/* <img src={ethLogo} alt="ETH" className="w-6 h-6" /> */}
                  <span className="font-medium">ETH</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">~$0.00</span>
                <div className="flex gap-2">
                  {percentageButtons.map((percentage) => (
                    <button
                      key={percentage}
                      onClick={() => handlePercentageClick(percentage)}
                      className="percentage-button"
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Swap Direction with Separator */}
          <div className="relative flex justify-center py-2 -mx-6">
            {/* Separator line going through button */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#1C1C1C] transform -translate-y-1/2"></div>
            <button className="w-10 h-10 bg-[#1C1C1C] text-percentage-button-foreground rounded-md hover:bg-percentage-button-hover transition-colors cursor-pointer text-sm font-medium relative z-10 flex items-center justify-center">
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>

          {/* To Token Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">To</span>
              <span className="text-sm text-muted-foreground">Balance: {balance}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={toAmount}
                  onChange={(e) => setToAmount(e.target.value)}
                  className="token-input flex-1"
                  placeholder="0.0"
                />
                <div className="token-selector">
                  {/* <img src={strkLogo} alt="STRK" className="w-6 h-6" /> */}
                  <span className="font-medium">STRK</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">~$0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        {/* <div className="crypto-card p-4 mt-4 space-y-3">
          <div className="transaction-detail">
            <span className="transaction-detail-label">Price</span>
            <span className="transaction-detail-value">1 ETH = 34,300.62147 STRK ≈ $4,393.31</span>
          </div>

          <div className="transaction-detail">
            <span className="transaction-detail-label">Service fee</span>
            <span className="transaction-detail-value">0.02%</span>
          </div>

          <div className="transaction-detail">
            <span className="transaction-detail-label">Minimum received</span>
            <span className="transaction-detail-value">14.812037 STRK</span>
          </div>

          <div className="transaction-detail">
            <span className="transaction-detail-label">Maximum slippage</span>
            <span className="transaction-detail-value">0.5%</span>
          </div>
        </div> */}

        {/* Swap Button */}
        <div className="mt-6 space-y-3">
          <Button className="swap-button">
            Swap
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SwapInterface;