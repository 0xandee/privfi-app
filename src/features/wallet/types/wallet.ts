export interface WalletConnectionState {
  isConnecting: boolean;
  showWalletModal: boolean;
  isConnected: boolean;
  address?: string;
  balance: string;
  connectError?: Error;
}

export interface WalletActions {
  setShowWalletModal: (show: boolean) => void;
  handleConnectWithConnector: (connector: any) => Promise<void>;
  handleConnectFallback: () => Promise<void>;
  handleDisconnect: () => void;
}

export interface WalletConnection extends WalletConnectionState, WalletActions {
  connectors: any[];
}

export interface WalletProvider {
  name: string;
  icon?: string;
  description?: string;
  isAvailable: boolean;
  connect: () => Promise<void>;
}