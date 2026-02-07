'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchMedications, COMMON_DURATIONS, type MedicationOption } from '@/lib/data/medications';
import type { PrescribedMedication } from '@/types';
import styles from './MedicationEntry.module.css';

interface MedicationEntryProps {
  medication: PrescribedMedication;
  onChange: (medication: PrescribedMedication) => void;
  onRemove: () => void;
}

export function MedicationEntry({ medication, onChange, onRemove }: MedicationEntryProps) {
  const [searchQuery, setSearchQuery] = useState(medication.name);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<MedicationOption[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedicationOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Controlled component sync pattern
    setSearchQuery(medication.name);
  }, [medication.name]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onChange({ ...medication, name: query });

    if (query.length >= 2) {
      const results = searchMedications(query).slice(0, 8);
      setSearchResults(results);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [medication, onChange]);

  const handleSelectMedication = useCallback((med: MedicationOption) => {
    setSearchQuery(med.name);
    setSelectedMed(med);
    onChange({
      ...medication,
      name: med.name,
      dosage: med.commonDosages[0] || '',
      route: med.commonRoutes[0] || '',
      frequency: med.commonFrequencies[0] || '',
    });
    setIsSearchOpen(false);
  }, [medication, onChange]);

  const handleFieldChange = useCallback((field: keyof PrescribedMedication, value: string) => {
    onChange({ ...medication, [field]: value });
  }, [medication, onChange]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Medication</span>
        <button type="button" className={styles.removeButton} onClick={onRemove}>
          Remove
        </button>
      </div>

      <div className={styles.grid}>
        {/* Medication Name Search */}
        <div className={styles.fullWidth} ref={containerRef}>
          <label className={styles.label}>Medication Name</label>
          <div className={styles.searchContainer}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setIsSearchOpen(true)}
              placeholder="Search medication..."
              className={styles.input}
              autoComplete="off"
            />
            {isSearchOpen && searchResults.length > 0 && (
              <ul className={styles.dropdown}>
                {searchResults.map((med) => (
                  <li
                    key={med.id}
                    className={styles.option}
                    onMouseDown={() => handleSelectMedication(med)}
                  >
                    <span className={styles.medName}>{med.name}</span>
                    <span className={styles.medCategory}>{med.category}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Dosage */}
        <div className={styles.field}>
          <label className={styles.label}>Dosage</label>
          {selectedMed && selectedMed.commonDosages.length > 0 ? (
            <select
              value={medication.dosage}
              onChange={(e) => handleFieldChange('dosage', e.target.value)}
              className={styles.select}
            >
              <option value="">Select dosage...</option>
              {selectedMed.commonDosages.map((dosage) => (
                <option key={dosage} value={dosage}>{dosage}</option>
              ))}
              <option value="custom">Custom...</option>
            </select>
          ) : (
            <input
              type="text"
              value={medication.dosage}
              onChange={(e) => handleFieldChange('dosage', e.target.value)}
              placeholder="e.g., 10 mg/kg"
              className={styles.input}
            />
          )}
        </div>

        {/* Route */}
        <div className={styles.field}>
          <label className={styles.label}>Route</label>
          {selectedMed && selectedMed.commonRoutes.length > 0 ? (
            <select
              value={medication.route}
              onChange={(e) => handleFieldChange('route', e.target.value)}
              className={styles.select}
            >
              <option value="">Select route...</option>
              {selectedMed.commonRoutes.map((route) => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={medication.route}
              onChange={(e) => handleFieldChange('route', e.target.value)}
              placeholder="e.g., Oral"
              className={styles.input}
            />
          )}
        </div>

        {/* Frequency */}
        <div className={styles.field}>
          <label className={styles.label}>Frequency</label>
          {selectedMed && selectedMed.commonFrequencies.length > 0 ? (
            <select
              value={medication.frequency}
              onChange={(e) => handleFieldChange('frequency', e.target.value)}
              className={styles.select}
            >
              <option value="">Select frequency...</option>
              {selectedMed.commonFrequencies.map((freq) => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={medication.frequency}
              onChange={(e) => handleFieldChange('frequency', e.target.value)}
              placeholder="e.g., BID"
              className={styles.input}
            />
          )}
        </div>

        {/* Duration */}
        <div className={styles.field}>
          <label className={styles.label}>Duration</label>
          <select
            value={medication.duration}
            onChange={(e) => handleFieldChange('duration', e.target.value)}
            className={styles.select}
          >
            <option value="">Select duration...</option>
            {COMMON_DURATIONS.map((duration) => (
              <option key={duration} value={duration}>{duration}</option>
            ))}
          </select>
        </div>

        {/* Special Instructions */}
        <div className={styles.fullWidth}>
          <label className={styles.label}>Special Instructions</label>
          <textarea
            value={medication.instructions}
            onChange={(e) => handleFieldChange('instructions', e.target.value)}
            placeholder="e.g., Give with food, avoid dairy..."
            className={styles.textarea}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
