'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { FileUpload } from '@/components/customer/FileUpload';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import styles from './MediaUpload.module.css';

interface MediaItem {
  id: string;
  url: string;
  mediaType: 'photo' | 'video' | 'document';
  fileName: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

interface MediaUploadProps {
  consultationId: string;
  userId: string;
  initialMedia?: MediaItem[];
  maxPhotos?: number;
  maxVideos?: number;
  maxDocuments?: number;
  disabled?: boolean;
}

export function MediaUpload({
  consultationId,
  userId,
  initialMedia = [],
  maxPhotos = 5,
  maxVideos = 1,
  maxDocuments = 3,
  disabled = false,
}: MediaUploadProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'photo' | 'video' | 'document'>('photo');

  const photos = media.filter((m) => m.mediaType === 'photo');
  const videos = media.filter((m) => m.mediaType === 'video');
  const documents = media.filter((m) => m.mediaType === 'document');
  const canUploadPhotos = photos.length < maxPhotos;
  const canUploadVideos = videos.length < maxVideos;
  const canUploadDocuments = documents.length < maxDocuments;

  const saveMediaRecord = useCallback(
    async (url: string, mediaType: 'photo' | 'video' | 'document', fileName?: string, fileSize?: number) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('consultation_media')
        .insert({
          consultation_id: consultationId,
          uploaded_by: userId,
          media_type: mediaType,
          url,
          file_name: fileName || null,
          file_size_bytes: fileSize || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save media record:', error);
        setUploadError('Failed to save upload. Please try again.');
        return null;
      }

      return {
        id: data.id,
        url: data.url,
        mediaType: data.media_type as 'photo' | 'video' | 'document',
        fileName: data.file_name,
        fileSizeBytes: data.file_size_bytes,
        createdAt: data.created_at || new Date().toISOString(),
      };
    },
    [consultationId, userId]
  );

  const handlePhotoUploadComplete = useCallback(
    async (urls: string[]) => {
      setUploadError(null);
      for (const url of urls) {
        const record = await saveMediaRecord(url, 'photo');
        if (record) {
          setMedia((prev) => [...prev, record]);
        }
      }
    },
    [saveMediaRecord]
  );

  const handleVideoUploadComplete = useCallback(
    async (urls: string[]) => {
      setUploadError(null);
      for (const url of urls) {
        const record = await saveMediaRecord(url, 'video');
        if (record) {
          setMedia((prev) => [...prev, record]);
        }
      }
    },
    [saveMediaRecord]
  );

  const handleDocumentUploadComplete = useCallback(
    async (urls: string[]) => {
      setUploadError(null);
      for (const url of urls) {
        const record = await saveMediaRecord(url, 'document');
        if (record) {
          setMedia((prev) => [...prev, record]);
        }
      }
    },
    [saveMediaRecord]
  );

  const handleUploadError = useCallback((err: Error) => {
    setUploadError(err.message);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      const supabase = createClient();
      const { error } = await supabase
        .from('consultation_media')
        .delete()
        .eq('id', id)
        .eq('uploaded_by', userId);

      if (error) {
        console.error('Failed to delete media:', error);
        setUploadError('Failed to delete. Please try again.');
      } else {
        setMedia((prev) => prev.filter((m) => m.id !== id));
      }
      setDeletingId(null);
    },
    [userId]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Photos, Videos & Documents</h3>
        {!disabled && (
          <div className={styles.tabs}>
            <button
              type="button"
              className={activeTab === 'photo' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('photo')}
            >
              Photos ({photos.length}/{maxPhotos})
            </button>
            <button
              type="button"
              className={activeTab === 'video' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('video')}
            >
              Video ({videos.length}/{maxVideos})
            </button>
            <button
              type="button"
              className={activeTab === 'document' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('document')}
            >
              Docs ({documents.length}/{maxDocuments})
            </button>
          </div>
        )}
      </div>

      {/* Existing media gallery */}
      {photos.length > 0 && (
        <div className={styles.gallery}>
          {photos.map((item) => (
            <div key={item.id} className={styles.mediaItem}>
              <Image
                src={item.url}
                alt={item.fileName || 'Consultation photo'}
                width={120}
                height={120}
                className={styles.thumbnail}
              />
              {!disabled && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  aria-label="Remove photo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className={styles.videoList}>
          {videos.map((item) => (
            <div key={item.id} className={styles.videoItem}>
              <video
                src={item.url}
                controls
                preload="metadata"
                className={styles.videoPlayer}
              />
              <div className={styles.videoInfo}>
                <span className={styles.videoName}>{item.fileName || 'Video'}</span>
                {item.fileSizeBytes && (
                  <span className={styles.videoSize}>
                    {(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
              {!disabled && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className={styles.documentList}>
          {documents.map((item) => (
            <div key={item.id} className={styles.documentItem}>
              <div className={styles.documentInfo}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.documentName}>
                  {item.fileName || 'Document'}
                </a>
                {item.fileSizeBytes && (
                  <span className={styles.documentSize}>
                    {(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
              {!disabled && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {!disabled && activeTab === 'photo' && canUploadPhotos && (
        <FileUpload
          endpoint="consultationImage"
          onUploadComplete={handlePhotoUploadComplete}
          onUploadError={handleUploadError}
          maxFiles={maxPhotos - photos.length}
          className={styles.uploader}
        />
      )}

      {!disabled && activeTab === 'video' && canUploadVideos && (
        <FileUpload
          endpoint="consultationVideo"
          onUploadComplete={handleVideoUploadComplete}
          onUploadError={handleUploadError}
          maxFiles={1}
          className={styles.uploader}
        />
      )}

      {!disabled && activeTab === 'document' && canUploadDocuments && (
        <FileUpload
          endpoint="consultationDocument"
          onUploadComplete={handleDocumentUploadComplete}
          onUploadError={handleUploadError}
          maxFiles={maxDocuments - documents.length}
          className={styles.uploader}
        />
      )}

      {!disabled && activeTab === 'photo' && !canUploadPhotos && (
        <p className={styles.limitText}>Maximum {maxPhotos} photos reached.</p>
      )}

      {!disabled && activeTab === 'video' && !canUploadVideos && (
        <p className={styles.limitText}>Maximum {maxVideos} video reached.</p>
      )}

      {!disabled && activeTab === 'document' && !canUploadDocuments && (
        <p className={styles.limitText}>Maximum {maxDocuments} documents reached.</p>
      )}

      {uploadError && (
        <p className={styles.errorText}>{uploadError}</p>
      )}

      {disabled && media.length === 0 && (
        <p className={styles.emptyText}>No media uploaded.</p>
      )}
    </div>
  );
}
