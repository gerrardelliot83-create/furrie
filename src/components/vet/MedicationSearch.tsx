'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchMedications, MEDICATIONS, type MedicationOption } from '@/lib/data/medications';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import styles from './MedicationSearch.module.css';

interface PreviousMedication {
  medication_name: string;
  dosage: string | null;
  route: string | null;
  frequency: string | null;
  duration: string | null;
  use_count: number;
}

interface MedicationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onMedicationSelect?: (medication: MedicationOption) => void;
  onIsFromListChange?: (isFromList: boolean) => void;
  placeholder?: string;
  petSpecies?: 'dog' | 'cat';
  diagnosis?: string;
}

export function MedicationSearch({
  value,
  onChange,
  onMedicationSelect,
  onIsFromListChange,
  placeholder = 'Search medications...',
  petSpecies,
  diagnosis,
}: MedicationSearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<MedicationOption[]>([]);
  const [previousMeds, setPreviousMeds] = useState<PreviousMedication[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch previous medications when diagnosis changes
  useEffect(() => {
    if (!diagnosis || !petSpecies) {
      setPreviousMeds([]);
      return;
    }

    const loadPrevious = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('vet_prescribing_patterns')
          .select('medication_name, dosage, route, frequency, duration, use_count')
          .eq('pet_species', petSpecies)
          .eq('diagnosis', diagnosis)
          .order('use_count', { ascending: false })
          .limit(5);

        if (data && data.length > 0) {
          setPreviousMeds(data);
        } else {
          setPreviousMeds([]);
        }
      } catch {
        // Non-critical
      }
    };

    loadPrevious();
  }, [diagnosis, petSpecies]);

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
      const searchResults = searchMedications(query).slice(0, 10);
      setResults(searchResults);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } else {
      setResults([]);
      setIsOpen(query.length === 0 && previousMeds.length > 0);
    }
  }, [previousMeds.length]);

  const handleSelect = useCallback((medication: MedicationOption) => {
    setInputValue(medication.name);
    onChange(medication.name);
    onMedicationSelect?.(medication);
    onIsFromListChange?.(true);
    setIsOpen(false);
    setResults([]);
  }, [onChange, onMedicationSelect, onIsFromListChange]);

  const handleSelectPrevious = useCallback((prev: PreviousMedication) => {
    setInputValue(prev.medication_name);
    onChange(prev.medication_name);
    // Create a synthetic MedicationOption for auto-fill
    onMedicationSelect?.({
      id: prev.medication_name,
      name: prev.medication_name,
      category: '',
      commonDosages: prev.dosage ? [prev.dosage] : [],
      commonRoutes: prev.route ? [prev.route] : [],
      commonFrequencies: prev.frequency ? [prev.frequency] : [],
    });
    onIsFromListChange?.(true);
    setIsOpen(false);
  }, [onChange, onMedicationSelect, onIsFromListChange]);

  const showPrevious = isOpen && inputValue.length < 2 && previousMeds.length > 0;
  const totalItems = showPrevious ? previousMeds.length : results.length;

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
        if (showPrevious && highlightedIndex >= 0 && previousMeds[highlightedIndex]) {
          handleSelectPrevious(previousMeds[highlightedIndex]);
        } else if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        } else if (inputValue.trim()) {
          onChange(inputValue.trim());
          onIsFromListChange?.(false);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, totalItems, showPrevious, results, previousMeds, highlightedIndex, inputValue, handleSelect, handleSelectPrevious, onChange, onIsFromListChange]);

  const handleSubmitNew = useCallback(async (name: string) => {
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'medication',
          name,
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
      // Network error — the medication is still usable as free text
    }

    onChange(name);
    onIsFromListChange?.(false);
    setIsOpen(false);
  }, [onChange, onIsFromListChange, toast]);

  const handleBlur = useCallback(() => {
    if (inputValue.trim() && inputValue !== value) {
      onChange(inputValue.trim());
      onIsFromListChange?.(false);
    }
  }, [inputValue, value, onChange, onIsFromListChange]);

  const handleFocus = useCallback(() => {
    if (inputValue.length >= 2) {
      setIsOpen(true);
    } else if (inputValue.length === 0 && previousMeds.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  }, [inputValue.length, previousMeds.length]);

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

      {showPrevious && (
        <ul className={styles.dropdown}>
          <li className={styles.sectionLabel}>
            Previously prescribed{diagnosis ? ` for ${diagnosis}` : ''}
          </li>
          {previousMeds.map((prev, index) => (
            <li
              key={prev.medication_name}
              className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ''}`}
              onMouseDown={() => handleSelectPrevious(prev)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className={styles.medName}>{prev.medication_name}</span>
              <span className={styles.medCategory}>
                {prev.dosage || ''}{prev.route ? ` ${prev.route}` : ''} ({prev.use_count}x)
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !showPrevious && (results.length > 0 || inputValue.length >= 2) && (
        <ul className={styles.dropdown}>
          {results.map((medication, index) => (
            <li
              key={medication.id}
              className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ''}`}
              onMouseDown={() => handleSelect(medication)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className={styles.medName}>{medication.name}</span>
              <span className={styles.medCategory}>{medication.category}</span>
            </li>
          ))}
          {inputValue.length >= 3 && !MEDICATIONS.some(m => m.name.toLowerCase() === inputValue.toLowerCase()) && (
            <li
              className={styles.submitOption}
              onMouseDown={() => handleSubmitNew(inputValue.trim())}
            >
              Submit &quot;{inputValue.trim()}&quot; as new medication
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
