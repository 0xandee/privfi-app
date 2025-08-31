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

  const ArgentIcon = () => (
    <svg width="24" height="22" viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24.7582 -3.97364e-07H14.6238C14.2851 -3.97364e-07 14.0138 0.281178 14.0064 0.630683C13.8017 10.4549 8.82234 19.7792 0.251893 26.3837C-0.0202046 26.5933 -0.0821946 26.9872 0.116734 27.2709L6.04623 35.734C6.24796 36.022 6.64099 36.087 6.91766 35.8754C12.2765 31.7728 16.5869 26.8236 19.691 21.338C22.7951 26.8236 27.1057 31.7728 32.4646 35.8754C32.741 36.087 33.1341 36.022 33.3361 35.734L39.2656 27.2709C39.4642 26.9872 39.4022 26.5933 39.1304 26.3837C30.5597 19.7792 25.5804 10.4549 25.3759 0.630683C25.3685 0.281178 25.0969 -3.97364e-07 24.7582 -3.97364e-07Z" fill="#FF875B" />
    </svg>
  );

  const BraavosIcon = () => (
    <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M62.705 13.9116C62.8359 14.1333 62.6621 14.407 62.4039 14.407C57.1807 14.407 52.9348 18.5427 52.8351 23.6817C51.0465 23.3477 49.1933 23.3226 47.3626 23.6311C47.2361 18.5156 43.0009 14.407 37.7948 14.407C37.5365 14.407 37.3625 14.1331 37.4935 13.9112C40.0217 9.62809 44.7204 6.75 50.0991 6.75C55.4781 6.75 60.1769 9.62826 62.705 13.9116Z"
        fill="url(#paint0_linear_372_40259)" />
      <path
        d="M78.7606 45.8718C80.2725 46.3297 81.7025 45.0055 81.1714 43.5222C76.4137 30.2334 61.3911 24.8039 50.0277 24.8039C38.6442 24.8039 23.2868 30.407 18.8754 43.5912C18.3824 45.0645 19.8083 46.3446 21.2978 45.8881L48.872 37.4381C49.5331 37.2355 50.2399 37.2344 50.9017 37.4348L78.7606 45.8718Z"
        fill="url(#paint1_linear_372_40259)" />
      <path
        d="M18.8132 48.1707L48.8935 39.0472C49.5506 38.8478 50.2524 38.8473 50.9098 39.0456L81.1781 48.1752C83.6912 48.9332 85.411 51.2483 85.411 53.8735V81.2233C85.2944 87.8991 79.2977 93.25 72.6245 93.25H61.5406C60.4449 93.25 59.5577 92.3637 59.5577 91.268V81.6789C59.5577 77.9031 61.7921 74.4855 65.2498 72.9729C69.8849 70.9454 75.3681 68.2028 76.3994 62.6992C76.7323 60.9229 75.5741 59.2094 73.8024 58.8573C69.3226 57.9667 64.3562 58.3107 60.1564 60.1893C55.3887 62.3219 54.1415 65.8694 53.6797 70.6337L53.1201 75.7662C52.9491 77.3349 51.4785 78.5366 49.9014 78.5366C48.2699 78.5366 47.0465 77.294 46.8696 75.6712L46.3204 70.6337C45.9249 66.5529 45.2079 62.5887 40.9895 60.7018C36.1776 58.5494 31.3419 57.8347 26.1976 58.8573C24.426 59.2094 23.2678 60.9229 23.6007 62.6992C24.641 68.2507 30.0812 70.9305 34.7503 72.9729C38.208 74.4855 40.4424 77.9031 40.4424 81.6789V91.2663C40.4424 92.362 39.5555 93.25 38.4599 93.25H27.3756C20.7024 93.25 14.7057 87.8991 14.5891 81.2233V53.8663C14.5891 51.2446 16.3045 48.9316 18.8132 48.1707Z"
        fill="url(#paint2_linear_372_40259)" />
      <defs>
        <linearGradient id="paint0_linear_372_40259" x1="49.3057" y1="2.079" x2="80.3627" y2="93.6597"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5D45E" />
          <stop offset="1" stopColor="#FF9600" />
        </linearGradient>
        <linearGradient id="paint1_linear_372_40259" x1="49.3057" y1="2.079" x2="80.3627" y2="93.6597"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5D45E" />
          <stop offset="1" stopColor="#FF9600" />
        </linearGradient>
        <linearGradient id="paint2_linear_372_40259" x1="49.3057" y1="2.079" x2="80.3627" y2="93.6597"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5D45E" />
          <stop offset="1" stopColor="#FF9600" />
        </linearGradient>
      </defs>
    </svg>
  );

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
                      <div className="mr-3">
                        {connector.id === 'argentX' ? <ArgentIcon /> :
                          connector.id === 'braavos' ? <BraavosIcon /> :
                            <Wallet className="h-5 w-5" />}
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{connector.name}</div>
                        {/* <div className="text-sm text-muted-foreground">
                          {connector.id === 'argentX' ? 'Argent X Wallet' :
                            connector.id === 'braavos' ? 'Braavos Wallet' : connector.id}
                        </div> */}
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
                      <div className="font-medium">Other wallets</div>
                      {/* <div className="text-sm text-muted-foreground">
                        Connect with any available wallet
                      </div> */}
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