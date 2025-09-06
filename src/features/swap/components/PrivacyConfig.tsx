import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { useSwapStore } from '../store/swapStore';

interface PrivacyConfigProps {
  walletAddress?: string;
}

export const PrivacyConfig: React.FC<PrivacyConfigProps> = ({ walletAddress }) => {
  const { privacy, setRecipientAddress } = useSwapStore();
  const [tempAddress, setTempAddress] = useState(privacy.recipientAddress || '');

  const handleAddressChange = (value: string) => {
    setTempAddress(value);
    setRecipientAddress(value);
  };

  const handleUseWallet = () => {
    if (walletAddress) {
      setTempAddress(walletAddress);
      setRecipientAddress(walletAddress);
    }
  };

  const displayAddress = privacy.recipientAddress || walletAddress || '';
  const placeholderText = walletAddress 
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)} (default)`
    : 'Enter recipient address';

  return (
    <div className="crypto-card px-4 py-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recipient-address" className="text-white">
          Recipient Address
        </Label>
        <div className="flex gap-2">
          <Input
            id="recipient-address"
            type="text"
            placeholder={placeholderText}
            value={tempAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            className="token-input text-sm flex-1"
          />
          {walletAddress && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseWallet}
              className="text-xs flex items-center gap-1 px-3"
            >
              <User className="h-3 w-3" />
              Use Wallet
            </Button>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-400">
        If no address is specified, tokens will be privately sent to your connected wallet address.
      </p>
    </div>
  );
};