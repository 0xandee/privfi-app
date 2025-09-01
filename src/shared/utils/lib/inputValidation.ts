export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  sanitizedValue?: string;
}

export const validateTokenInput = (
  input: string,
  maxDecimals: number = 18,
  maxBalance?: string
): ValidationResult => {
  // Handle empty input
  if (!input || input.trim() === '') {
    return { isValid: true, sanitizedValue: '' };
  }

  // Remove any non-numeric characters except decimal point
  const sanitized = input.replace(/[^0-9.]/g, '');
  
  // Check for multiple decimal points
  const decimalCount = (sanitized.match(/\./g) || []).length;
  if (decimalCount > 1) {
    return { 
      isValid: false, 
      error: 'Invalid number format',
      sanitizedValue: sanitized.replace(/\.(?=.*\.)/g, '') // Remove extra decimals
    };
  }
  
  // Handle leading decimal point
  const normalizedInput = sanitized.startsWith('.') ? '0' + sanitized : sanitized;
  
  // Validate it's a valid number
  const num = parseFloat(normalizedInput);
  if (isNaN(num)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  // Check for negative numbers
  if (num < 0) {
    return { isValid: false, error: 'Amount must be positive' };
  }
  
  // Check decimal places
  const decimalPart = normalizedInput.split('.')[1];
  if (decimalPart && decimalPart.length > maxDecimals) {
    return { 
      isValid: false, 
      error: `Maximum ${maxDecimals} decimal places allowed`,
      sanitizedValue: num.toFixed(maxDecimals)
    };
  }
  
  // Check against maximum balance - use warning instead of error to allow quotes
  if (maxBalance) {
    const maxBalanceNum = parseFloat(maxBalance);
    if (num > maxBalanceNum) {
      return { 
        isValid: true, 
        warning: 'Amount exceeds available balance',
        sanitizedValue: normalizedInput
      };
    }
  }
  
  // Check for minimum meaningful amount (prevent dust transactions)
  if (num > 0 && num < 0.000001) {
    return { 
      isValid: false, 
      error: 'Amount too small for transaction' 
    };
  }
  
  return { 
    isValid: true, 
    sanitizedValue: normalizedInput 
  };
};

export const sanitizeNumericInput = (input: string): string => {
  // Remove any non-numeric characters except decimal point
  let sanitized = input.replace(/[^0-9.]/g, '');
  
  // Handle multiple decimal points - keep only the first one
  const firstDecimalIndex = sanitized.indexOf('.');
  if (firstDecimalIndex !== -1) {
    const beforeDecimal = sanitized.substring(0, firstDecimalIndex);
    const afterDecimal = sanitized.substring(firstDecimalIndex + 1).replace(/\./g, '');
    sanitized = beforeDecimal + '.' + afterDecimal;
  }
  
  // Handle leading decimal point
  if (sanitized.startsWith('.')) {
    sanitized = '0' + sanitized;
  }
  
  // Remove leading zeros except for decimals
  if (sanitized.length > 1 && sanitized.startsWith('0') && !sanitized.startsWith('0.')) {
    sanitized = sanitized.replace(/^0+/, '');
    if (sanitized === '') sanitized = '0';
  }
  
  return sanitized;
};

export const formatNumberWithCommas = (value: string): string => {
  if (!value || value === '') return '';
  
  const parts = value.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
};

export const formatTokenAmountDisplay = (amount: number, maxDecimals: number = 6): string => {
  if (amount === 0) return '0';
  
  // For very small numbers, use scientific notation threshold
  if (amount > 0 && amount < 0.000001) {
    return amount.toExponential(2);
  }
  
  // Format with max decimals, then remove trailing zeros
  const formatted = amount.toFixed(maxDecimals);
  
  // Remove trailing zeros after decimal point, but keep at least one decimal if there was one
  return formatted.replace(/\.?0+$/, '');
};