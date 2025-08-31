import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
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
      <SelectTrigger className="token-selector w-auto min-w-fit border-0 focus:ring-0 shadow-none !bg-token-selector">
        <span className="font-medium">{selectedToken.symbol}</span>
      </SelectTrigger>
      <SelectContent className="min-w-[200px]">
        {DEFAULT_TOKENS.map((tokenSymbol) => {
          const token = STARKNET_TOKENS[tokenSymbol];
          return (
            <SelectItem key={token.symbol} value={token.symbol} className="cursor-pointer">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{token.symbol}</span>
                <span className="text-sm text-muted-foreground ml-2">{token.name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};