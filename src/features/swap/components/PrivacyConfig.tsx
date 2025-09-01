import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { useSwapStore } from '../store/swapStore';

interface PrivacyConfigProps {
  walletAddress?: string;
}

export const PrivacyConfig: React.FC<PrivacyConfigProps> = ({ walletAddress }) => {
  const { privacy, setRecipientAddress } = useSwapStore();
  const [tempAddress, setTempAddress] = useState(privacy.recipientAddress);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setRecipientAddress(tempAddress);
    setIsEditing(false);
  };

  const handleUseWallet = () => {
    if (walletAddress) {
      setTempAddress(walletAddress);
      setRecipientAddress(walletAddress);
      setIsEditing(false);
    }
  };

  const displayAddress = privacy.recipientAddress || walletAddress || 'Not set';
  const truncatedAddress = displayAddress.length > 20 
    ? `${displayAddress.slice(0, 8)}...${displayAddress.slice(-8)}`
    : displayAddress;

  return (
    <div className="crypto-card px-4 py-4 mt-4 space-y-4">
      <div className="transaction-detail">
        <span className="transaction-detail-label">Recipient Address</span>
        {!isEditing ? (
          <div className="flex items-center gap-2">
            <span className="transaction-detail-value text-sm">
              {truncatedAddress}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="percentage-button px-2 py-1 text-xs"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Enter recipient address"
              value={tempAddress}
              onChange={(e) => setTempAddress(e.target.value)}
              className="token-input text-sm h-8 py-1"
              style={{ fontSize: '12px' }}
            />
          </div>
        )}
      </div>
      
      {isEditing && (
        <div className="flex gap-2 justify-end">
          {walletAddress && (
            <button
              onClick={handleUseWallet}
              className="percentage-button flex items-center gap-1 px-2 py-1 text-xs"
            >
              <User className="h-3 w-3" />
              Use My Wallet
            </button>
          )}
          <button
            onClick={handleSave}
            className="percentage-button px-2 py-1 text-xs"
          >
            Save
          </button>
          <button
            onClick={() => {
              setTempAddress(privacy.recipientAddress);
              setIsEditing(false);
            }}
            className="percentage-button px-2 py-1 text-xs"
          >
            Cancel
          </button>
        </div>
      )}
      
      <p className="text-xs text-transaction-detail">
        If no address is specified, tokens will be privately sent to your connected wallet address.
      </p>
    </div>
  );
};