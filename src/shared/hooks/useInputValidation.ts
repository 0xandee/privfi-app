import { useState, useCallback, useMemo } from 'react';
import { validateTokenInput, sanitizeNumericInput, ValidationResult } from '@/shared/utils/lib/inputValidation';
import { Token } from '@/constants/tokens';

export interface InputValidationState {
  value: string;
  error: string | null;
  isValid: boolean;
  isTouched: boolean;
}

export const useInputValidation = (
  initialValue: string = '',
  token?: Token,
  maxBalance?: string
) => {
  const [state, setState] = useState<InputValidationState>({
    value: initialValue,
    error: null,
    isValid: true,
    isTouched: false
  });

  const validate = useCallback((input: string): ValidationResult => {
    const maxDecimals = token?.decimals || 18;
    return validateTokenInput(input, maxDecimals, maxBalance);
  }, [token?.decimals, maxBalance]);

  const handleChange = useCallback((rawInput: string) => {
    // Always sanitize the input first
    const sanitizedInput = sanitizeNumericInput(rawInput);

    // Validate the sanitized input
    const validation = validate(sanitizedInput);

    setState(prev => ({
      value: validation.sanitizedValue || sanitizedInput,
      error: validation.error || null,
      isValid: validation.isValid,
      isTouched: true
    }));
  }, [validate]);

  const handleBlur = useCallback(() => {
    setState(prev => ({ ...prev, isTouched: true }));
  }, []);

  const reset = useCallback(() => {
    setState({
      value: '',
      error: null,
      isValid: true,
      isTouched: false
    });
  }, []);

  const setValue = useCallback((value: string) => {
    const validation = validate(value);
    setState({
      value: validation.sanitizedValue || value,
      error: validation.error || null,
      isValid: validation.isValid,
      isTouched: false // Don't show error immediately when programmatically set
    });
  }, [validate]);

  // Show error only if the input has been touched and is invalid
  const displayError = useMemo(() =>
    state.isTouched && !state.isValid ? state.error : null
    , [state.isTouched, state.isValid, state.error]);

  // Check if amount exceeds balance specifically
  const exceedsBalance = useMemo(() => {
    if (!maxBalance || !state.value) return false;
    const inputNum = parseFloat(state.value);
    const balanceNum = parseFloat(maxBalance);
    return inputNum > balanceNum;
  }, [state.value, maxBalance]);

  return {
    ...state,
    displayError,
    exceedsBalance,
    handleChange,
    handleBlur,
    reset,
    setValue
  };
};