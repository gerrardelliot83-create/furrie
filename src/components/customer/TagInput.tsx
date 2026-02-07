'use client';

import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import styles from './TagInput.module.css';

interface TagInputProps {
  label?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export function TagInput({
  label,
  value,
  onChange,
  placeholder = 'Type and press Enter...',
  maxTags = 10,
  error,
  helperText,
  disabled = false,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim();
      if (!trimmedTag) return;

      // Check for duplicates (case-insensitive)
      const isDuplicate = value.some(
        (existing) => existing.toLowerCase() === trimmedTag.toLowerCase()
      );
      if (isDuplicate) return;

      // Check max tags limit
      if (value.length >= maxTags) return;

      onChange([...value, trimmedTag]);
      setInputValue('');
    },
    [value, onChange, maxTags]
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        // Remove last tag when backspace is pressed on empty input
        removeTag(value.length - 1);
      } else if (e.key === ',') {
        e.preventDefault();
        addTag(inputValue);
      }
    },
    [inputValue, value.length, addTag, removeTag]
  );

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Check for comma-separated values
    if (newValue.includes(',')) {
      const tags = newValue.split(',');
      tags.forEach((tag, index) => {
        if (index < tags.length - 1) {
          addTag(tag);
        } else {
          setInputValue(tag);
        }
      });
    } else {
      setInputValue(newValue);
    }
  }, [addTag]);

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  }, [inputValue, addTag]);

  const inputId = label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn(styles.wrapper, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div
        className={cn(
          styles.container,
          error && styles.error,
          disabled && styles.disabled
        )}
      >
        <div className={styles.tagsWrapper}>
          {value.map((tag, index) => (
            <span key={`${tag}-${index}`} className={styles.tag}>
              <span className={styles.tagText}>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeTag(index)}
                  aria-label={`Remove ${tag}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {value.length < maxTags && !disabled && (
            <input
              id={inputId}
              type="text"
              className={styles.input}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={value.length === 0 ? placeholder : 'Add more...'}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? `${inputId}-error`
                  : helperText
                    ? `${inputId}-helper`
                    : undefined
              }
            />
          )}
        </div>
      </div>
      {error && (
        <span id={`${inputId}-error`} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  );
}
