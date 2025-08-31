export const calculateUSDValue = (
  amount: string | number,
  priceInUSD: number,
  tokenDecimals: number = 18
): number => {
  if (!amount || !priceInUSD) return 0;
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount) || numericAmount <= 0) return 0;
  
  return numericAmount * priceInUSD;
};

export const formatUSDValue = (usdValue: number): string => {
  if (usdValue === 0) return '~$0.00';
  
  if (usdValue < 0.01) {
    return '< $0.01';
  }
  
  if (usdValue < 1) {
    return `~$${usdValue.toFixed(3)}`;
  }
  
  if (usdValue < 1000) {
    return `~$${usdValue.toFixed(2)}`;
  }
  
  if (usdValue < 1000000) {
    return `~$${(usdValue / 1000).toFixed(1)}K`;
  }
  
  return `~$${(usdValue / 1000000).toFixed(1)}M`;
};

export const getTokenUSDDisplay = (
  amount: string,
  priceInUSD: number,
  tokenDecimals: number = 18
): string => {
  const usdValue = calculateUSDValue(amount, priceInUSD, tokenDecimals);
  return formatUSDValue(usdValue);
};