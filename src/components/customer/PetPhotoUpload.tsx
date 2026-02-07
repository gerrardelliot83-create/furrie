'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { FileUpload } from './FileUpload';
import { cn } from '@/lib/utils';
import styles from './PetPhotoUpload.module.css';

interface PetPhotoUploadProps {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export function PetPhotoUpload({
  label,
  value,
  onChange,
  maxPhotos = 5,
  error,
  helperText,
  disabled = false,
  className,
}: PetPhotoUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadComplete = useCallback(
    (urls: string[]) => {
      setUploadError(null);
      // Add new photos to existing ones
      const newPhotos = [...value, ...urls].slice(0, maxPhotos);
      onChange(newPhotos);
    },
    [value, onChange, maxPhotos]
  );

  const handleUploadError = useCallback((err: Error) => {
    setUploadError(err.message);
  }, []);

  const handleRemovePhoto = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  const handleSetPrimary = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newPhotos = [...value];
      const [photo] = newPhotos.splice(index, 1);
      newPhotos.unshift(photo);
      onChange(newPhotos);
    },
    [value, onChange]
  );

  const inputId = label?.toLowerCase().replace(/\s+/g, '-') || 'pet-photo';
  const remainingSlots = maxPhotos - value.length;

  return (
    <div className={cn(styles.wrapper, className)}>
      {label && (
        <label className={styles.label}>{label}</label>
      )}

      {value.length > 0 && (
        <div className={styles.previewGrid}>
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={cn(styles.previewItem, index === 0 && styles.primary)}
            >
              <Image
                src={url}
                alt={`Pet photo ${index + 1}`}
                width={120}
                height={120}
                className={styles.previewImage}
              />
              {index === 0 && (
                <span className={styles.primaryBadge}>Primary</span>
              )}
              <div className={styles.previewActions}>
                {index !== 0 && !disabled && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => handleSetPrimary(index)}
                    aria-label="Set as primary photo"
                    title="Set as primary"
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
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )}
                {!disabled && (
                  <button
                    type="button"
                    className={cn(styles.actionButton, styles.removeButton)}
                    onClick={() => handleRemovePhoto(index)}
                    aria-label="Remove photo"
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
              </div>
            </div>
          ))}
        </div>
      )}

      {remainingSlots > 0 && !disabled && (
        <FileUpload
          endpoint={value.length === 0 ? 'petPhoto' : 'petGallery'}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          maxFiles={remainingSlots}
          className={styles.uploader}
        />
      )}

      {(error || uploadError) && (
        <span id={`${inputId}-error`} className={styles.errorText} role="alert">
          {error || uploadError}
        </span>
      )}
      {helperText && !error && !uploadError && (
        <span id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  );
}
