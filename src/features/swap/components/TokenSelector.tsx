import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/components/ui/select';
import { STARKNET_TOKENS, DEFAULT_TOKENS, Token } from '@/constants/tokens';

interface TokenSelectorProps {
  selectedToken: Token;
  onTokenChange: (token: Token) => void;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenChange,
}) => {
  const handleValueChange = (tokenSymbol: string) => {
    const token = STARKNET_TOKENS[tokenSymbol];
    if (token) {
      onTokenChange(token);
    }
  };

  return (
    <Select value={selectedToken.symbol} onValueChange={handleValueChange}>
      <SelectTrigger className="token-selector w-[6.5rem] border-0 focus:ring-0 shadow-none !bg-token-selector">
        <div className="flex items-center gap-2">
          {selectedToken.logoURI && (
            <img 
              src={selectedToken.logoURI} 
              alt={selectedToken.symbol} 
              className="w-4 h-4 rounded-full"
            />
          )}
          <span className="font-medium">{selectedToken.symbol}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-0">
        {DEFAULT_TOKENS.map((tokenSymbol) => {
            const token = STARKNET_TOKENS[tokenSymbol];
            return (
              <SelectItem key={token.symbol} value={token.symbol} className="cursor-pointer [&>span:first-child]:hidden pl-3">
                <div className="flex items-center gap-2 w-full">
                  {token.logoURI && (
                    <img 
                      src={token.logoURI} 
                      alt={token.symbol} 
                      className="w-4 h-4 rounded-full"
                    />
                  )}
                  <span className="font-medium">{token.symbol}</span>
                </div>
              </SelectItem>
            );
          })}
      </SelectContent>
    </Select>
  );
};