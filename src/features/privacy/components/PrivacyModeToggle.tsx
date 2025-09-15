import React from 'react';
import { Shield, ShieldOff } from 'lucide-react';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { usePrivacyStore } from '../store/privacyStore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

export const PrivacyModeToggle: React.FC = () => {
  const { isPrivacyModeEnabled, setPrivacyMode } = usePrivacyStore();

  return (
    <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center space-x-2 flex-1">
        {isPrivacyModeEnabled ? (
          <Shield className="h-5 w-5 text-green-500" />
        ) : (
          <ShieldOff className="h-5 w-5 text-muted-foreground" />
        )}
        <Label htmlFor="privacy-mode" className="cursor-pointer">
          Enhanced Privacy Mode
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground text-sm cursor-help">ⓘ</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>
              Enable enhanced privacy mode to route swaps through a proxy wallet,
              breaking the on-chain link between your wallet and the DEX.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Note: Privacy swaps take 3-5 minutes and cannot be cancelled once started.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <Switch
        id="privacy-mode"
        checked={isPrivacyModeEnabled}
        onCheckedChange={setPrivacyMode}
      />
    </div>
  );
};