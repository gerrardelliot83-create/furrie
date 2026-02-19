'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import type { Breed } from '@/lib/data/breeds';
import { cn } from '@/lib/utils';
import styles from './BreedSelect.module.css';

interface BreedSelectProps {
  label?: string;
  value: string;
  onChange: (breed: string) => void;
  species: 'dog' | 'cat';
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

interface GroupedBreeds {
  indianNative: Breed[];
  foundInIndia: Breed[];
  rare: Breed[];
  other: Breed[];
}

function groupBreeds(breeds: Breed[]): GroupedBreeds {
  const grouped: GroupedBreeds = {
    indianNative: [],
    foundInIndia: [],
    rare: [],
    other: [],
  };

  breeds.forEach((breed) => {
    if (breed.indianNative) {
      grouped.indianNative.push(breed);
    } else if (breed.foundInIndia === 'Yes') {
      grouped.foundInIndia.push(breed);
    } else if (breed.foundInIndia === 'Rare') {
      grouped.rare.push(breed);
    } else {
      grouped.other.push(breed);
    }
  });

  return grouped;
}

export function BreedSelect({
  label,
  value,
  onChange,
  species,
  placeholder = 'Search for a breed...',
  error,
  helperText,
  disabled = false,
  className,
}: BreedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [breedModule, setBreedModule] = useState<{
    getBreedsBySpecies: typeof import('@/lib/data/breeds').getBreedsBySpecies;
    searchBreeds: typeof import('@/lib/data/breeds').searchBreeds;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Lazy-load breed data only when dropdown opens for the first time
  useEffect(() => {
    if (isOpen && !breedModule) {
      import('@/lib/data/breeds').then((mod) => {
        setBreedModule({ getBreedsBySpecies: mod.getBreedsBySpecies, searchBreeds: mod.searchBreeds });
      });
    }
  }, [isOpen, breedModule]);

  // Get breeds based on species and search, memoized to prevent unnecessary recalculations
  const { groupedBreeds, flattenedBreeds } = useMemo(() => {
    if (!breedModule) {
      const empty: GroupedBreeds = { indianNative: [], foundInIndia: [], rare: [], other: [] };
      return { groupedBreeds: empty, flattenedBreeds: [] as Breed[] };
    }

    const allBreeds = breedModule.getBreedsBySpecies(species);
    const filtered = searchQuery
      ? breedModule.searchBreeds(searchQuery, species)
      : allBreeds;
    const grouped = groupBreeds(filtered);

    // Flatten for keyboard navigation
    const flattened = [
      ...grouped.indianNative,
      ...grouped.foundInIndia,
      ...grouped.rare,
      ...grouped.other,
    ];

    return { groupedBreeds: grouped, flattenedBreeds: flattened };
  }, [species, searchQuery, breedModule]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-breed-item]');
      const focusedItem = items[focusedIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setFocusedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  }, [isOpen]);

  const handleSelectBreed = useCallback(
    (breed: Breed) => {
      onChange(breed.name);
      setSearchQuery('');
      setIsOpen(false);
      setFocusedIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < flattenedBreeds.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : flattenedBreeds.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && flattenedBreeds[focusedIndex]) {
            handleSelectBreed(flattenedBreeds[focusedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          setFocusedIndex(-1);
          break;
      }
    },
    [isOpen, flattenedBreeds, focusedIndex, handleSelectBreed]
  );

  const handleInputFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  const handleClear = useCallback(() => {
    onChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  }, [onChange]);

  const inputId = label?.toLowerCase().replace(/\s+/g, '-') || 'breed-select';

  const renderBreedGroup = (
    breeds: Breed[],
    groupLabel: string,
    startIndex: number
  ) => {
    if (breeds.length === 0) return null;

    return (
      <>
        <li className={styles.groupLabel}>{groupLabel}</li>
        {breeds.map((breed, idx) => {
          const globalIndex = startIndex + idx;
          return (
            <li
              key={breed.name}
              data-breed-item
              className={cn(
                styles.option,
                focusedIndex === globalIndex && styles.focused
              )}
              onClick={() => handleSelectBreed(breed)}
              role="option"
              aria-selected={value === breed.name}
            >
              <span className={styles.breedName}>{breed.name}</span>
              <span className={styles.breedLifespan}>{breed.lifespan} years</span>
            </li>
          );
        })}
      </>
    );
  };

  let currentIndex = 0;

  return (
    <div ref={containerRef} className={cn(styles.wrapper, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div
        className={cn(
          styles.container,
          isOpen && styles.open,
          error && styles.error,
          disabled && styles.disabled
        )}
      >
        <div className={styles.inputWrapper}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            className={styles.input}
            value={isOpen ? searchQuery : value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={value || placeholder}
            disabled={disabled}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${inputId}-listbox`}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
          />
          {value && !disabled && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              aria-label="Clear selection"
            >
              <svg
                width="16"
                height="16"
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
          <svg
            className={cn(styles.chevron, isOpen && styles.chevronOpen)}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        {isOpen && (
          <ul
            ref={listRef}
            id={`${inputId}-listbox`}
            className={styles.dropdown}
            role="listbox"
            aria-label="Breeds"
          >
            {flattenedBreeds.length === 0 ? (
              <li className={styles.noResults}>No breeds found</li>
            ) : (
              <>
                {renderBreedGroup(
                  groupedBreeds.indianNative,
                  'Indian Native',
                  currentIndex
                )}
                {(() => {
                  currentIndex += groupedBreeds.indianNative.length;
                  return null;
                })()}
                {renderBreedGroup(
                  groupedBreeds.foundInIndia,
                  'Found in India',
                  currentIndex
                )}
                {(() => {
                  currentIndex += groupedBreeds.foundInIndia.length;
                  return null;
                })()}
                {renderBreedGroup(groupedBreeds.rare, 'Rare', currentIndex)}
                {(() => {
                  currentIndex += groupedBreeds.rare.length;
                  return null;
                })()}
                {renderBreedGroup(
                  groupedBreeds.other,
                  'Other Breeds',
                  currentIndex
                )}
              </>
            )}
          </ul>
        )}
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
