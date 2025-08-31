import { useBalance } from '@starknet-react/core';
import { Token, formatBalanceForDisplay } from '@/constants/tokens';

export const useTokenBalance = (token: Token | null, address?: string) => {
  const {
    data,
    error,
    isLoading,
    refetch
  } = useBalance({
    token: token?.address,
    address: address,
    watch: true, // Refresh balance on new blocks
    enabled: !!token && !!address, // Only fetch when both token and address are available
  });

  // Format the balance for display with proper precision
  const rawFormatted = data?.formatted || '0.0';
  const symbol = data?.symbol || token?.symbol || '';
  const decimals = data?.decimals || token?.decimals || 18;
  const rawBalance = data?.value || BigInt(0);
  
  // Use our custom formatting function for better display
  const formattedBalance = formatBalanceForDisplay(rawFormatted, symbol);

  return {
    balance: formattedBalance,
    rawBalance,
    rawFormatted, // Keep the original formatted balance for calculations
    symbol,
    decimals,
    isLoading,
    error,
    refetch,
    hasBalance: rawBalance > BigInt(0),
  };
};