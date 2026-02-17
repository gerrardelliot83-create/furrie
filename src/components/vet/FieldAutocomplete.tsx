'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import styles from './FieldAutocomplete.module.css';

interface FieldAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function FieldAutocomplete({
  value,
  onChange,
  options,
  placeholder = '',
}: FieldAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);

    if (query.length === 0) {
      setFilteredOptions(options);
    } else {
      const lower = query.toLowerCase();
      setFilteredOptions(options.filter((opt) => opt.toLowerCase().includes(lower)));
    }

    setIsOpen(true);
    setHighlightedIndex(-1);
  }, [options]);

  const handleSelect = useCallback((option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    // Show all options on focus
    const query = inputValue;
    if (query.length === 0) {
      setFilteredOptions(options);
    } else {
      const lower = query.toLowerCase();
      setFilteredOptions(options.filter((opt) => opt.toLowerCase().includes(lower)));
    }
    setIsOpen(true);
    setHighlightedIndex(-1);
  }, [inputValue, options]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (inputValue.trim()) {
          onChange(inputValue.trim());
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, filteredOptions, highlightedIndex, inputValue, handleSelect, onChange]);

  const handleBlur = useCallback(() => {
    if (inputValue.trim() && inputValue !== value) {
      onChange(inputValue.trim());
    }
  }, [inputValue, value, onChange]);

  return (
    <div ref={containerRef} className={styles.container}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={styles.input}
        autoComplete="off"
      />

      {isOpen && filteredOptions.length > 0 && (
        <ul className={styles.dropdown}>
          {filteredOptions.map((option, index) => (
            <li
              key={option}
              className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ''}`}
              onMouseDown={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
