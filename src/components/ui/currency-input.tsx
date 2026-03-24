'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface CurrencyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, placeholder, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);

    // Format number with commas for display
    const formatWithCommas = (num: number): string => {
      if (num === 0) return '';
      return num.toLocaleString('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    };

    // Parse string to number (remove commas)
    const parseToNumber = (str: string): number => {
      const cleaned = str.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Update display value when external value changes (only when not focused)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatWithCommas(value));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow empty string
      if (inputValue === '') {
        setDisplayValue('');
        onChange(0);
        return;
      }

      // Remove all commas and validate numeric input
      const numericValue = inputValue.replace(/,/g, '');

      // Allow: empty, digits, digits with decimal point
      if (/^\d*\.?\d*$/.test(numericValue)) {
        setDisplayValue(inputValue);
        const parsed = parseToNumber(numericValue);
        onChange(parsed);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show raw value when focused (without commas)
      setDisplayValue(value === 0 ? '' : value.toString());
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Show formatted value when blurred
      setDisplayValue(formatWithCommas(value));
      props.onBlur?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, numbers, decimal point
      if (
        ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key) ||
        (e.key >= '0' && e.key <= '9') ||
        e.key === '.'
      ) {
        return;
      }

      // Block comma key (we add commas automatically on blur)
      if (e.key === ',') {
        e.preventDefault();
        return;
      }

      // Block everything else
      e.preventDefault();
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
