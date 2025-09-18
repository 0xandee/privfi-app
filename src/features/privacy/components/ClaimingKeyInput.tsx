import React, { useState } from 'react';
import { Eye, EyeOff, Copy, RefreshCw, HelpCircle, Shield } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { secretManager } from '../services';

interface ClaimingKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showGenerator?: boolean;
  showStrengthIndicator?: boolean;
  required?: boolean;
  error?: string;
}

export const ClaimingKeyInput: React.FC<ClaimingKeyInputProps> = ({
  value,
  onChange,
  onGenerate,
  placeholder = 'Enter your claiming key',
  disabled = false,
  showGenerator = false,
  showStrengthIndicator = false,
  required = false,
  error,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = secretManager.sanitizeClaimingKey(e.target.value);
    onChange(sanitized);
  };

  const handleCopy = async () => {
    if (!value) return;
    const success = await secretManager.copyToClipboard(value);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="claiming-key" className="text-sm font-medium">
          Claiming Key {required && <span className="text-red-500">*</span>}
        </Label>
      </div>

      <div className="relative">
        <Input
          id="claiming-key"
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-20 font-mono ${error ? 'border-red-500' : ''}`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleCopy}
              disabled={disabled}
            >
              <Copy className={`h-4 w-4 ${copySuccess ? 'text-green-500' : ''}`} />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowKey(!showKey)}
            disabled={disabled}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {showGenerator && onGenerate && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={disabled}
          className="w-full"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Generate Random Key
        </Button>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};