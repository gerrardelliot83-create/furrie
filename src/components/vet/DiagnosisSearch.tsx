'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchDiagnoses, type DiagnosisOption } from '@/lib/data/diagnoses';
import styles from './DiagnosisSearch.module.css';

interface DiagnosisSearchProps {
  value: string;
  onChange: (value: string) => void;
  species: 'dog' | 'cat';
  placeholder?: string;
}

export function DiagnosisSearch({
  value,
  onChange,
  species,
  placeholder = 'Search diagnoses...',
}: DiagnosisSearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<DiagnosisOption[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    if (query.length >= 2) {
      const searchResults = searchDiagnoses(query, species).slice(0, 10);
      setResults(searchResults);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [species]);

  const handleSelect = useCallback((diagnosis: DiagnosisOption) => {
    setInputValue(diagnosis.name);
    onChange(diagnosis.name);
    setIsOpen(false);
    setResults([]);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        } else if (inputValue.trim()) {
          // Allow custom text entry
          onChange(inputValue.trim());
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, results, highlightedIndex, inputValue, handleSelect, onChange]);

  const handleBlur = useCallback(() => {
    // Allow custom entry on blur
    if (inputValue.trim() && inputValue !== value) {
      onChange(inputValue.trim());
    }
  }, [inputValue, value, onChange]);

  return (
    <div ref={containerRef} className={styles.container}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={styles.input}
        autoComplete="off"
      />

      {isOpen && results.length > 0 && (
        <ul className={styles.dropdown}>
          {results.map((diagnosis, index) => (
            <li
              key={diagnosis.id}
              className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ''}`}
              onMouseDown={() => handleSelect(diagnosis)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className={styles.diagnosisName}>{diagnosis.name}</span>
              <span className={styles.diagnosisCategory}>{diagnosis.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
