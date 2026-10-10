'use client';

import {
  useRef,
  useState,
  useEffect,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from 'react';
import styles from './OTPInput.module.css';
import { cn } from '@/lib/utils';
import { applyOtpInput } from './otpDigits';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Split value into individual digits
  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length && inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
      setActiveIndex(index);
    }
  };

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    // One typed digit fills this box; a whole code (iOS "From Mail", an
    // Android keyboard suggestion, autofill) fills every box (CX-1). It used
    // to keep only the last character, so those left one digit.
    const result = applyOtpInput({
      digits,
      index,
      rawValue: e.target.value,
      caret: e.target.selectionStart,
      length,
    });
    if (!result) return;

    const newValue = result.digits.join('');
    onChange(newValue);

    if (result.focusIndex !== index) {
      focusInput(result.focusIndex);
    }

    // Submitting is a response to the user finishing their input, so it
    // belongs here rather than in an effect watching `value`. As an effect it
    // re-ran on any dependency identity change, and could fire while the
    // inputs were already disabled mid-submit.
    if (newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();

      if (digits[index]) {
        // Clear current digit
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      } else if (index > 0) {
        // Move to previous and clear
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedDigits = pastedData.replace(/\D/g, '').slice(0, length);

    if (pastedDigits.length > 0) {
      onChange(pastedDigits);
      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedDigits.length, length - 1);
      focusInput(nextIndex);

      if (pastedDigits.length === length) {
        onComplete?.(pastedDigits);
      }
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
    // Select input content on focus
    inputRefs.current[index]?.select();
  };

  return (
    <div className={styles.container}>
      {digits.map((digit, index) => (
        // No maxLength: a whole code offered by the phone can land in any
        // box and is spread across all of them (CX-1).
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={cn(
            styles.input,
            digit && styles.filled,
            activeIndex === index && styles.active,
            error && styles.error,
            disabled && styles.disabled
          )}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
