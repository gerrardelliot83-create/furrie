'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchDiagnoses, DIAGNOSES, type DiagnosisOption } from '@/lib/data/diagnoses';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import styles from './DiagnosisSearch.module.css';

interface FrequentDiagnosis {
  diagnosis: string;
  use_count: number;
}

interface DiagnosisSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelectFromList?: (isFromList: boolean) => void;
  species: 'dog' | 'cat';
  placeholder?: string;
}

export function DiagnosisSearch({
  value,
  onChange,
  onSelectFromList,
  species,
  placeholder = 'Search diagnoses...',
}: DiagnosisSearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<DiagnosisOption[]>([]);
  const [frequentDiagnoses, setFrequentDiagnoses] = useState<FrequentDiagnosis[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const frequentLoadedRef = useRef(false);
  const { toast } = useToast();

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Load frequent diagnoses on mount
  useEffect(() => {
    if (frequentLoadedRef.current) return;
    frequentLoadedRef.current = true;

    const loadFrequent = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('vet_prescribing_patterns')
          .select('diagnosis, use_count')
          .eq('pet_species', species)
          .order('use_count', { ascending: false })
          .limit(5);

        if (data && data.length > 0) {
          // Deduplicate by diagnosis name
          const seen = new Set<string>();
          const unique: FrequentDiagnosis[] = [];
          for (const row of data) {
            if (!seen.has(row.diagnosis)) {
              seen.add(row.diagnosis);
              unique.push(row);
            }
          }
          setFrequentDiagnoses(unique);
        }
      } catch {
        // Non-critical — frequent diagnoses just won't show
      }
    };

    loadFrequent();
  }, [species]);

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
      setIsOpen(query.length === 0 && frequentDiagnoses.length > 0);
    }
  }, [species, frequentDiagnoses.length]);

  const handleSelect = useCallback((diagnosis: DiagnosisOption) => {
    setInputValue(diagnosis.name);
    onChange(diagnosis.name);
    onSelectFromList?.(true);
    setIsOpen(false);
    setResults([]);
  }, [onChange, onSelectFromList]);

  const handleSelectFrequent = useCallback((name: string) => {
    setInputValue(name);
    onChange(name);
    onSelectFromList?.(true);
    setIsOpen(false);
  }, [onChange, onSelectFromList]);

  const showFrequent = isOpen && inputValue.length < 2 && frequentDiagnoses.length > 0;
  const totalItems = showFrequent ? frequentDiagnoses.length : results.length;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (showFrequent && highlightedIndex >= 0 && frequentDiagnoses[highlightedIndex]) {
          handleSelectFrequent(frequentDiagnoses[highlightedIndex].diagnosis);
        } else if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        } else if (inputValue.trim()) {
          onChange(inputValue.trim());
          onSelectFromList?.(false);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, totalItems, showFrequent, results, frequentDiagnoses, highlightedIndex, inputValue, handleSelect, handleSelectFrequent, onChange, onSelectFromList]);

  const handleSubmitNew = useCallback(async (name: string) => {
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'diagnosis',
          name,
          species,
        }),
      });

      if (response.status === 409) {
        toast('Already submitted for review', 'info');
      } else if (response.ok) {
        toast('Submitted for review', 'success');
      } else {
        toast('Submission failed', 'error');
      }
    } catch {
      // Network error — the diagnosis is still usable as free text
    }

    onChange(name);
    onSelectFromList?.(false);
    setIsOpen(false);
  }, [onChange, onSelectFromList, species, toast]);

  const handleBlur = useCallback(() => {
    if (inputValue.trim() && inputValue !== value) {
      onChange(inputValue.trim());
      onSelectFromList?.(false);
    }
  }, [inputValue, value, onChange, onSelectFromList]);

  const handleFocus = useCallback(() => {
    if (inputValue.length >= 2) {
      setIsOpen(true);
    } else if (inputValue.length === 0 && frequentDiagnoses.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  }, [inputValue.length, frequentDiagnoses.length]);

  return (
    <div ref={containerRef} className={styles.container}>
      <input
        ref={inputRef}
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

      {showFrequent && (
        <ul className={styles.dropdown}>
          <li className={styles.sectionLabel}>Your frequent diagnoses</li>
          {frequentDiagnoses.map((freq, index) => (
            <li
              key={freq.diagnosis}
              className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ''}`}
              onMouseDown={() => handleSelectFrequent(freq.diagnosis)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className={styles.diagnosisName}>{freq.diagnosis}</span>
              <span className={styles.diagnosisCategory}>{freq.use_count}x</span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !showFrequent && (results.length > 0 || inputValue.length >= 2) && (
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
          {inputValue.length >= 3 && !DIAGNOSES.some(d => d.name.toLowerCase() === inputValue.toLowerCase()) && (
            <li
              className={styles.submitOption}
              onMouseDown={() => handleSubmitNew(inputValue.trim())}
            >
              Submit &quot;{inputValue.trim()}&quot; as new diagnosis
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
