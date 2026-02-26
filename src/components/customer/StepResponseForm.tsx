'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/customer/FileUpload';
import styles from './StepResponseForm.module.css';

interface UploadedMedia {
  url: string;
  mediaType: 'photo' | 'video' | 'document';
}

interface StepResponseFormProps {
  onSubmit: (responseText: string, mediaUrls: string[], mediaTypes: string[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function StepResponseForm({ onSubmit, onCancel, isSubmitting }: StepResponseFormProps) {
  const [responseText, setResponseText] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);

  const photos = uploadedMedia.filter((m) => m.mediaType === 'photo');
  const videos = uploadedMedia.filter((m) => m.mediaType === 'video');
  const documents = uploadedMedia.filter((m) => m.mediaType === 'document');

  const canSubmit = responseText.trim().length > 0 || uploadedMedia.length > 0;

  const handlePhotoUploadComplete = useCallback((urls: string[]) => {
    setUploadedMedia((prev) => [...prev, ...urls.map((url) => ({ url, mediaType: 'photo' as const }))]);
  }, []);

  const handleVideoUploadComplete = useCallback((urls: string[]) => {
    setUploadedMedia((prev) => [...prev, ...urls.map((url) => ({ url, mediaType: 'video' as const }))]);
  }, []);

  const handleDocumentUploadComplete = useCallback((urls: string[]) => {
    setUploadedMedia((prev) => [...prev, ...urls.map((url) => ({ url, mediaType: 'document' as const }))]);
  }, []);

  const removeMedia = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const mediaUrls = uploadedMedia.map((m) => m.url);
    const mediaTypes = uploadedMedia.map((m) => m.mediaType);
    onSubmit(responseText.trim(), mediaUrls, mediaTypes);
  };

  return (
    <div className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="responseText">
          Your Response
        </label>
        <textarea
          id="responseText"
          className={styles.textarea}
          placeholder="Describe how this step went, any observations, etc."
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={3}
        />
      </div>

      {/* Media preview */}
      {uploadedMedia.length > 0 && (
        <div className={styles.mediaPreview}>
          {uploadedMedia.map((m, i) => (
            <div key={`${m.url}-${i}`} className={styles.mediaPreviewItem}>
              {m.mediaType === 'photo' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.url} alt={`Upload ${i + 1}`} className={styles.mediaThumb} />
              ) : m.mediaType === 'document' ? (
                <div className={styles.mediaDocBadge}>PDF</div>
              ) : (
                <div className={styles.mediaVideoBadge}>Video</div>
              )}
              <button
                type="button"
                className={styles.mediaRemove}
                onClick={() => removeMedia(i)}
                aria-label="Remove"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload sections */}
      <div className={styles.uploadSection}>
        {photos.length < 5 && (
          <FileUpload
            endpoint="consultationImage"
            onUploadComplete={handlePhotoUploadComplete}
            maxFiles={5 - photos.length}
          />
        )}
        {videos.length < 1 && (
          <FileUpload
            endpoint="consultationVideo"
            onUploadComplete={handleVideoUploadComplete}
            maxFiles={1}
          />
        )}
        {documents.length < 3 && (
          <FileUpload
            endpoint="consultationDocument"
            onUploadComplete={handleDocumentUploadComplete}
            maxFiles={3 - documents.length}
          />
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!canSubmit}
        >
          Submit & Complete
        </Button>
      </div>
    </div>
  );
}
